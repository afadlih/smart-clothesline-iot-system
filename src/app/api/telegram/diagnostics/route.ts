import { NextRequest, NextResponse } from "next/server";
import { doc, getDoc } from "firebase/firestore";
import { TelegramEnvConfigService } from "@/services/telegram/TelegramEnvConfigService";
import {
  getWebhookEnvironmentLabel,
  isTelegramWebhookEnabled,
} from "@/services/telegram/TelegramWebhookUrlResolver";
import { TelegramBotApiService } from "@/services/TelegramBotApiService";
import { TelegramOpsService } from "@/services/TelegramOpsService";
import { logger } from "@/lib/logger";
import { ensureTelegramPollingStarted, getTelegramPollingDiagnostics } from "@/lib/telegramSingleton";
import { db } from "@/lib/firebase";
import { getResolvedServerMqttCommandPublisherStatus } from "@/services/mqtt/ServerMqttCommandPublisher";
import { TelegramWebhookSyncService } from "@/services/telegram/TelegramWebhookSyncService";

export const dynamic = "force-dynamic";

function safeMillis(value: unknown): number | null {
  if (value && typeof value === "object" && "toMillis" in value) {
    return (value as { toMillis: () => number }).toMillis();
  }
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const syncStatus = await TelegramWebhookSyncService.getStatus(request);
    
    const botToken = TelegramEnvConfigService.getBotToken();
    const allowedUserIds = TelegramEnvConfigService.getAllowedUserIds();
    const allowedGroupIds = TelegramEnvConfigService.getAllowedGroupIds();
    const groupModeEnabled = TelegramEnvConfigService.isGroupModeEnabled();
    const runtimeMode = TelegramEnvConfigService.getRuntimeMode();
    const webhookEnabled = isTelegramWebhookEnabled();
    const vercelEnv = getWebhookEnvironmentLabel();
    const appBaseUrl = syncStatus.appBaseUrl;
    const botConfigured = syncStatus.botConfigured;

    let botInfo: unknown = null;
    let pollingBoot: { ok: boolean; started: boolean; reason: string } | null = null;

    if (botToken) {
      botInfo = await TelegramBotApiService.getMe(botToken).catch((err: unknown) => ({ error: String(err) }));
      if (runtimeMode === "polling") {
        pollingBoot = await ensureTelegramPollingStarted().catch(() => null);
      }
    }

    const pendingCommands = await TelegramOpsService.fetchPendingCommands(5).catch(() => []);
    const recentAuditLogs = await TelegramOpsService.getRecentAuditLogs(10).catch(() => []);
    const commandDiags = await TelegramOpsService.getDiagnosticsSnapshot().catch(() => ({
      pendingCount: 0,
      stalePendingCount: 0,
      oldestPendingAgeMs: 0,
      commandTtlMs: 0,
      commandMaxAgeMs: 0,
    }));

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
    const mqttPublisherStatus = await getResolvedServerMqttCommandPublisherStatus();
    const directMqttConfigured = mqttPublisherStatus.configured;
    const telegramCommandMode = directMqttConfigured ? "server-direct-with-bridge-fallback" : "browser-bridge-only";

    const warnings = [...syncStatus.warnings];
    const unconfiguredReasons: string[] = [];
    const pollingDiags = getTelegramPollingDiagnostics();
    const isLocalPollingEnabled = TelegramEnvConfigService.isLocalPollingEnabled();

    if (!botConfigured) unconfiguredReasons.push("missing TELEGRAM_BOT_TOKEN");
    if (webhookEnabled && !process.env.APP_BASE_URL) unconfiguredReasons.push("APP_BASE_URL missing");
    if (vercelEnv !== "development" && !webhookEnabled) unconfiguredReasons.push("webhook disabled on Vercel");
    if (webhookEnabled && !syncStatus.webhookUrlMatch) unconfiguredReasons.push("webhook URL mismatch");
    
    if (!directMqttConfigured) {
      warnings.push("Server-side MQTT command publish is not configured. Telegram hardware commands will fall back to dashboard bridge.");
    }

    if (directMqttConfigured && !mqttPublisherStatus.targetDeviceId) {
      warnings.push("Server-side MQTT is configured, but no active IoT Hub device or MQTT_TARGET_DEVICE_ID fallback is available.");
    }

    const outboundTelegramCanWork = botConfigured;
    const inboundCommandsCanWork = botConfigured && (runtimeMode === "webhook" ? (webhookEnabled && syncStatus.webhookUrlMatch) : true);

    let commandBlockerReason: string | null = null;
    if (botConfigured && !inboundCommandsCanWork) {
      if (runtimeMode === "webhook" && !syncStatus.webhookUrlMatch) {
        commandBlockerReason = "Bot can send notifications, but commands cannot reach this deployment because Telegram has no webhook registered OR the URL mismatch.";
      }
    }

    const webhookSelfTestUrl = `${appBaseUrl}/api/telegram/webhook-self-test`;
    const webhookSyncEndpoint = `${appBaseUrl}/api/telegram/webhook-sync`;

    return NextResponse.json({
      ...syncStatus,
      ok: true,
      runtimeMode,
      vercelEnv,
      webhookSelfTestUrl,
      webhookSyncEndpoint,
      outboundTelegramCanWork,
      inboundCommandsCanWork,
      commandReceivePath: "telegram-webhook -> server-direct-mqtt -> device",
      commandBlockerReason,
      botConfigured,
      directMqttConfigured,
      directMqttBrokerConfigured: Boolean(mqttPublisherStatus.brokerUrlMasked && mqttPublisherStatus.brokerUrlMasked !== "unconfigured"),
      directMqttUsernameConfigured: mqttPublisherStatus.hasUsername,
      directMqttPasswordConfigured: mqttPublisherStatus.hasPassword,
      directMqttCommandTopic: mqttPublisherStatus.commandTopic,
      directMqttConfiguredCommandTopic: mqttPublisherStatus.configuredCommandTopic,
      directMqttTargetDeviceConfigured: mqttPublisherStatus.targetDeviceId !== null,
      directMqttTargetDeviceId: mqttPublisherStatus.targetDeviceId,
      directMqttTargetSource: mqttPublisherStatus.targetSource,
      activeCommandDevice: mqttPublisherStatus.activeDevice,
      telegramCommandMode,
      allowedUserIdsCount: allowedUserIds.length,
      allowedGroupsCount: allowedGroupIds.length,
      groupModeEnabled,
      pendingCommandsCount: pendingCommands.length,
      pollingStatus: pollingDiags.status,
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
      commands: commandDiags,
      polling: {
        ...pollingDiags,
        isLocalPollingEnabled,
        dropPendingUpdatesOnStart: TelegramEnvConfigService.shouldDropPendingUpdatesOnStart(),
        ignoreUpdatesBeforeStart: TelegramEnvConfigService.shouldIgnoreUpdatesBeforeStart(),
        maxUpdatesPerPoll: TelegramEnvConfigService.getMaxUpdatesPerPoll(),
      },
      pollingBoot,
      unconfiguredReasons: runtimeMode === "unconfigured" ? unconfiguredReasons : [],
      warnings,
      botInfo,
    });
  } catch (error) {
    logger.error("telegram", "Diagnostics failed", error);
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
