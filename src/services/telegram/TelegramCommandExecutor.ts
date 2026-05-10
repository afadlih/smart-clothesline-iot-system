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

export type CommandExecutionResult =
  | { result: "queued"; commandId: string; detail: string }
  | { result: "dispatched"; commandId: string; detail: string }
  | { result: "delayed"; commandId?: string; detail: string }
  | { result: "failed"; commandId?: string; detail: string };

export type ExecutorCommand = TelegramCommandJob["command"];

/**
 * Execute a Telegram operator command.
 *
 * Current implementation: enqueues to Firestore for browser-bridge execution.
 * Returns "queued" (= accepted) immediately so the Telegram reply is fast.
 *
 * Future: swap `enqueueOnly` for an HTTP MQTT publish when available.
 */
export async function executeTelegramCommand(input: {
  command: ExecutorCommand;
  chatId?: number;
  userId: number;
  username?: string;
}): Promise<CommandExecutionResult> {
  try {
    // Primary path: enqueue to Firestore — reliable on serverless Vercel
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
      detail: "Queued. Requires active dashboard bridge for MQTT dispatch.",
    };
  } catch (error) {
    logger.error("telegram", "Command enqueue failed", { command: input.command, error });
    const reason = error instanceof Error ? error.message : "Command queue unavailable";
    return {
      result: "failed",
      detail: reason,
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
        `Reference: ${ref}`,
        `Time: ${timeStr}`,
      ].join("\n");

    case "queued":
      return [
        `Command accepted: ${command}`,
        `Execution: queued`,
        `Reference: ${ref}`,
        `Time: ${timeStr}`,
        "Queued. Requires active dashboard bridge for MQTT dispatch.",
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
        `Reason: ${execResult.detail}`,
        `Time: ${timeStr}`,
      ].join("\n");
  }
}
