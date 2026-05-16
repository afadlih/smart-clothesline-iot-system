/**
 * TelegramCommandExecutor
 *
 * Executes Telegram operator commands with direct MQTT first. The MQTT
 * publisher resolves target in this order:
 * 1. system_settings/active_device from IoT Hub
 * 2. MQTT_TARGET_DEVICE_ID env fallback
 * 3. legacy smart-clothesline/command fallback for Wokwi/testing
 */

import { TelegramOpsService, type TelegramCommandJob } from "@/services/TelegramOpsService";
import { logger } from "@/lib/logger";
import {
  publishTelegramDeviceCommand,
  isTelegramMqttCommandPublisherConfigured,
  type TelegramMqttCommandResult,
} from "@/services/mqtt/TelegramMqttCommandPublisher";

export type CommandExecutionResult =
  | { result: "queued"; commandId: string; detail: string }
  | { result: "dispatched"; commandId: string; detail: string }
  | { result: "delayed"; commandId?: string; detail: string }
  | { result: "failed"; commandId?: string; detail: string };

export type ExecutorCommand = TelegramCommandJob["command"];

type MappedCommand = "OPEN" | "CLOSE" | "AUTO" | "MANUAL" | "RESTART";

function mapTelegramCommand(command: ExecutorCommand): MappedCommand {
  switch (command) {
    case "/open": return "OPEN";
    case "/close": return "CLOSE";
    case "/mode_auto": return "AUTO";
    case "/mode_manual": return "MANUAL";
    case "/restart": return "RESTART";
  }
}

function formatDirectDetail(result: TelegramMqttCommandResult): string {
  const target = result.targetDeviceId ?? "legacy-global";
  return `Dispatched to ${result.topic} target=${target} source=${result.targetSource}`;
}

export async function executeTelegramCommand(input: {
  command: ExecutorCommand;
  chatId?: number;
  userId: number;
  username?: string;
}): Promise<CommandExecutionResult> {
  const mqttCommand = mapTelegramCommand(input.command);

  if (isTelegramMqttCommandPublisherConfigured()) {
    try {
      const directResult = await publishTelegramDeviceCommand(mqttCommand);

      if (directResult.ok) {
        let commandId = "-";
        const detail = formatDirectDetail(directResult);

        try {
          commandId = await TelegramOpsService.recordCommandResult({
            command: input.command,
            status: "done",
            chatId: input.chatId,
            userId: input.userId,
            username: input.username,
            result: detail,
            dispatchMode: "server-direct",
          });
        } catch (error) {
          logger.warn("telegram", "Failed to record done status for direct command", error);
        }

        return {
          result: "dispatched",
          commandId,
          detail,
        };
      }

      logger.warn("telegram", "Direct MQTT publish failed; falling back to bridge queue", {
        command: input.command,
        topic: directResult.topic,
        detail: directResult.detail,
        error: directResult.error,
      });
    } catch (error) {
      logger.error("telegram", "Direct MQTT publish threw error", error);
    }
  }

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
    });

    return {
      result: "queued",
      commandId,
      detail: "Direct MQTT unavailable. Queued for dashboard bridge.",
    };
  } catch (error) {
    logger.error("telegram", "Command enqueue failed", { command: input.command, error });
    return {
      result: "failed",
      detail: "Command failed. Direct MQTT unavailable and queue fallback failed.",
    };
  }
}

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
