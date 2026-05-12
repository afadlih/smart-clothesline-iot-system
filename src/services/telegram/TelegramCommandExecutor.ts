/**
 * TelegramCommandExecutor
 *
 * Server-side command execution abstraction for Telegram operator commands.
 *
 * On Vercel (serverless), WebSocket MQTT is not reliably available at the
 * server edge. The primary reliable path is:
 *   1. Write a Firestore command doc with status "pending"
 *   2. Return "queued" (accepted) to the Telegram user immediately
 *   3. The browser-side bridge (useSensor.ts processPendingTelegramCommands)
 *      picks up the job and dispatches it to MQTT when a dashboard tab is open.
 *
 * The executor abstraction is designed so that when a direct HTTP MQTT publish
 * endpoint becomes available (e.g., HiveMQ Cloud REST API, or a Cloud Function),
 * it can be plugged in as the primary path without changing the call sites.
 */

import { TelegramOpsService, type TelegramCommandJob } from "@/services/TelegramOpsService";
import { logger } from "@/lib/logger";
import { publishDeviceCommand, isServerMqttCommandPublisherConfigured, type ServerCommandInput } from "@/services/mqtt/ServerMqttCommandPublisher";

export type CommandExecutionResult =
  | { result: "queued"; commandId: string; detail: string }
  | { result: "dispatched"; commandId: string; detail: string }
  | { result: "delayed"; commandId?: string; detail: string }
  | { result: "failed"; commandId?: string; detail: string };

export type ExecutorCommand = TelegramCommandJob["command"];

/**
 * Execute a Telegram operator command.
 *
 * Tries server-side direct MQTT publish first if configured.
 * Falls back to Firestore queue for dashboard bridge if direct publish fails.
 */
export async function executeTelegramCommand(input: {
  command: ExecutorCommand;
  chatId?: number;
  userId: number;
  username?: string;
}): Promise<CommandExecutionResult> {
  const isDirectConfigured = isServerMqttCommandPublisherConfigured();

  if (isDirectConfigured) {
    let mqttCommand: ServerCommandInput["command"];
    switch (input.command) {
      case "/open": mqttCommand = "OPEN"; break;
      case "/close": mqttCommand = "CLOSE"; break;
      case "/mode_auto": mqttCommand = "AUTO"; break;
      case "/mode_manual": mqttCommand = "MANUAL"; break;
      case "/restart": mqttCommand = "RESTART"; break;
    }

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
             result: "Dispatched directly to MQTT from server",
             dispatchMode: "server-direct",
           });
        } catch (e) {
           logger.warn("telegram", "Failed to record done status for direct command", e);
        }

        return {
          result: "dispatched",
          commandId,
          detail: "Dispatched directly to MQTT from server.",
        };
      }
    } catch (error) {
      logger.error("telegram", "Direct MQTT publish threw error", error);
    }
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
    });

    return {
      result: "queued",
      commandId,
      detail: isDirectConfigured 
        ? "Direct MQTT failed. Queued for dashboard bridge fallback." 
        : "Direct MQTT is not configured. Queued for dashboard bridge.",
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
