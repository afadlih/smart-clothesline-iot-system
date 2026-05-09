import { NextRequest, NextResponse } from "next/server";
import { TelegramEnvConfigService } from "@/services/telegram/TelegramEnvConfigService";
import { TelegramBotApiService } from "@/services/TelegramBotApiService";
import { type TelegramCommandJob } from "@/services/TelegramOpsService";
import { logger } from "@/lib/logger";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * POST /api/telegram/command-result
 * 
 * Allows the browser bridge to notify the server about a command execution result.
 * The server then sends the actual Telegram message to the user.
 */
export async function POST(request: NextRequest) {
  try {
    const { commandId, result, message } = await request.json();

    if (!commandId || !result) {
      return NextResponse.json({ ok: false, error: "Missing required fields" }, { status: 400 });
    }

    const botToken = TelegramEnvConfigService.getBotToken();
    if (!botToken) {
      return NextResponse.json({ ok: false, error: "Bot not configured" }, { status: 500 });
    }

    // Fetch the command to get the chatId
    const commandRef = doc(db, "telegram_commands", commandId);
    const commandSnap = await getDoc(commandRef);

    if (!commandSnap.exists()) {
      return NextResponse.json({ ok: false, error: "Command not found" }, { status: 404 });
    }

    const commandData = commandSnap.data() as TelegramCommandJob;
    if (!commandData.chatId) {
      return NextResponse.json({ ok: true, skipped: "No chatId associated with command" });
    }

    const emoji = result === "done" ? "✅" : result === "failed" ? "❌" : "⚠️";
    const statusText = result === "done" ? "executed successfully" : result === "failed" ? "failed" : result;
    
    const telegramMessage = [
      `${emoji} Command ${statusText}: ${commandData.command}`,
      message ? `Detail: ${message}` : null,
      `Reference: ${commandId}`,
    ].filter(Boolean).join("\n");

    await TelegramBotApiService.sendMessage(botToken, commandData.chatId, telegramMessage);

    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error("telegram", "Failed to send command result notification", error);
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
