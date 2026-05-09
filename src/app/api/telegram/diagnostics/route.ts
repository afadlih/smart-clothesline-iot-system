import { NextResponse } from "next/server";
import { TelegramEnvConfigService } from "@/services/telegram/TelegramEnvConfigService";
import { TelegramBotApiService } from "@/services/TelegramBotApiService";
import { TelegramOpsService } from "@/services/TelegramOpsService";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const config = TelegramEnvConfigService.getBotConfig();
    const botToken = config.token;
    
    let botInfo = null;
    let webhookInfo = null;
    
    if (botToken) {
      botInfo = await TelegramBotApiService.getMe(botToken).catch((err) => ({ error: String(err) }));
      webhookInfo = await TelegramBotApiService.getWebhookInfo(botToken).catch((err) => ({ error: String(err) }));
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

    const diagnostics = {
      ok: true,
      botConfigured: !!botToken,
      webhookEnabled: config.webhookEnabled,
      runtimeMode: process.env.NODE_ENV,
      appBaseUrl: config.appBaseUrl,
      resolvedWebhookUrl: config.webhookUrl,
      botInfo: botInfo && !("error" in botInfo) ? {
        id: botInfo.id,
        first_name: botInfo.first_name,
        username: botInfo.username,
        can_join_groups: botInfo.can_join_groups,
      } : botInfo,
      webhookInfo: webhookInfo && !("error" in webhookInfo) ? {
        url: webhookInfo.url,
        has_custom_certificate: webhookInfo.has_custom_certificate,
        pending_update_count: webhookInfo.pending_update_count,
        max_connections: webhookInfo.max_connections,
        ip_address: webhookInfo.ip_address,
      } : webhookInfo,
      allowedUserIdsCount: config.allowedUserIds.length,
      allowedGroupsCount: config.allowedGroups.length,
      groupModeEnabled: config.groupModeEnabled,
      firestoreOk: firestoreWriteOk,
      latestPendingCommandsCount: pendingCommands.length,
      latestAuditLogsCount: recentAuditLogs.length,
      warnings: [],
    };

    if (!diagnostics.botConfigured) {
      diagnostics.warnings.push("TELEGRAM_BOT_TOKEN is missing in environment variables.");
    }
    if (diagnostics.webhookEnabled && !diagnostics.resolvedWebhookUrl) {
      diagnostics.warnings.push("Webhook is enabled but APP_BASE_URL is missing.");
    }
    if (webhookInfo && !("error" in webhookInfo) && diagnostics.resolvedWebhookUrl && webhookInfo.url !== diagnostics.resolvedWebhookUrl) {
      diagnostics.warnings.push(`Webhook URL mismatch. Bot expects ${webhookInfo.url}, but app is configured for ${diagnostics.resolvedWebhookUrl}`);
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
