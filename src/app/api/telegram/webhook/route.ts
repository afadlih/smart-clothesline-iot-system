import { NextRequest, NextResponse } from "next/server";
import { TelegramEnvConfigService } from "@/services/telegram/TelegramEnvConfigService";
import { TelegramCommandRouter } from "@/services/telegram/TelegramCommandRouter";

type TelegramUpdate = {
  message?: {
    text?: string;
    chat?: { id: number; type?: "private" | "group" | "supergroup"; title?: string };
    from?: { id: number; username?: string };
  };
  edited_message?: {
    text?: string;
    chat?: { id: number; type?: "private" | "group" | "supergroup" };
    from?: { id: number; username?: string };
  };
  channel_post?: unknown;
};

/**
 * POST /api/telegram/webhook
 *
 * Receives Telegram updates and routes commands.
 *
 * - Reads TELEGRAM_BOT_TOKEN and TELEGRAM_WEBHOOK_SECRET from env (never Firestore).
 * - Validates X-Telegram-Bot-Api-Secret-Token header when TELEGRAM_WEBHOOK_SECRET is set.
 * - Ignores channel_post and edited_message safely.
 * - Malformed updates do not crash.
 */
export async function POST(request: NextRequest) {
  try {
    const botToken = TelegramEnvConfigService.getBotToken();
    const webhookSecret = TelegramEnvConfigService.getWebhookSecret();

    if (!botToken) {
      return NextResponse.json({ ok: true, skipped: "Telegram integration not configured" });
    }

    // Validate webhook secret when configured
    if (webhookSecret) {
      const secretHeader = request.headers.get("x-telegram-bot-api-secret-token");
      if (secretHeader !== webhookSecret) {
        return NextResponse.json({ ok: false, error: "Invalid webhook secret" }, { status: 401 });
      }
    }

    const payload = (await request.json()) as TelegramUpdate;

    // Ignore channel_post entirely
    if (payload.channel_post) {
      return NextResponse.json({ ok: true, skipped: "channel_post ignored" });
    }

    // Use message (edited_message is intentionally ignored — no re-processing of edits)
    const msg = payload.message;
    if (!msg) {
      return NextResponse.json({ ok: true, skipped: "No message to process" });
    }

    const result = await TelegramCommandRouter.handle({
      text: msg.text,
      chatId: msg.chat?.id,
      chatType: msg.chat?.type,
      chatTitle: msg.chat?.title,
      userId: msg.from?.id,
      username: msg.from?.username,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[TelegramWebhook] Error:", error);
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
