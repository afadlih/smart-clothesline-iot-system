import { NextRequest, NextResponse } from "next/server";
import { TelegramEnvConfigService } from "@/services/telegram/TelegramEnvConfigService";
import { TelegramOpsService } from "@/services/TelegramOpsService";
import { TelegramBotApiService } from "@/services/TelegramBotApiService";
import { logger } from "@/lib/logger";

type TelegramUpdate = {
  update_id: number;
  message?: {
    text?: string;
    chat?: { id: number; type?: "private" | "group" | "supergroup"; title?: string };
    from?: { id: number; username?: string };
  };
};

const AUTO_REPLY_COOLDOWN_MS = 60_000;
declare global {
  // eslint-disable-next-line no-var
  var __telegramWebhookReplyCooldown__: Map<number, number> | undefined;
}

function getReplyCooldownMap(): Map<number, number> {
  if (!globalThis.__telegramWebhookReplyCooldown__) {
    globalThis.__telegramWebhookReplyCooldown__ = new Map<number, number>();
  }
  return globalThis.__telegramWebhookReplyCooldown__;
}

export async function POST(request: NextRequest) {
  try {
    const botToken = TelegramEnvConfigService.getBotToken();
    const webhookSecret = TelegramEnvConfigService.getWebhookSecret();

    if (!botToken) {
      return NextResponse.json({ ok: true, skipped: "Telegram integration not configured" });
    }

    const payload = (await request.json().catch(() => null)) as TelegramUpdate | null;
    if (!payload) {
      return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
    }

    // Validate webhook secret when configured
    if (webhookSecret) {
      const secretHeader = request.headers.get("x-telegram-bot-api-secret-token");
      if (secretHeader !== webhookSecret) {
        await TelegramOpsService.addAuditLog({
          command: "webhook_secret_failed",
          result: "blocked",
          detail: `Secret mismatch for update ${payload.update_id}`,
          source: "telegram-webhook"
        });
        return NextResponse.json({ ok: false, error: "Invalid webhook secret" }, { status: 401 });
      }
    }

    const msg = payload.message;
    if (!msg) {
      return NextResponse.json({ ok: true, skipped: "No message to process" });
    }

    const userId = msg.from?.id;
    const chatId = msg.chat?.id;
    const text = msg.text || "";

    // Audit receive
    await TelegramOpsService.addAuditLog({
      userId,
      username: msg.from?.username,
      command: "webhook_received",
      result: "success",
      detail: `Inbound message from ${userId} in chat ${chatId}. Length: ${text.length}`,
      source: "telegram-webhook"
    });

    // Send notification-only message with cooldown
    if (userId && chatId) {
      const cooldownMap = getReplyCooldownMap();
      const last = cooldownMap.get(chatId) ?? 0;
      
      if (Date.now() - last > AUTO_REPLY_COOLDOWN_MS) {
        await TelegramBotApiService.sendMessage(
          botToken,
          chatId,
          "Smart Clothesline Bot is notification-only. Device control is available from the dashboard."
        );
        cooldownMap.set(chatId, Date.now());
      }
    }

    return NextResponse.json({ ok: true, info: "notification-only" });
  } catch (error) {
    logger.error("telegram", "Webhook handler error", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}

