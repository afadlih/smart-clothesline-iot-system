import { NextRequest, NextResponse } from "next/server";
import { TelegramEnvConfigService } from "@/services/telegram/TelegramEnvConfigService";
import {
  getWebhookEnvironmentLabel,
  isTelegramWebhookEnabled,
} from "@/services/telegram/TelegramWebhookUrlResolver";
import { TelegramBotApiService } from "@/services/TelegramBotApiService";
import { TelegramOpsService } from "@/services/TelegramOpsService";
import { logger } from "@/lib/logger";
import { TelegramWebhookSyncService } from "@/services/telegram/TelegramWebhookSyncService";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const syncStatus = await TelegramWebhookSyncService.getStatus(request);
    
    const botToken = TelegramEnvConfigService.getBotToken();
    const defaultChatId = TelegramEnvConfigService.getDefaultChatId();
    const groupModeEnabled = TelegramEnvConfigService.isGroupModeEnabled();
    const allowedGroupIds = TelegramEnvConfigService.getAllowedGroupIds();
    const webhookEnabled = isTelegramWebhookEnabled();
    const vercelEnv = getWebhookEnvironmentLabel();

    let botInfo: unknown = null;
    if (botToken) {
      botInfo = await TelegramBotApiService.getMe(botToken).catch((err: unknown) => ({ error: String(err) }));
    }

    let firestoreTelemetryContextReadable = false;
    try {
      // Small smoke test for firestore readability
      await TelegramOpsService.getConfig();
      firestoreTelemetryContextReadable = true;
    } catch {
      firestoreTelemetryContextReadable = false;
    }

    const botConfigured = Boolean(botToken);
    const defaultChatConfigured = Boolean(defaultChatId);
    const outboundNotificationsCanWork = botConfigured && defaultChatConfigured;

    const warnings = [...syncStatus.warnings];
    if (!botConfigured) warnings.push("TELEGRAM_BOT_TOKEN is not configured.");
    if (!defaultChatConfigured) warnings.push("TELEGRAM_CHAT_ID is not configured.");

    return NextResponse.json({
      ok: true,
      telegramMode: "notification-only",
      botConfigured,
      defaultChatConfigured,
      outboundNotificationsCanWork,
      webhookEnabled,
      webhookUrlMatch: syncStatus.webhookUrlMatch,
      groupNotificationsEnabled: groupModeEnabled,
      allowedGroupsCount: allowedGroupIds.length,
      firestoreTelemetryContextReadable,
      vercelEnv,
      botInfo,
      warnings,
    });
  } catch (error) {
    logger.error("telegram", "Diagnostics failed", error);
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}

