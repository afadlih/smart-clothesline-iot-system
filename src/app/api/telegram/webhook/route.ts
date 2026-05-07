import { NextRequest, NextResponse } from "next/server";
import { TelegramOpsService } from "@/services/TelegramOpsService";
import { processTelegramCommand } from "@/services/telegramCommandService";

type TelegramUpdate = {
  message?: {
    text?: string;
    chat?: { id: number };
    from?: { id: number; username?: string };
  };
};

export async function POST(request: NextRequest) {
  try {
    const config = await TelegramOpsService.getConfig();
    if (!config || !config.enabled || !config.botToken) {
      return NextResponse.json({ ok: true, skipped: "Telegram integration disabled" });
    }

    const secretHeader = request.headers.get("x-telegram-bot-api-secret-token");
    if (config.mode === "webhook" && config.webhookSecret && secretHeader !== config.webhookSecret) {
      return NextResponse.json({ ok: false, error: "Invalid webhook secret" }, { status: 401 });
    }

    const payload = (await request.json()) as TelegramUpdate;
    const text = payload.message?.text;
    const chatId = payload.message?.chat?.id;
    const userId = payload.message?.from?.id;
    const username = payload.message?.from?.username;

    const result = await processTelegramCommand({ text, chatId, userId, username });
    return NextResponse.json(result);
  } catch (error) {
    console.error("[TelegramWebhook] Error:", error);
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
