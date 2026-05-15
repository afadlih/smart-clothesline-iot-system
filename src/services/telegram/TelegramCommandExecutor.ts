/**
 * TelegramCommandExecutor
 *
 * Server-side command execution abstraction for Telegram operator commands.
 *
 * On Vercel (serverless), WebSocket MQTT is not always reliable at the
 * server edge. The preferred runtime path is server-side direct publish when
 * the MQTT server environment is complete and aligned with the current
 * per-device topic contract. Otherwise the permanent safe path is Firestore
 * queue fallback, where the dashboard bridge dispatches through the same
 * topic resolver used by the latest dashboard backend.
 */

import { TelegramOpsService, type TelegramCommandJob } from "@/services/TelegramOpsService";
import { logger } from "@/lib/logger";
import {
  publishDeviceCommand,
  isServerMqttCommandPublisherConfigured,
  getServerMqttCommandPublisherStatus,
  type ServerCommandInput,
} from "@/services/mqtt/ServerMqttCommandPublisher";

export type CommandExecutionResult =
  | { result: "queued"; commandId: string; detail: string }
  | { result: "dispatched"; commandId: string; detail: string }
  | { result: "delayed"; commandId?: string; detail: string }
  | { result: "failed"; commandId?: string; detail: string };

export type ExecutorCommand = TelegramCommandJob["command"];

const LEGACY_GLOBAL_COMMAND_TOPIC = "smart-clothesline/command";

function mapTelegramCommand(command: ExecutorCommand): ServerCommandInput["command"] {
  switch (command) {
    case "/open": return "OPEN";
    case "/close": return "CLOSE";
    case "/mode_auto": return "AUTO";
    case "/mode_manual": return "MANUAL";
    case "/restart": return "RESTART";
  }
}

function isPerDeviceCommandTopic(topic: string | null | undefined): boolean {
  if (!topic) return false;
  const parts = topic.split("/").filter(Boolean);
  return parts.length >= 3 && parts[0] === "smart-clothesline" && parts[parts.length - 1] === "command";
}

function getDirectPublishReadiness(): {
  configured: boolean;
  ready: boolean;
  detail: string;
  topic: string | null;
  targetDeviceId: string | null;
} {
  const publisherStatus = getServerMqttCommandPublisherStatus();
  const configured = isServerMqttCommandPublisherConfigured();
  const topic = publisherStatus.commandTopic ?? null;
  const targetDeviceId = publisherStatus.targetDeviceId ?? null;

  if (!configured) {
    return {
      configured,
      ready: false,
      detail: "Direct MQTT is not configured. Queued for dashboard bridge.",
      topic,
      targetDeviceId,
    };
  }

  if (!targetDeviceId) {
    return {
      configured,
      ready: false,
      detail: "Direct MQTT is configured but MQTT_TARGET_DEVICE_ID is missing. Queued for dashboard bridge.",
      topic,
      targetDeviceId,
    };
  }

  if (topic === LEGACY_GLOBAL_COMMAND_TOPIC || !isPerDeviceCommandTopic(topic)) {
    return {
      configured,
      ready: false,
      detail: "Direct MQTT is configured but not aligned with the per-device command topic contract. Queued for dashboard bridge.",
      topic,
      targetDeviceId,
    };
  }

  return {
    configured,
    ready: true,
    detail: "Direct MQTT is configured for the per-device command topic contract.",
    topic,
    targetDeviceId,
  };
}

/**
 * Execute a Telegram operator command.
 *
 * Tries server-side direct MQTT publish only when the server publisher is
 * aligned with the latest per-device MQTT backend. Falls back to Firestore
 * queue when direct publish is unavailable or would publish to the old global
 * topic that devices no longer subscribe to.
 */
export async function executeTelegramCommand(input: {
  command: ExecutorCommand;
  chatId?: number;
  userId: number;
  username?: string;
}): Promise<CommandExecutionResult> {
  const directReadiness = getDirectPublishReadiness();

  if (directReadiness.ready) {
    const mqttCommand = mapTelegramCommand(input.command);

    try {
      const directResult = await publishDeviceCommand({
        command: mqttCommand,
        requestedBy: "telegram",
        sourceCommand: input.command,
        chatId: input.chatId,
        userId: input.userId,
        username: input.username,
      });

      if (directResult.ok) {
        let commandId = "-";
        try {
          commandId = await TelegramOpsService.recordCommandResult({
            command: input.command,
            status: "done",
            chatId: input.chatId,
            userId: input.userId,
            username: input.username,
            result: `Dispatched directly to MQTT topic ${directResult.topic}`,
            dispatchMode: "server-direct",
          });
        } catch (error) {
          logger.warn("telegram", "Failed to record done status for direct command", error);
        }

        return {
          result: "dispatched",
          commandId,
          detail: `Dispatched directly to MQTT topic ${directResult.topic}.`,
        };
      }

      logger.warn("telegram", "Direct MQTT publish returned non-ok result", {
        command: input.command,
        topic: directResult.topic,
        detail: directResult.detail,
        error: directResult.error,
      });
    } catch (error) {
      logger.error("telegram", "Direct MQTT publish threw error", error);
    }
  } else if (directReadiness.configured) {
    logger.warn("telegram", "Skipping direct MQTT publish because runtime is not per-device ready", {
      command: input.command,
      topic: directReadiness.topic,
      targetDeviceId: directReadiness.targetDeviceId,
      detail: directReadiness.detail,
    });
  }

  // Fallback to queue
  try {
    const commandId = await TelegramOpsService.enqueueCommand({
      command: input.command,
      chatId: input.chatId,
      userId: input.userId,
      username: input.username,
    });

    logger.info("telegram", "Command enqueued for bridge execution", {
      command: input.command,
      commandId,
      userId: input.userId,
      directReadiness,
    });

    return {
      result: "queued",
      commandId,
      detail: directReadiness.detail,
    };
  } catch (error) {
    logger.error("telegram", "Command enqueue failed", { command: input.command, error });
    return {
      result: "failed",
      detail: "Command failed. Direct MQTT unavailable and queue fallback failed.",
    };
  }
}

/**
 * Build a user-facing reply message from an execution result.
 */
export function buildCommandReplyMessage(
  command: ExecutorCommand,
  execResult: CommandExecutionResult,
  timestamp: number,
): string {
  const ref = "commandId" in execResult && execResult.commandId ? execResult.commandId : "-";
  const timeStr = new Date(timestamp).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "Asia/Jakarta",
  });

  switch (execResult.result) {
    case "dispatched":
      return [
        `Command accepted: ${command}`,
        `Execution: dispatched`,
        `Detail: ${execResult.detail}`,
        `Reference: ${ref}`,
        `Time: ${timeStr}`,
      ].join("\n");

    case "queued":
      return [
        `Command accepted: ${command}`,
        `Execution: queued`,
        `Detail: ${execResult.detail}`,
        `Reference: ${ref}`,
        `Time: ${timeStr}`,
      ].join("\n");

    case "delayed":
      return [
        `Command delayed: ${command}`,
        `Execution: waiting for device/MQTT to be ready`,
        `Time: ${timeStr}`,
        `Tip: Try again in a moment`,
      ].join("\n");

    case "failed":
      return [
        `Command failed: ${command}`,
        `Detail: ${execResult.detail}`,
        `Time: ${timeStr}`,
      ].join("\n");
  }
}
