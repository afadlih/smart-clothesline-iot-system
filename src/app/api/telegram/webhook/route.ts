import { NextRequest, NextResponse } from "next/server";
import { TelegramEnvConfigService } from "@/services/telegram/TelegramEnvConfigService";
import { TelegramCommandRouter } from "@/services/telegram/TelegramCommandRouter";
import { TelegramOpsService } from "@/services/TelegramOpsService";
import { logger } from "@/lib/logger";

type TelegramUpdate = {
  update_id: number;
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

    // Write receive audit
    const msg = payload.message;
    const command = msg?.text?.split(" ")[0] || "n/a";
    
    await TelegramOpsService.addAuditLog({
      userId: msg?.from?.id,
      username: msg?.from?.username,
      command: "webhook_received",
      result: "success",
      detail: `Update ${payload.update_id} from chat ${msg?.chat?.id}. Command: ${command}`,
      source: "telegram-webhook"
    });

    // Ignore channel_post entirely
    if (payload.channel_post) {
      return NextResponse.json({ ok: true, skipped: "channel_post ignored" });
    }

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

    // Write result audit
    await TelegramOpsService.addAuditLog({
      userId: msg.from?.id,
      username: msg.from?.username,
      command: "command_processed",
      result: result.ok ? "success" : "failed",
      detail: `Command: ${command}. Result: ${result.ok ? (result.dispatched ? "dispatched" : "queued") : (result.error || "failed")}`,
      source: "telegram-webhook"
    });

    return NextResponse.json(result);
  } catch (error) {
    logger.error("telegram", "Webhook handler error", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
