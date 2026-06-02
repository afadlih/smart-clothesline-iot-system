import { NextRequest, NextResponse } from "next/server";
import { TelegramEnvConfigService } from "@/services/telegram/TelegramEnvConfigService";
import {
  getWebhookEnvironmentLabel,
  isTelegramWebhookEnabled,
} from "@/services/telegram/TelegramWebhookUrlResolver";
import { TelegramBotApiService } from "@/services/TelegramBotApiService";
import { logger } from "@/lib/logger";
import { TelegramWebhookSyncService } from "@/services/telegram/TelegramWebhookSyncService";
import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";

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
    let latestTelemetryAvailable = false;
    try {
      // Check sensor_data readability
      const q = query(collection(db, "sensor_data"), orderBy("createdAt", "desc"), limit(1));
      const snap = await getDocs(q);
      firestoreTelemetryContextReadable = true;
      latestTelemetryAvailable = !snap.empty;
    } catch (err) {
      logger.error("telegram", "Telemetry check failed in diagnostics", err);
      firestoreTelemetryContextReadable = false;
    }

    const botConfigured = Boolean(botToken);
    const defaultChatConfigured = Boolean(defaultChatId);
    const outboundNotificationsCanWork = botConfigured && defaultChatConfigured;

    const warnings = [...syncStatus.warnings];
    if (!botConfigured) warnings.push("TELEGRAM_BOT_TOKEN is not configured.");
    if (!defaultChatConfigured) warnings.push("TELEGRAM_CHAT_ID is not configured.");
    if (!latestTelemetryAvailable) warnings.push("No telemetry data found in Firestore.");

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
      latestTelemetryAvailable,
      vercelEnv,
      botInfo,
      warnings,
    });
  } catch (error) {
    logger.error("telegram", "Diagnostics failed", error);
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}

