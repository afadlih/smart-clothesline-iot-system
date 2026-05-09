import { NextResponse } from "next/server";
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

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const botToken = TelegramEnvConfigService.getBotToken();
    const webhookSecret = TelegramEnvConfigService.getWebhookSecret();
    const defaultChatId = TelegramEnvConfigService.getDefaultChatId();
    const allowedUserIds = TelegramEnvConfigService.getAllowedUserIds();
    const allowedGroupIds = TelegramEnvConfigService.getAllowedGroupIds();
    const groupModeEnabled = TelegramEnvConfigService.isGroupModeEnabled();
    const runtimeMode = TelegramEnvConfigService.getRuntimeMode();
    const botConfigured = TelegramEnvConfigService.isConfigured();
    const webhookEnabled = isTelegramWebhookEnabled();
    const environment = getWebhookEnvironmentLabel();
    const appBaseUrl = resolveAppBaseUrl();
    const resolvedWebhookUrl = resolveTelegramWebhookUrl();

    let botInfo = null;
    let webhookInfo = null;

    if (botToken) {
      botInfo = await TelegramBotApiService.getMe(botToken).catch((err: unknown) => ({ error: String(err) }));
      webhookInfo = await TelegramBotApiService.getWebhookInfo(botToken).catch((err: unknown) => ({ error: String(err) }));
    }

    const pendingCommands = await TelegramOpsService.fetchPendingCommands(10).catch(() => []);
    const recentAuditLogs = await TelegramOpsService.getRecentAuditLogs(10).catch(() => []);

    // Check if we can write to Firestore (simple check)
    let firestoreWriteOk = false;
    try {
      // Just a read check is safer for diagnostics
      await TelegramOpsService.fetchPendingCommands(1);
      firestoreWriteOk = true;
    } catch {
      firestoreWriteOk = false;
    }

    const warnings: string[] = [];
    const diagnostics: {
      ok: boolean;
      botConfigured: boolean;
      webhookEnabled: boolean;
      runtimeMode: "webhook" | "polling" | "unconfigured";
      environment: string;
      appBaseUrl: string;
      resolvedWebhookUrl: string;
      botInfo: unknown;
      webhookInfo: unknown;
      allowedUserIdsCount: number;
      allowedGroupsCount: number;
      groupModeEnabled: boolean;
      firestoreOk: boolean;
      latestPendingCommandsCount: number;
      latestAuditLogsCount: number;
      bridgeExpected: boolean;
      warnings: string[];
    } = {
      ok: true,
      botConfigured,
      webhookEnabled,
      runtimeMode,
      environment,
      appBaseUrl,
      resolvedWebhookUrl,
      botInfo: botInfo && !("error" in botInfo) && botInfo.ok && botInfo.result ? {
        id: botInfo.result.id,
        first_name: botInfo.result.first_name,
        username: botInfo.result.username,
        can_join_groups: botInfo.result.can_join_groups,
      } : botInfo,
      webhookInfo: webhookInfo && !("error" in webhookInfo) && webhookInfo.ok && webhookInfo.result ? {
        url: webhookInfo.result.url,
        has_custom_certificate: webhookInfo.result.has_custom_certificate,
        pending_update_count: webhookInfo.result.pending_update_count,
        max_connections: webhookInfo.result.max_connections,
        ip_address: webhookInfo.result.ip_address,
      } : webhookInfo,
      allowedUserIdsCount: allowedUserIds.length,
      allowedGroupsCount: allowedGroupIds.length,
      groupModeEnabled,
      firestoreOk: firestoreWriteOk,
      latestPendingCommandsCount: pendingCommands.length,
      latestAuditLogsCount: recentAuditLogs.length,
      bridgeExpected: true,
      warnings,
    };

    if (!diagnostics.botConfigured) {
      warnings.push("TELEGRAM_BOT_TOKEN is missing in environment variables.");
    }
    if (!defaultChatId) {
      warnings.push("TELEGRAM_CHAT_ID is missing. Direct notification target is not configured.");
    }
    if (!webhookSecret && webhookEnabled) {
      warnings.push("TELEGRAM_WEBHOOK_SECRET is empty while webhook mode is enabled.");
    }
    if (webhookEnabled && !appBaseUrl) {
      warnings.push("Webhook is enabled but APP_BASE_URL is missing.");
    }
    if (
      webhookInfo &&
      !("error" in webhookInfo) &&
      webhookInfo.ok &&
      webhookInfo.result &&
      webhookEnabled &&
      webhookInfo.result.url !== resolvedWebhookUrl
    ) {
      warnings.push(`Webhook URL mismatch. Telegram reports ${webhookInfo.result.url}, app resolves ${resolvedWebhookUrl}.`);
    }

    return NextResponse.json(diagnostics);
  } catch (error) {
    logger.error("telegram", "Diagnostics failed", error);
    return NextResponse.json({
      ok: false,
      error: String(error),
    }, { status: 500 });
  }
}
