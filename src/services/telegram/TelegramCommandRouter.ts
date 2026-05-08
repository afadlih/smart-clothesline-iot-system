import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { logger } from "@/lib/logger";
import { TelegramBotApiService } from "@/services/TelegramBotApiService";
import { TelegramEnvConfigService } from "@/services/telegram/TelegramEnvConfigService";
import { authorizeTelegramActor, normalizeCommand } from "@/services/telegram/telegram.security";
import { TelegramAuditService } from "@/services/telegram/TelegramAuditService";
import { getTelegramPollingDiagnostics } from "@/lib/telegramSingleton";
import { formatClock } from "@/utils/timeFormat";
import {
  executeTelegramCommand,
  buildCommandReplyMessage,
  type ExecutorCommand,
} from "@/services/telegram/TelegramCommandExecutor";

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
  detail: string;
};

const OPERATOR_COMMANDS = new Set(["/open", "/close", "/mode_auto", "/mode_manual"]);

async function getLatestTelemetry() {
  try {
    const q = query(collection(db, "sensor_data"), orderBy("createdAt", "desc"), limit(1));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    const data = snapshot.docs[0].data() as Record<string, unknown>;
    const timestamp =
      typeof data.timestamp === "number"
        ? data.timestamp
        : typeof data.createdAt === "number"
          ? data.createdAt
          : Date.now();
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
  const ageSec =
    input.telemetry?.timestamp
      ? Math.max(0, Math.floor((Date.now() - input.telemetry.timestamp) / 1000))
      : null;

  return [
    "SMART CLOTHESLINE STATUS",
    "",
    `Device: ${input.telemetry?.status ?? "UNKNOWN"}`,
    `MQTT: ${input.mqtt.status.toUpperCase()}`,
    `Temperature: ${typeof input.telemetry?.temperature === "number" ? `${input.telemetry.temperature.toFixed(1)} C` : "-"}`,
    `Humidity: ${typeof input.telemetry?.humidity === "number" ? `${input.telemetry.humidity.toFixed(1)} %` : "-"}`,
    `Light: ${typeof input.telemetry?.light === "number" ? Math.round(input.telemetry.light) : "-"}`,
    `Rain: ${input.telemetry?.rain ? "DETECTED" : "CLEAR"}`,
    `Telemetry Delay: ${ageSec === null ? "-" : `${ageSec}s`}`,
    `Updated At: ${input.telemetry?.timestamp ? formatClock(input.telemetry.timestamp) : "-"}`,
  ].join("\n");
}

export class TelegramCommandRouter {
  static async handle(context: TelegramInboundContext): Promise<HandleResult> {
    // ── Resolve bot token from env (never Firestore) ──────────────────────────
    const botToken = TelegramEnvConfigService.getBotToken();
    if (!botToken) {
      logger.warn("telegram", "No bot token configured — Telegram integration inactive");
      return { ok: true, detail: "Telegram not configured" };
    }

    // ── Validate minimal required context ─────────────────────────────────────
    const command = normalizeCommand(context.text);
    if (!command || !context.chatId || !context.userId) {
      return { ok: true, detail: "Ignored: invalid or empty message" };
    }

    const isGroupChat = context.chatType === "group" || context.chatType === "supergroup";

    // ── Group mode check (env-first) ──────────────────────────────────────────
    if (isGroupChat) {
      const groupModeEnabled = TelegramEnvConfigService.isGroupModeEnabled();
      if (!groupModeEnabled) {
        await TelegramBotApiService.sendMessage(botToken, context.chatId, "Group mode is disabled.");
        return { ok: true, blocked: true, detail: "Group mode disabled" };
      }

      if (command !== "/register_group") {
        const allowedGroups = new Set(TelegramEnvConfigService.getAllowedGroupIds());
        if (!allowedGroups.has(context.chatId)) {
          await TelegramBotApiService.sendMessage(
            botToken,
            context.chatId,
            "This group is not registered. Ask an admin to add its ID to TELEGRAM_ALLOWED_GROUPS.",
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
      const msg =
        auth.reason === "insufficient_role"
          ? "You do not have permission for this command."
          : auth.reason === "unauthorized_group"
            ? "This group is not authorized."
            : "Unauthorized. Access denied.";
      await TelegramBotApiService.sendMessage(botToken, context.chatId, msg);
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

    // ── Command dispatch ──────────────────────────────────────────────────────
    try {
      const telemetry = await getLatestTelemetry();
      const polling = getTelegramPollingDiagnostics();

      // ── Informational commands ──────────────────────────────────────────────
      if (command === "/start") {
        await TelegramBotApiService.sendMessage(botToken, context.chatId, "Smart Clothesline Bot Connected ✓");
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
      } else if (
        command === "/status" ||
        command === "/latest" ||
        command === "/health" ||
        command === "/analytics"
      ) {
        await TelegramBotApiService.sendMessage(
          botToken,
          context.chatId,
          toStatusMessage({ command, telemetry, mqtt: polling }),
        );
      } else if (command === "/ping") {
        await TelegramBotApiService.sendMessage(
          botToken,
          context.chatId,
          `PONG ${formatClock(Date.now())}`,
        );
      } else if (command === "/uptime") {
        await TelegramBotApiService.sendMessage(
          botToken,
          context.chatId,
          [
            "UPTIME",
            `Polling: ${polling.status.toUpperCase()}`,
            `Uptime: ${Math.floor((polling.uptimeMs ?? 0) / 1000)}s`,
            `Last Update: ${polling.lastUpdateAt ? formatClock(polling.lastUpdateAt) : "-"}`,
          ].join("\n"),
        );
      } else if (command === "/register_group") {
        if (!isGroupChat) {
          await TelegramBotApiService.sendMessage(
            botToken,
            context.chatId,
            "This command only works in group or supergroup chats.",
          );
        } else {
          const allowedGroups = new Set(TelegramEnvConfigService.getAllowedGroupIds());
          const alreadyRegistered = allowedGroups.has(context.chatId);
          const authState = alreadyRegistered
            ? "AUTHORIZED"
            : `PENDING — add ${context.chatId} to TELEGRAM_ALLOWED_GROUPS env and redeploy`;

          await TelegramAuditService.log({
            userId: context.userId,
            username: context.username,
            command,
            result: "success",
            detail: `chatId=${context.chatId} type=${context.chatType} title=${context.chatTitle ?? "-"} registered=${alreadyRegistered}`,
            source: "telegram-webhook",
          });

          await TelegramBotApiService.sendMessage(
            botToken,
            context.chatId,
            [
              "GROUP REGISTRATION",
              `Group ID: ${context.chatId}`,
              `Type: ${context.chatType}`,
              `Title: ${context.chatTitle ?? "-"}`,
              `Authorization: ${authState}`,
              `Time: ${formatClock(Date.now())}`,
            ].join("\n"),
          );
          return { ok: true, detail: "register_group handled" };
        }
      } else if (OPERATOR_COMMANDS.has(command)) {
        // ── Operator commands (queue to Firestore, MQTT picks up) ─────────────
        const execResult = await executeTelegramCommand({
          command: command as ExecutorCommand,
          chatId: context.chatId,
          userId: context.userId,
          username: context.username,
        });

        const replyText = buildCommandReplyMessage(command as ExecutorCommand, execResult, Date.now());
        await TelegramBotApiService.sendMessage(botToken, context.chatId, replyText);

        const auditResult: "success" | "failed" | "pending" =
          execResult.result === "failed"
            ? "failed"
            : execResult.result === "delayed"
              ? "pending"
              : "success";

        await TelegramAuditService.log({
          userId: context.userId,
          username: context.username,
          command,
          result: auditResult,
          detail: `[${execResult.result.toUpperCase()}] ${"commandId" in execResult && execResult.commandId ? `ref=${execResult.commandId} ` : ""}${execResult.detail}`,
          source: "telegram-webhook",
        });

        return { ok: execResult.result !== "failed", queued: execResult.result === "queued", detail: execResult.detail };
      } else if (command === "/restart") {
        await TelegramBotApiService.sendMessage(botToken, context.chatId, "Restart acknowledged.");
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
      return { ok: true, detail: "Handled" };
    } catch (error) {
      logger.error("telegram", "Command handler error", error);
      try {
        await TelegramBotApiService.sendMessage(botToken, context.chatId, "Command failed. Please try again.");
      } catch {
        // Secondary failure — ignore
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
