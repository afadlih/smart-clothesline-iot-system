import { NextResponse } from "next/server";
import { doc, getDoc } from "firebase/firestore";
import { TelegramEnvConfigService } from "@/services/telegram/TelegramEnvConfigService";
import {
  getWebhookEnvironmentLabel,
  isTelegramWebhookEnabled,
  resolveAppBaseUrl,
  resolveTelegramWebhookUrl,
} from "@/services/telegram/TelegramWebhookUrlResolver";
import { TelegramBotApiService } from "@/services/TelegramBotApiService";
import { TelegramOpsService } from "@/services/TelegramOpsService";
import { logger } from "@/lib/logger";
import { ensureTelegramPollingStarted, getTelegramPollingDiagnostics } from "@/lib/telegramSingleton";
import { db } from "@/lib/firebase";
import { getServerMqttCommandPublisherStatus } from "@/services/mqtt/ServerMqttCommandPublisher";

export const dynamic = "force-dynamic";

function safeMillis(value: unknown): number | null {
  if (value && typeof value === "object" && "toMillis" in value) {
    return (value as { toMillis: () => number }).toMillis();
  }
  return null;
}

export async function GET() {
  try {
    const botToken = TelegramEnvConfigService.getBotToken();
    const defaultChatId = TelegramEnvConfigService.getDefaultChatId();
    const allowedUserIds = TelegramEnvConfigService.getAllowedUserIds();
    const allowedGroupIds = TelegramEnvConfigService.getAllowedGroupIds();
    const groupModeEnabled = TelegramEnvConfigService.isGroupModeEnabled();
    const runtimeMode = TelegramEnvConfigService.getRuntimeMode();
    const webhookEnabled = isTelegramWebhookEnabled();
    const vercelEnv = getWebhookEnvironmentLabel();
    const appBaseUrl = resolveAppBaseUrl();
    const resolvedWebhookUrl = resolveTelegramWebhookUrl();
    const botConfigured = TelegramEnvConfigService.isConfigured();

    let botInfo: unknown = null;
    let webhookInfo: unknown = null;
    let telegramWebhookUrl: string | null = null;
    let pollingBoot: { ok: boolean; started: boolean; reason: string } | null = null;

    if (botToken) {
      botInfo = await TelegramBotApiService.getMe(botToken).catch((err: unknown) => ({ error: String(err) }));
      webhookInfo = await TelegramBotApiService.getWebhookInfo(botToken).catch((err: unknown) => ({ error: String(err) }));
      if (runtimeMode === "polling") {
        pollingBoot = await ensureTelegramPollingStarted().catch(() => null);
      }
      if (
        webhookInfo &&
        typeof webhookInfo === "object" &&
        "ok" in webhookInfo &&
        (webhookInfo as { ok?: boolean }).ok &&
        "result" in webhookInfo
      ) {
        const result = (webhookInfo as { result?: { url?: string } }).result;
        telegramWebhookUrl = typeof result?.url === "string" ? result.url : null;
      }
    }

    const pendingCommands = await TelegramOpsService.fetchPendingCommands(10).catch(() => []);
    const recentAuditLogs = await TelegramOpsService.getRecentAuditLogs(10).catch(() => []);

    let firestoreOk = false;
    try {
      await TelegramOpsService.fetchPendingCommands(1);
      firestoreOk = true;
    } catch {
      firestoreOk = false;
    }

    const bridgeDoc = await getDoc(doc(db, "system_settings", "telegram_bridge")).catch(() => null);
    const bridgeRaw = bridgeDoc?.exists() ? (bridgeDoc.data() as Record<string, unknown>) : null;
    const bridgeLastSeenAt = safeMillis(bridgeRaw?.lastSeenAt);
    const bridgeAgeMs = bridgeLastSeenAt ? Math.max(0, Date.now() - bridgeLastSeenAt) : null;
    const bridgeAlive = bridgeAgeMs !== null && bridgeAgeMs <= 15_000;
    const webhookUrlMatch = Boolean(telegramWebhookUrl && telegramWebhookUrl === resolvedWebhookUrl);
    const mqttPublisherStatus = getServerMqttCommandPublisherStatus();
    const directMqttConfigured = mqttPublisherStatus.configured;
    const telegramCommandMode = directMqttConfigured ? "server-direct-with-bridge-fallback" : "browser-bridge-only";

    const warnings: string[] = [];
    const unconfiguredReasons: string[] = [];

    if (!botConfigured) unconfiguredReasons.push("missing TELEGRAM_BOT_TOKEN");
    if (webhookEnabled && !process.env.APP_BASE_URL) unconfiguredReasons.push("APP_BASE_URL missing");
    if (vercelEnv !== "development" && !webhookEnabled) unconfiguredReasons.push("webhook disabled on Vercel");
    if (webhookEnabled && telegramWebhookUrl && !webhookUrlMatch) unconfiguredReasons.push("webhook URL mismatch");
    if (allowedUserIds.length === 0) unconfiguredReasons.push("allowed user missing");

    if (!directMqttConfigured) {
      warnings.push("Server-side MQTT command publish is not configured. Telegram hardware commands will fall back to dashboard bridge.");
    }
    if (vercelEnv === "preview" && !webhookEnabled) {
      warnings.push(
        "Telegram webhook is not active for this deployment. Commands will not be processed unless using a separate staging bot with webhook enabled.",
      );
    }
    if (webhookEnabled && telegramWebhookUrl && !webhookUrlMatch) {
      warnings.push("Telegram webhook URL does not match APP_BASE_URL.");
    }
    if (allowedUserIds.length === 0) {
      warnings.push("No allowed Telegram users configured.");
    }
    if (!firestoreOk) {
      warnings.push("Firestore is not reachable; queue fallback may fail.");
    }
    if (!defaultChatId) {
      warnings.push("TELEGRAM_CHAT_ID is missing. Direct notification target is not configured.");
    }
    if (pendingCommands.length > 0 && !bridgeAlive) {
      warnings.push("Command queue has pending items while dashboard bridge is inactive.");
    }
    if (typeof bridgeRaw?.lastError === "string" && bridgeRaw.lastError.length > 0) {
      warnings.push(`Bridge error: ${bridgeRaw.lastError}`);
    }

    return NextResponse.json({
      ok: true,
      runtimeMode,
      vercelEnv,
      webhookEnabled,
      appBaseUrl,
      resolvedWebhookUrl,
      telegramWebhookUrl,
      webhookUrlMatch,
      botConfigured,
      directMqttConfigured,
      directMqttBrokerConfigured: Boolean(mqttPublisherStatus.brokerUrlMasked && mqttPublisherStatus.brokerUrlMasked !== "unconfigured"),
      directMqttUsernameConfigured: mqttPublisherStatus.hasUsername,
      directMqttPasswordConfigured: mqttPublisherStatus.hasPassword,
      directMqttCommandTopic: mqttPublisherStatus.commandTopic,
      directMqttTargetDeviceConfigured: mqttPublisherStatus.targetDeviceId !== null,
      telegramCommandMode,
      allowedUserIdsCount: allowedUserIds.length,
      allowedGroupsCount: allowedGroupIds.length,
      groupModeEnabled,
      pendingCommandsCount: pendingCommands.length,
      bridgeActive: Boolean(bridgeRaw?.bridgeActive),
      bridgeAlive,
      bridgeLastSeenAt,
      bridgeAgeMs,
      mqttConnectedFromBridge: typeof bridgeRaw?.mqttConnected === "boolean" ? bridgeRaw.mqttConnected : null,
      lastBridgeError: typeof bridgeRaw?.lastError === "string" ? bridgeRaw.lastError : null,
      bridgeQueueBacklog: typeof bridgeRaw?.queueBacklog === "number" ? bridgeRaw.queueBacklog : null,
      bridgeStreamState: typeof bridgeRaw?.streamState === "string" ? bridgeRaw.streamState : null,
      latestAuditLogsCount: recentAuditLogs.length,
      firestoreOk,
      polling: getTelegramPollingDiagnostics(),
      pollingBoot,
      unconfiguredReasons: runtimeMode === "unconfigured" ? unconfiguredReasons : [],
      warnings,
      botInfo,
      webhookInfo,
    });
  } catch (error) {
    logger.error("telegram", "Diagnostics failed", error);
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
