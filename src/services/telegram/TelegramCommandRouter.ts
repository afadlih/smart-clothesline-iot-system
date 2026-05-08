import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { logger } from "@/lib/logger";
import { TelegramBotApiService } from "@/services/TelegramBotApiService";
import {
  TelegramOpsService,
} from "@/services/TelegramOpsService";
import {
  authorizeTelegramActor,
  normalizeCommand,
} from "@/services/telegram/telegram.security";
import { TelegramAuditService } from "@/services/telegram/TelegramAuditService";
import { getTelegramPollingDiagnostics } from "@/lib/telegramSingleton";
import { formatClock } from "@/utils/timeFormat";
import { executeTelegramCommand, buildCommandReplyMessage, type ExecutorCommand } from "@/services/telegram/TelegramCommandExecutor";

export type TelegramInboundContext = {
  text?: string;
  chatId?: number;
  chatType?: "private" | "group" | "supergroup";
  chatTitle?: string;
  userId?: number;
  username?: string;
};

type HandleResult = {
  ok: boolean;
  blocked?: boolean;
  queued?: boolean;
  accepted?: boolean;
  dispatched?: boolean;
  delayed?: boolean;
  failed?: boolean;
  commandId?: string;
  detail: string;
};

const OPERATOR_COMMANDS = new Set(["/open", "/close", "/mode_auto", "/mode_manual"]);

function fmtTime(epochMs: number): string {
  return formatClock(epochMs);
}

async function getLatestTelemetry() {
  try {
    const q = query(collection(db, "sensor_data"), orderBy("createdAt", "desc"), limit(1));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    const data = snapshot.docs[0].data() as Record<string, unknown>;
    const timestamp =
      typeof data.timestamp === "number" ? data.timestamp : typeof data.createdAt === "number" ? data.createdAt : Date.now();
    return {
      temperature: typeof data.temperature === "number" ? data.temperature : null,
      humidity: typeof data.humidity === "number" ? data.humidity : null,
      light: typeof data.light === "number" ? data.light : null,
      rain: Boolean(data.rain),
      status: typeof data.status === "string" ? data.status : "UNKNOWN",
      timestamp,
    };
  } catch (error) {
    logger.warn("firestore", "Telemetry query failed", error);
    return null;
  }
}

function toStatusMessage(input: {
  command: string;
  telemetry: Awaited<ReturnType<typeof getLatestTelemetry>>;
  mqtt: ReturnType<typeof getTelegramPollingDiagnostics>;
}): string {
  const telemetryAgeSec =
    input.telemetry?.timestamp ? Math.max(0, Math.floor((Date.now() - input.telemetry.timestamp) / 1000)) : null;
  return [
    "SMART CLOTHESLINE STATUS",
    "",
    `Device: ${input.telemetry?.status ?? "UNKNOWN"}`,
    `MQTT Polling: ${input.mqtt.status.toUpperCase()}`,
    `Temperature: ${typeof input.telemetry?.temperature === "number" ? `${input.telemetry.temperature.toFixed(1)} C` : "-"}`,
    `Humidity: ${typeof input.telemetry?.humidity === "number" ? `${input.telemetry.humidity.toFixed(1)} %` : "-"}`,
    `Light: ${typeof input.telemetry?.light === "number" ? Math.round(input.telemetry.light) : "-"}`,
    `Rain: ${input.telemetry?.rain ? "DETECTED" : "CLEAR"}`,
    `Telemetry Delay: ${telemetryAgeSec === null ? "-" : `${telemetryAgeSec} sec`}`,
    `Updated At: ${input.telemetry?.timestamp ? fmtTime(input.telemetry.timestamp) : "-"}`,
    `Command: ${input.command}`,
  ].join("\n");
}

/**
 * Resolve the bot token to use for sending replies.
 *
 * Priority:
 *   1. TELEGRAM_BOT_TOKEN env var (server-only, always available on Vercel)
 *   2. Firestore telegram_config.botToken (fallback, usually blocked by rules)
 *
 * Never exposes token to the client.
 */
async function resolveBotToken(): Promise<string | null> {
  const envToken = process.env.TELEGRAM_BOT_TOKEN;
  if (envToken) return envToken;

  // Graceful fallback to Firestore (will be null in production due to rules)
  try {
    const config = await TelegramOpsService.getConfig();
    return config?.botToken || null;
  } catch {
    return null;
  }
}

/**
 * Resolve whether group mode is enabled.
 * Env var takes precedence; Firestore config is a supplement.
 */
async function resolveGroupModeEnabled(): Promise<boolean> {
  if (process.env.TELEGRAM_ENABLE_GROUP_MODE?.toLowerCase() === "true") return true;
  try {
    const config = await TelegramOpsService.getConfig();
    return Boolean(config?.groupModeEnabled);
  } catch {
    return false;
  }
}

/**
 * Resolve authorized group IDs from env (primary) + Firestore (supplement).
 * Env format: TELEGRAM_ALLOWED_GROUPS=-1001234567,-1009876543
 */
async function resolveAuthorizedGroups(): Promise<Set<number>> {
  const groups = new Set<number>();

  // Primary: env var (supports negative IDs for groups/supergroups)
  const envGroups = process.env.TELEGRAM_ALLOWED_GROUPS ?? "";
  for (const raw of envGroups.split(",")) {
    const id = Number(raw.trim());
    if (Number.isInteger(id) && id !== 0) groups.add(id);
  }

  // Supplement: Firestore (may be empty/blocked)
  try {
    const config = await TelegramOpsService.getConfig();
    for (const g of config?.authorizedGroups ?? []) {
      if (typeof g.groupId === "number" && Number.isInteger(g.groupId)) {
        groups.add(g.groupId);
      }
    }
  } catch {
    // Firestore unavailable — env-only is fine
  }

  return groups;
}

export class TelegramCommandRouter {
  static async handle(context: TelegramInboundContext): Promise<HandleResult> {
    // ── Resolve bot token from env first ──────────────────────────────────────
    const botToken = await resolveBotToken();
    if (!botToken) {
      logger.warn("telegram", "No bot token available — integration not configured");
      return { ok: true, detail: "Telegram not configured" };
    }

    // ── Validate minimal context ──────────────────────────────────────────────
    const command = normalizeCommand(context.text);
    if (!command || !context.chatId || !context.userId) {
      return { ok: true, detail: "Ignored invalid message" };
    }

    const isGroupChat = context.chatType === "group" || context.chatType === "supergroup";

    // ── Group mode check ──────────────────────────────────────────────────────
    if (isGroupChat) {
      const groupModeEnabled = await resolveGroupModeEnabled();
      if (!groupModeEnabled) {
        await TelegramBotApiService.sendMessage(botToken, context.chatId, "Group mode is disabled.");
        return { ok: true, blocked: true, detail: "Group mode disabled" };
      }

      // Allow /register_group to bypass the registered-group check
      if (command !== "/register_group") {
        const authorizedGroups = await resolveAuthorizedGroups();
        if (!authorizedGroups.has(context.chatId)) {
          await TelegramBotApiService.sendMessage(
            botToken,
            context.chatId,
            "Group not registered. Run /register_group first.",
          );
          return { ok: true, blocked: true, detail: "Group not registered" };
        }
      }
    }

    // ── Authorization ─────────────────────────────────────────────────────────
    const auth = await authorizeTelegramActor({
      userId: context.userId,
      command,
      chatId: context.chatId,
      chatType: context.chatType,
    });

    if (!auth.authorized) {
      const denied = auth.reason === "insufficient_role"
        ? "Permission denied for this command."
        : "Unauthorized user. Access denied.";
      await TelegramBotApiService.sendMessage(botToken, context.chatId, denied);
      await TelegramAuditService.log({
        userId: context.userId,
        username: context.username,
        command,
        result: "blocked",
        detail: auth.reason,
        source: "telegram-webhook",
      });
      return { ok: true, blocked: true, detail: auth.reason };
    }

    // ── Command handling ──────────────────────────────────────────────────────
    try {
      const telemetry = await getLatestTelemetry();
      const polling = getTelegramPollingDiagnostics();

      if (command === "/start") {
        await TelegramBotApiService.sendMessage(botToken, context.chatId, "Smart Clothesline Bot Connected");
      } else if (command === "/help") {
        await TelegramBotApiService.sendMessage(
          botToken,
          context.chatId,
          [
            "Available commands:",
            "/start /help /status /latest /health /analytics",
            "/open /close /mode_auto /mode_manual",
            "/ping /uptime /register_group /restart",
          ].join("\n"),
        );
      } else if (command === "/status" || command === "/latest" || command === "/health" || command === "/analytics") {
        await TelegramBotApiService.sendMessage(
          botToken,
          context.chatId,
          toStatusMessage({ command, telemetry, mqtt: polling }),
        );
      } else if (command === "/ping") {
        await TelegramBotApiService.sendMessage(botToken, context.chatId, `PONG ${fmtTime(Date.now())}`);
      } else if (command === "/uptime") {
        await TelegramBotApiService.sendMessage(
          botToken,
          context.chatId,
          [
            "SMART CLOTHESLINE UPTIME",
            "",
            `Polling: ${polling.status.toUpperCase()}`,
            `Uptime: ${Math.floor((polling.uptimeMs ?? 0) / 1000)}s`,
            `Last Update: ${polling.lastUpdateAt ? fmtTime(polling.lastUpdateAt) : "-"}`,
          ].join("\n"),
        );
      } else if (command === "/register_group") {
        if (!isGroupChat || !context.chatType || (context.chatType !== "group" && context.chatType !== "supergroup")) {
          await TelegramBotApiService.sendMessage(botToken, context.chatId, "This command only works in group/supergroup.");
        } else {
          // Determine authorization state: is this group already in env or Firestore?
          const authorizedGroups = await resolveAuthorizedGroups();
          const alreadyRegistered = authorizedGroups.has(context.chatId);

          // Log the registration attempt to telegram_audit (always writable per firestore.rules)
          await TelegramAuditService.log({
            userId: context.userId,
            username: context.username,
            command,
            result: "success",
            detail: `register_group chatId=${context.chatId} type=${context.chatType} title=${context.chatTitle ?? "-"} alreadyKnown=${alreadyRegistered}`,
            source: "telegram-webhook",
          });

          const authState = alreadyRegistered ? "AUTHORIZED" : "PENDING (add to TELEGRAM_ALLOWED_GROUPS env)";
          await TelegramBotApiService.sendMessage(
            botToken,
            context.chatId,
            [
              "GROUP REGISTRATION",
              `Group ID: ${context.chatId}`,
              `Group Type: ${context.chatType}`,
              `Title: ${context.chatTitle ?? "-"}`,
              `Authorization: ${authState}`,
              `MQTT Polling: ${polling.status.toUpperCase()}`,
              `Timestamp: ${fmtTime(Date.now())}`,
            ].join("\n"),
          );

          // Return early — audit already logged above
          return { ok: true, detail: "register_group handled" };
        }
      } else if (OPERATOR_COMMANDS.has(command)) {
        const execResult = await executeTelegramCommand({
          command: command as ExecutorCommand,
          chatId: context.chatId,
          userId: context.userId,
          username: context.username,
        });

        const replyText = buildCommandReplyMessage(command as ExecutorCommand, execResult, Date.now());
        await TelegramBotApiService.sendMessage(botToken, context.chatId, replyText);

        const auditResult: "success" | "failed" | "pending" =
          execResult.result === "failed" ? "failed" :
          execResult.result === "delayed" ? "pending" :
          "success";

        await TelegramAuditService.log({
          userId: context.userId,
          username: context.username,
          command,
          result: auditResult,
          detail: `[${execResult.result.toUpperCase()}] ${
            "commandId" in execResult && execResult.commandId
              ? `ref=${execResult.commandId} `
              : ""
          }${execResult.detail}`,
          source: "telegram-webhook",
        });

        return {
          ok: execResult.result !== "failed",
          queued: execResult.result === "queued",
          detail: execResult.detail,
        };
      } else if (command === "/restart") {
        await TelegramBotApiService.sendMessage(botToken, context.chatId, "Restart command acknowledged by admin.");
      } else {
        await TelegramBotApiService.sendMessage(botToken, context.chatId, "Unknown command. Use /help.");
      }

      await TelegramAuditService.log({
        userId: context.userId,
        username: context.username,
        command,
        result: "success",
        detail: "Response sent",
        source: "telegram-webhook",
      });
      return { ok: true, detail: "Handled successfully" };
    } catch (error) {
      logger.error("telegram", "Command handler failed", error);
      // Always reply on failure
      try {
        await TelegramBotApiService.sendMessage(botToken, context.chatId, "Command failed. Please try again.");
      } catch {
        // Ignore secondary failure
      }
      await TelegramAuditService.log({
        userId: context.userId,
        username: context.username,
        command,
        result: "failed",
        detail: String(error),
        source: "telegram-webhook",
      }).catch(() => {/* ignore */});
      return { ok: false, detail: String(error) };
    }
  }
}
