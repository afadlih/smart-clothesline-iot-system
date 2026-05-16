import { NextResponse } from "next/server";
import { TelegramEnvConfigService } from "@/services/telegram/TelegramEnvConfigService";
import {
  isTelegramWebhookEnabled,
  resolveAppBaseUrl,
  resolveTelegramWebhookUrl,
} from "@/services/telegram/TelegramWebhookUrlResolver";
import { TelegramBotApiService } from "@/services/TelegramBotApiService";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const botToken = TelegramEnvConfigService.getBotToken();
    const webhookEnabled = isTelegramWebhookEnabled();
    const appBaseUrl = resolveAppBaseUrl();
    const resolvedWebhookUrl = resolveTelegramWebhookUrl();
    const botConfigured = TelegramEnvConfigService.isConfigured();

    let telegramWebhookUrl: string | null = null;
    if (botToken) {
      const info = await TelegramBotApiService.getWebhookInfo(botToken);
      if (info.ok) {
        telegramWebhookUrl = info.result?.url ?? null;
      }
    }

    const webhookUrlMatch = Boolean(telegramWebhookUrl && telegramWebhookUrl === resolvedWebhookUrl);

    return NextResponse.json({
      ok: true,
      telegramMode: "notification-only",
      webhookEnabled,
      appBaseUrl,
      resolvedWebhookUrl,
      telegramWebhookUrl,
      webhookUrlMatch,
      botConfigured,
      nextAction: !webhookUrlMatch ? "Run POST /api/telegram/setup with repair=true" : "Webhook is synchronized for audit logging",
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}

