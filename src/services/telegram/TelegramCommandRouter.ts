import { Timestamp, collection, getDocs, limit, orderBy, query } from "firebase/firestore";
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
  dispatched?: boolean;
  detail: string;
  error?: string;
};

type LatestTelemetry = {
  temperature: number | null;
  humidity: number | null;
  light: number | null;
  rain: boolean;
  status: string;
  mode: string;
  source: string;
  timestamp: number;
} | null;

const EXECUTABLE_COMMANDS = new Set(["/open", "/close", "/mode_auto", "/mode_manual", "/restart"]);

async function sendReply(token: string, chatId: number, text: string): Promise<void> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const sent = await TelegramBotApiService.sendMessageWithResult(token, chatId, text);
    if (sent.ok) {
      return;
    }

    logger.warn("telegram", "Failed to send reply attempt", {
      attempt: attempt + 1,
      chatId,
      description: sent.description,
    });
  }

  throw new Error("Failed to deliver Telegram reply");
}

async function getLatestTelemetry(): Promise<LatestTelemetry> {
  try {
    const telemetryQuery = query(
      collection(db, "sensor_data"),
      orderBy("createdAt", "desc"),
      limit(1),
    );
    const snapshot = await getDocs(telemetryQuery);
    if (snapshot.empty) {
      return null;
    }

    const data = snapshot.docs[0].data() as Record<string, unknown>;
    const createdAt =
      data.createdAt && typeof data.createdAt === "object" && "toMillis" in data.createdAt
        ? (data.createdAt as Timestamp).toMillis()
        : null;

    const timestamp =
      typeof data.receivedAt === "number"
        ? data.receivedAt
        : typeof data.timestamp === "number"
          ? data.timestamp
          : createdAt ?? Date.now();

    return {
      temperature: typeof data.temperature === "number" ? data.temperature : null,
      humidity: typeof data.humidity === "number" ? data.humidity : null,
      light: typeof data.light === "number" ? data.light : null,
      rain: Boolean(data.rain),
      status: typeof data.status === "string" ? data.status : "UNKNOWN",
      mode: data.mode === "AUTO" || data.mode === "MANUAL" ? data.mode : "UNKNOWN",
      source: typeof data.source === "string" ? data.source : "UNKNOWN",
      timestamp,
    };
  } catch (error) {
    logger.warn("firestore", "Telemetry query failed", error);
    return null;
  }
}

function toStatusMessage(input: {
  telemetry: LatestTelemetry;
  mqtt: ReturnType<typeof getTelegramPollingDiagnostics>;
}): string {
  if (!input.telemetry) {
    return [
      "SMART CLOTHESLINE STATUS",
      "",
      `MQTT: ${input.mqtt.status.toUpperCase()}`,
      "Telemetry: unavailable",
      `Runtime: ${TelegramEnvConfigService.getRuntimeMode().toUpperCase()}`,
      `Updated At: ${formatClock(Date.now())}`,
    ].join("\n");
  }

  const ageSec = Math.max(0, Math.floor((Date.now() - input.telemetry.timestamp) / 1000));

  return [
    "SMART CLOTHESLINE STATUS",
    "",
    `Device: ${input.telemetry.status}`,
    `Mode: ${input.telemetry.mode}`,
    `MQTT: ${input.mqtt.status.toUpperCase()}`,
    `State Source: ${input.telemetry.source}`,
    `Temperature: ${typeof input.telemetry.temperature === "number" ? `${input.telemetry.temperature.toFixed(1)} C` : "-"}`,
    `Humidity: ${typeof input.telemetry.humidity === "number" ? `${input.telemetry.humidity.toFixed(1)} %` : "-"}`,
    `Light: ${typeof input.telemetry.light === "number" ? Math.round(input.telemetry.light) : "-"}`,
    `Rain: ${input.telemetry.rain ? "DETECTED" : "CLEAR"}`,
    `Telemetry Delay: ${ageSec}s`,
    `Updated At: ${formatClock(input.telemetry.timestamp)}`,
  ].join("\n");
}

function toGroupRegistrationMessage(context: TelegramInboundContext): string {
  const isGroup = context.chatType === "group" || context.chatType === "supergroup";
  const allowedGroups = TelegramEnvConfigService.getAllowedGroupIds();
  const registered = typeof context.chatId === "number" && allowedGroups.includes(context.chatId);
  const authorization = !isGroup ? "PRIVATE CHAT" : registered ? "AUTHORIZED" : "NOT REGISTERED";

  return [
    "GROUP REGISTRATION",
    `Group ID: ${context.chatId ?? "-"}`,
    `Type: ${context.chatType ?? "-"}`,
    `Title: ${context.chatTitle ?? "-"}`,
    `Authorization: ${authorization}`,
    `Group Mode: ${TelegramEnvConfigService.isGroupModeEnabled() ? "ENABLED" : "DISABLED"}`,
    registered
      ? "Next Step: Group is already allowed."
      : "Next Step: Add this group ID to TELEGRAM_ALLOWED_GROUPS and redeploy.",
    `Time: ${formatClock(Date.now())}`,
  ].join("\n");
}

export class TelegramCommandRouter {
  static async handle(context: TelegramInboundContext): Promise<HandleResult> {
    const botToken = TelegramEnvConfigService.getBotToken();
    if (!botToken) {
      logger.warn("telegram", "No bot token configured - Telegram integration inactive");
      return { ok: true, detail: "Telegram not configured" };
    }

    const command = normalizeCommand(context.text);
    if (!command || !context.chatId || !context.userId) {
      return { ok: true, detail: "Ignored: invalid or empty message" };
    }

    const auth = await authorizeTelegramActor({
      userId: context.userId,
      command,
      chatId: context.chatId,
      chatType: context.chatType,
    });

    if (!auth.authorized) {
      const message =
        auth.reason === "insufficient_role"
          ? "You do not have permission for this command."
          : auth.reason === "unauthorized_group"
            ? "This group is not authorized."
            : "Unauthorized. Access denied.";

      await sendReply(botToken, context.chatId, message);
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
        await sendReply(
          botToken,
          context.chatId,
          [
            "Smart Clothesline Bot Connected",
            `Runtime Mode: ${TelegramEnvConfigService.getRuntimeMode().toUpperCase()}`,
            `Time: ${formatClock(Date.now())}`,
          ].join("\n"),
        );
      } else if (command === "/help") {
        await sendReply(
          botToken,
          context.chatId,
          [
            "Available commands:",
            "/start /help /status /latest /health /analytics",
            "/open /close /mode_auto /mode_manual /restart",
            "/ping /uptime /register_group",
          ].join("\n"),
        );
      } else if (command === "/status" || command === "/latest" || command === "/health" || command === "/analytics") {
        await sendReply(botToken, context.chatId, toStatusMessage({ telemetry, mqtt: polling }));
      } else if (command === "/ping") {
        await sendReply(botToken, context.chatId, `PONG ${formatClock(Date.now())}`);
      } else if (command === "/uptime") {
        await sendReply(
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
        await sendReply(botToken, context.chatId, toGroupRegistrationMessage(context));
      } else if (EXECUTABLE_COMMANDS.has(command)) {
        const execution = await executeTelegramCommand({
          command: command as ExecutorCommand,
          chatId: context.chatId,
          userId: context.userId,
          username: context.username,
        });
        await sendReply(
          botToken,
          context.chatId,
          buildCommandReplyMessage(command as ExecutorCommand, execution, Date.now()),
        );
        return { 
          ok: execution.result !== "failed", 
          detail: execution.detail, 
          dispatched: execution.result === "dispatched",
          queued: execution.result === "queued"
        };
      } else {
        await sendReply(botToken, context.chatId, "Unknown command. Use /help.");
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
        await sendReply(botToken, context.chatId, "Command failed. Please try again.");
      } catch {
        // Ignore reply failures after the main handler has already failed.
      }

      await TelegramAuditService.log({
        userId: context.userId,
        username: context.username,
        command,
        result: "failed",
        detail: String(error),
        source: "telegram-webhook",
      }).catch(() => undefined);

      return { ok: false, detail: String(error), error: String(error) };
    }
  }
}
