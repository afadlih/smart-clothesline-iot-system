import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { logger } from "@/lib/logger";
import { TelegramBotApiService } from "@/services/TelegramBotApiService";
import {
  TelegramOpsService,
  type TelegramAuthorizedGroup,
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

function ensureGroupRegistered(
  groups: TelegramAuthorizedGroup[] | undefined,
  chatId: number,
): boolean {
  if (!groups || groups.length === 0) return false;
  return groups.some((group) => group.groupId === chatId);
}

async function upsertGroupRegistration(input: {
  config: NonNullable<Awaited<ReturnType<typeof TelegramOpsService.getConfig>>>;
  chatId: number;
  chatType: "group" | "supergroup";
  chatTitle?: string;
}): Promise<void> {
  const groups = input.config.authorizedGroups ?? [];
  if (groups.some((group) => group.groupId === input.chatId)) return;
  await TelegramOpsService.saveConfig({
    ...input.config,
    authorizedGroups: [
      ...groups,
      { groupId: input.chatId, title: input.chatTitle, type: input.chatType },
    ],
  });
}

export class TelegramCommandRouter {
  static async handle(context: TelegramInboundContext): Promise<HandleResult> {
    const config = await TelegramOpsService.getConfig();
    if (!config || !config.enabled || !config.botToken) {
      return { ok: true, detail: "Telegram disabled" };
    }

    const command = normalizeCommand(context.text);
    if (!command || !context.chatId || !context.userId) {
      return { ok: true, detail: "Ignored invalid message" };
    }

    const isGroupChat = context.chatType === "group" || context.chatType === "supergroup";
    const groupModeEnabled =
      Boolean(config.groupModeEnabled) || process.env.TELEGRAM_ENABLE_GROUP_MODE?.toLowerCase() === "true";

    if (isGroupChat && !groupModeEnabled) {
      await TelegramBotApiService.sendMessage(config.botToken, context.chatId, "Group mode is disabled.");
      return { ok: true, blocked: true, detail: "Group mode disabled" };
    }

    if (isGroupChat && groupModeEnabled && command !== "/register_group" && !ensureGroupRegistered(config.authorizedGroups, context.chatId)) {
      await TelegramBotApiService.sendMessage(
        config.botToken,
        context.chatId,
        "Group not registered. Run /register_group first.",
      );
      return { ok: true, blocked: true, detail: "Group not registered" };
    }

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
      await TelegramBotApiService.sendMessage(config.botToken, context.chatId, denied);
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

    try {
      const telemetry = await getLatestTelemetry();
      const polling = getTelegramPollingDiagnostics();
      if (command === "/start") {
        await TelegramBotApiService.sendMessage(config.botToken, context.chatId, "Smart Clothesline Bot Connected");
      } else if (command === "/help") {
        await TelegramBotApiService.sendMessage(
          config.botToken,
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
          config.botToken,
          context.chatId,
          toStatusMessage({ command, telemetry, mqtt: polling }),
        );
      } else if (command === "/ping") {
        await TelegramBotApiService.sendMessage(config.botToken, context.chatId, `PONG ${fmtTime(Date.now())}`);
      } else if (command === "/uptime") {
        await TelegramBotApiService.sendMessage(
          config.botToken,
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
          await TelegramBotApiService.sendMessage(config.botToken, context.chatId, "This command only works in group/supergroup.");
        } else {
          await upsertGroupRegistration({
            config,
            chatId: context.chatId,
            chatType: context.chatType,
            chatTitle: context.chatTitle,
          });
          await TelegramBotApiService.sendMessage(
            config.botToken,
            context.chatId,
            [
              "GROUP REGISTERED",
              `Group ID: ${context.chatId}`,
              `Group Type: ${context.chatType}`,
              `Title: ${context.chatTitle ?? "-"}`,
              `Authorization: ENABLED`,
              `MQTT Polling: ${polling.status.toUpperCase()}`,
              `Timestamp: ${fmtTime(Date.now())}`,
            ].join("\n"),
          );
        }
      } else if (OPERATOR_COMMANDS.has(command)) {
        const execResult = await executeTelegramCommand({
          command: command as ExecutorCommand,
          chatId: context.chatId,
          userId: context.userId,
          username: context.username,
        });

        const replyText = buildCommandReplyMessage(command as ExecutorCommand, execResult, Date.now());
        await TelegramBotApiService.sendMessage(config.botToken, context.chatId, replyText);

        // Audit log with result state
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
        await TelegramBotApiService.sendMessage(config.botToken, context.chatId, "Restart command acknowledged by admin.");
      } else {
        await TelegramBotApiService.sendMessage(config.botToken, context.chatId, "Unknown command. Use /help.");
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
      await TelegramBotApiService.sendMessage(config.botToken, context.chatId, "Command failed. Please try again.");
      await TelegramAuditService.log({
        userId: context.userId,
        username: context.username,
        command,
        result: "failed",
        detail: String(error),
        source: "telegram-webhook",
      });
      return { ok: false, detail: String(error) };
    }
  }
}
