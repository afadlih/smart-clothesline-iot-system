import { NextRequest, NextResponse } from "next/server";
import { TelegramEnvConfigService } from "@/services/telegram/TelegramEnvConfigService";
import {
  getWebhookEnvironmentLabel,
  isTelegramWebhookEnabled,
  resolveAppBaseUrl,
} from "@/services/telegram/TelegramWebhookUrlResolver";
import { TelegramWebhookHealth } from "@/services/telegram/TelegramWebhookHealth";
import { TelegramBotApiService } from "@/services/TelegramBotApiService";
import { logger } from "@/lib/logger";
import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const botToken = TelegramEnvConfigService.getBotToken();
    const defaultChatId = TelegramEnvConfigService.getDefaultChatId();
    const groupModeEnabled = TelegramEnvConfigService.isGroupModeEnabled();
    const allowedGroupIds = TelegramEnvConfigService.getAllowedGroupIds();
    const webhookEnabled = isTelegramWebhookEnabled();
    const vercelEnv = getWebhookEnvironmentLabel();
    const appBaseUrl = resolveAppBaseUrl(request);

    // Call our new webhook health service
    const health = await TelegramWebhookHealth.check(request);
    const webhookHealthy = health.healthy;

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

    // Retrieve last delivery stats
    let lastDeliveryStatus: string | null = null;
    let lastDeliveryAt: string | null = null;
    let lastError: string | null = null;

    try {
      const qDeliveries = query(
        collection(db, "telegram_deliveries"),
        orderBy("createdAt", "desc"),
        limit(1)
      );
      const snapDeliveries = await getDocs(qDeliveries);
      if (!snapDeliveries.empty) {
        const lastDoc = snapDeliveries.docs[0].data();
        lastDeliveryStatus = lastDoc.status || null;
        
        let deliveryTimeMs = 0;
        if (lastDoc.deliveredAt && typeof lastDoc.deliveredAt === "object" && "toMillis" in lastDoc.deliveredAt) {
          deliveryTimeMs = lastDoc.deliveredAt.toMillis();
        } else if (lastDoc.createdAt && typeof lastDoc.createdAt === "object" && "toMillis" in lastDoc.createdAt) {
          deliveryTimeMs = lastDoc.createdAt.toMillis();
        }
        
        if (deliveryTimeMs > 0) {
          lastDeliveryAt = new Date(deliveryTimeMs).toISOString();
        }
        lastError = lastDoc.error || null;
      }
    } catch (err) {
      logger.error("telegram", "Failed to fetch last delivery in diagnostics", err);
    }

    const botConfigured = Boolean(botToken);
    const chatIdConfigured = Boolean(defaultChatId);
    const outboundNotificationsCanWork = botConfigured && chatIdConfigured;

    const warnings: string[] = [];
    if (!botConfigured) warnings.push("TELEGRAM_BOT_TOKEN is not configured.");
    if (!chatIdConfigured) warnings.push("TELEGRAM_CHAT_ID is not configured.");
    if (!latestTelemetryAvailable) warnings.push("No telemetry data found in Firestore.");
    if (health.mismatchReason) warnings.push(health.mismatchReason);

    return NextResponse.json({
      ok: true,
      telegramMode: "notification-only",
      botConfigured,
      chatIdConfigured,
      defaultChatConfigured: chatIdConfigured,
      outboundNotificationsCanWork,
      defaultChatId, // expose for UI client test center
      webhookHealthy,
      webhookUrlMatch: webhookHealthy, // legacy compatibility
      lastDeliveryStatus,
      lastDeliveryAt,
      lastError,
      appBaseUrl,
      webhookEnabled,
      groupNotificationsEnabled: groupModeEnabled,
      allowedGroupsCount: allowedGroupIds.length,
      firestoreTelemetryContextReadable,
      latestTelemetryAvailable,
      vercelEnv,
      botInfo,
      warnings,
      webhookStatus: health.status,
    });
  } catch (error) {
    logger.error("telegram", "Diagnostics failed", error);
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
