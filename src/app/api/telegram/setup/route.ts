import { NextRequest, NextResponse } from "next/server";
import { TelegramBotApiService } from "@/services/TelegramBotApiService";
import { TelegramOpsService } from "@/services/TelegramOpsService";
import { TelegramEnvConfigService } from "@/services/telegram/TelegramEnvConfigService";

export const dynamic = "force-dynamic";
import {
  resolveTelegramWebhookUrl,
  resolveAppBaseUrl,
  isTelegramWebhookEnabled,
  getWebhookEnvironmentLabel,
} from "@/services/telegram/TelegramWebhookUrlResolver";
import { resetTelegramAuthConfigCache } from "@/services/telegram/telegram.security";
import { TelegramWebhookSyncService } from "@/services/telegram/TelegramWebhookSyncService";

export async function GET(request: NextRequest) {
  try {
    const token = TelegramEnvConfigService.getBotToken();
    const vercelEnv = getWebhookEnvironmentLabel();
    const webhookEnabled = isTelegramWebhookEnabled();
    const appBaseUrl = resolveAppBaseUrl(request);
    const resolvedWebhookUrl = resolveTelegramWebhookUrl(request);

    const tokenCheck = token ? await TelegramBotApiService.getMe(token) : { ok: false };

    let auditLogs: unknown[] = [];
    try {
      auditLogs = await TelegramOpsService.getRecentAuditLogs(20);
    } catch {
      auditLogs = [];
    }

    return NextResponse.json({
      ok: true,
      telegramMode: "notification-only",
      configured: Boolean(token),
      tokenValid: tokenCheck.ok,
      webhookEnabled,
      resolvedWebhookUrl,
      appBaseUrl,
      vercelEnv,
      allowedGroups: TelegramEnvConfigService.getAllowedGroupIds(),
      groupModeEnabled: TelegramEnvConfigService.isGroupModeEnabled(),
      auditLogs,
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const setupAttemptedAt = Date.now();
  try {
    const body = (await request.json().catch(() => ({}))) as {
      repair?: boolean;
      force?: boolean;
    };

    const token = TelegramEnvConfigService.getBotToken();
    if (!token) {
      return NextResponse.json({
        ok: false,
        error: "TELEGRAM_BOT_TOKEN missing",
      }, { status: 400 });
    }

    // Set minimal commands (help only)
    const commandRegistered = await TelegramBotApiService.setMyCommands(token, [
      { command: "help", description: "Get bot information" }
    ]);

    const syncResult = await TelegramWebhookSyncService.sync({
      repair: body.repair ?? true,
      force: body.force ?? false,
      source: "setup-route"
    }, request);

    resetTelegramAuthConfigCache();

    return NextResponse.json({
      ...syncResult,
      setupAttemptedAt,
      commandRegistered,
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}

