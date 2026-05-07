import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { TelegramBotApiService } from "@/services/TelegramBotApiService";
import { TelegramOpsService } from "@/services/TelegramOpsService";
import { logger } from "@/lib/logger";
import {
  authorizeTelegramUser,
  COMMAND_PERMISSIONS,
  normalizeCommand,
} from "@/services/telegram/telegram.security";

export type TelegramInboundMessage = {
  text?: string;
  chatId?: number;
  userId?: number;
  username?: string;
};

const OPERATOR_COMMANDS = new Set(["/open", "/close", "/mode_auto", "/mode_manual"]);

async function getLatestTelemetryText(): Promise<string> {
  try {
    const q = query(collection(db, "sensor_data"), orderBy("createdAt", "desc"), limit(1));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return "Telemetry: waiting for stream";
    const data = snapshot.docs[0].data() as Record<string, unknown>;
    const temperature = typeof data.temperature === "number" ? data.temperature.toFixed(1) : "-";
    const humidity = typeof data.humidity === "number" ? data.humidity.toFixed(1) : "-";
    const light = typeof data.light === "number" ? Math.round(data.light) : "-";
    const rain = Boolean(data.rain) ? "Detected" : "Clear";
    const status = typeof data.status === "string" ? data.status : "-";
    return `Temp: ${temperature} C\nHumidity: ${humidity} %\nLight: ${light}\nRain: ${rain}\nClothesline: ${status}`;
  } catch (error) {
    logger.warn("firestore", "Failed ordered telemetry query, using fallback", error);
    const fallback = await getDocs(query(collection(db, "sensor_data"), limit(1)));
    if (fallback.empty) return "Telemetry: waiting for stream";
    const data = fallback.docs[0].data() as Record<string, unknown>;
    return `Temp: ${typeof data.temperature === "number" ? data.temperature.toFixed(1) : "-"} C`;
  }
}

function helpText(): string {
  return [
    "Available commands:",
    "/status",
    "/latest",
    "/health",
    "/open",
    "/close",
    "/mode_auto",
    "/mode_manual",
    "/alerts",
  ].join("\n");
}

export async function processTelegramCommand(message: TelegramInboundMessage): Promise<{
  ok: boolean;
  blocked?: boolean;
  queued?: boolean;
  detail: string;
}> {
  const config = await TelegramOpsService.getConfig();
  if (!config || !config.enabled || !config.botToken) {
    return { ok: true, detail: "Telegram disabled" };
  }

  const command = normalizeCommand(message.text);
  if (!command || !message.chatId || !message.userId) {
    return { ok: true, detail: "Ignored invalid message" };
  }

  logger.info("telegram", "Command received", {
    command,
    userId: message.userId,
    username: message.username,
    supported: Boolean(COMMAND_PERMISSIONS[command]),
  });

  const auth = await authorizeTelegramUser({
    userId: message.userId,
    command,
  });
  logger.info("telegram", "Authorization result", {
    userId: message.userId,
    command,
    authorized: auth.authorized,
    role: auth.role,
    reason: auth.reason,
  });

  if (!auth.authorized && auth.reason === "unauthorized_user") {
    logger.warn("telegram", `Unauthorized access attempt from ${message.userId}`, {
      username: message.username,
      command,
    });
    await TelegramOpsService.addAuditLog({
      userId: message.userId,
      username: message.username,
      command,
      result: "blocked",
      detail: "Unauthorized user",
      source: "telegram-webhook",
    });
    await TelegramBotApiService.sendMessage(config.botToken, message.chatId, "Unauthorized user. Access denied.");
    return { ok: true, blocked: true, detail: "Unauthorized user" };
  }

  if (!auth.authorized) {
    logger.warn("telegram", `Permission denied for user ${message.userId}`, {
      role: auth.role,
      command,
    });
    await TelegramBotApiService.sendMessage(config.botToken, message.chatId, "Permission denied for this command.");
    await TelegramOpsService.addAuditLog({
      userId: message.userId,
      username: message.username,
      command,
      result: "blocked",
      detail: `Role ${auth.role ?? "UNKNOWN"} has no permission`,
      source: "telegram-webhook",
    });
    return { ok: true, blocked: true, detail: "Permission denied" };
  }

  if (command === "/start") {
    await TelegramBotApiService.sendMessage(
      config.botToken,
      message.chatId,
      "Smart Clothesline operational bot is active.\nUse /help for available commands.",
    );
  } else if (command === "/help") {
    await TelegramBotApiService.sendMessage(config.botToken, message.chatId, helpText());
  } else if (command === "/latest") {
    await TelegramBotApiService.sendMessage(config.botToken, message.chatId, await getLatestTelemetryText());
  } else if (command === "/status") {
    await TelegramBotApiService.sendMessage(config.botToken, message.chatId, `Device status\n${await getLatestTelemetryText()}`);
  } else if (command === "/health") {
    await TelegramBotApiService.sendMessage(
      config.botToken,
      message.chatId,
      "Health summary:\n- MQTT monitored by dashboard\n- Heartbeat tracked in operational state\n- Reconnect and stale states visible in IoT Hub",
    );
  } else if (command === "/alerts") {
    await TelegramBotApiService.sendMessage(config.botToken, message.chatId, "Use dashboard Notifications panel for latest alert timeline.");
  } else if (command === "/restart" || command === "/override" || command === "/debug") {
    await TelegramBotApiService.sendMessage(
      config.botToken,
      message.chatId,
      `${command} is authorized for ADMIN and reserved for system-level operation.`,
    );
  } else if (OPERATOR_COMMANDS.has(command)) {
    const queuedId = await TelegramOpsService.enqueueCommand({
      command: command as "/open" | "/close" | "/mode_auto" | "/mode_manual",
      userId: message.userId,
      username: message.username,
    });
    await TelegramBotApiService.sendMessage(
      config.botToken,
      message.chatId,
      `Command accepted: ${command}\nExecution: pending\nReference: ${queuedId}`,
    );
    await TelegramOpsService.addAuditLog({
      userId: message.userId,
      username: message.username,
      command,
      result: "pending",
      detail: `Queued command ${queuedId}`,
      source: "telegram-webhook",
    });
    return { ok: true, queued: true, detail: "Command queued" };
  } else {
    await TelegramBotApiService.sendMessage(config.botToken, message.chatId, "Unknown command. Use /help.");
  }

  logger.info("telegram", `Authorized user ${message.userId} executed ${command}`);

  await TelegramOpsService.addAuditLog({
    userId: message.userId,
    username: message.username,
    command,
    result: "success",
    detail: "Response sent",
    source: "telegram-webhook",
  });

  return { ok: true, detail: "Handled successfully" };
}
