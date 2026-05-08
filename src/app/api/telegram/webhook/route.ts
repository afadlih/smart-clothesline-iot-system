import { NextRequest, NextResponse } from "next/server";
import { processTelegramCommand } from "@/services/telegramCommandService";

type TelegramUpdate = {
  message?: {
    text?: string;
    chat?: { id: number; type?: "private" | "group" | "supergroup"; title?: string };
    from?: { id: number; username?: string };
  };
};

/**
 * Telegram webhook handler.
 *
 * Uses TELEGRAM_BOT_TOKEN and TELEGRAM_WEBHOOK_SECRET from env as the primary
 * source of truth — never depends on Firestore telegram_config (which is
 * deny-all in firestore.rules and unavailable on Vercel).
 *
 * processTelegramCommand handles authorization internally via telegram.security.ts
 * which already loads allowed user IDs from TELEGRAM_ALLOWED_USER_IDS first.
 */
export async function POST(request: NextRequest) {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;

    // No token configured — integration not set up
    if (!botToken) {
      return NextResponse.json({ ok: true, skipped: "Telegram integration not configured" });
    }

    // Validate webhook secret (only when TELEGRAM_WEBHOOK_SECRET is set)
    if (webhookSecret) {
      const secretHeader = request.headers.get("x-telegram-bot-api-secret-token");
      if (secretHeader !== webhookSecret) {
        return NextResponse.json({ ok: false, error: "Invalid webhook secret" }, { status: 401 });
      }
    }

    const payload = (await request.json()) as TelegramUpdate;
    const text = payload.message?.text;
    const chatId = payload.message?.chat?.id;
    const chatType = payload.message?.chat?.type;
    const chatTitle = payload.message?.chat?.title;
    const userId = payload.message?.from?.id;
    const username = payload.message?.from?.username;

    const result = await processTelegramCommand({
      text,
      chatId,
      chatType,
      chatTitle,
      userId,
      username,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[TelegramWebhook] Error:", error);
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
