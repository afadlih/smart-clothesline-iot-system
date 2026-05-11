import { NextRequest, NextResponse } from "next/server";
import { TelegramBotApiService } from "@/services/TelegramBotApiService";
import { TelegramOpsService } from "@/services/TelegramOpsService";
import { TelegramEnvConfigService } from "@/services/telegram/TelegramEnvConfigService";
import {
  resolveTelegramWebhookUrl,
  resolveAppBaseUrl,
  isTelegramWebhookEnabled,
  getWebhookEnvironmentLabel,
} from "@/services/telegram/TelegramWebhookUrlResolver";
import { ensureTelegramPollingStarted, getTelegramPollingDiagnostics } from "@/lib/telegramSingleton";
import { resetTelegramAuthConfigCache } from "@/services/telegram/telegram.security";
import { TelegramWebhookSyncService } from "@/services/telegram/TelegramWebhookSyncService";

const COMMANDS = [
  { command: "start", description: "Start operational bot" },
  { command: "status", description: "Current device status" },
  { command: "latest", description: "Latest telemetry" },
  { command: "health", description: "Operational health" },
  { command: "open", description: "Open clothesline" },
  { command: "close", description: "Close clothesline" },
  { command: "mode_auto", description: "Switch to auto mode" },
  { command: "mode_manual", description: "Switch to manual mode" },
  { command: "restart", description: "Admin restart command" },
  { command: "alerts", description: "Latest alerts" },
  { command: "help", description: "Available commands" },
  { command: "ping", description: "Ping bot runtime" },
  { command: "uptime", description: "Polling uptime diagnostics" },
  { command: "analytics", description: "Analytics summary" },
  { command: "register_group", description: "Register current group" },
];

export async function GET(request: NextRequest) {
  try {
    const token = TelegramEnvConfigService.getBotToken();
    const vercelEnv = getWebhookEnvironmentLabel();
    const webhookEnabled = isTelegramWebhookEnabled();
    const appBaseUrl = resolveAppBaseUrl(request);
    const resolvedWebhookUrl = resolveTelegramWebhookUrl(request);
    const mode = TelegramEnvConfigService.getRuntimeMode();

    const tokenCheck = token ? await TelegramBotApiService.getMe(token) : { ok: false };

    let auditLogs: unknown[] = [];
    try {
      auditLogs = await TelegramOpsService.getRecentAuditLogs(20);
    } catch {
      auditLogs = [];
    }

    let boot = null;
    if (mode === "polling") {
      boot = await ensureTelegramPollingStarted();
    } else {
      TelegramBotApiService.stopPolling();
    }

    return NextResponse.json({
      ok: true,
      configured: Boolean(token),
      tokenValid: tokenCheck.ok,
      tokenDescription: "description" in tokenCheck ? tokenCheck.description ?? null : null,
      mode,
      webhookEnabled,
      resolvedWebhookUrl,
      appBaseUrl,
      vercelEnv,
      allowedUserIds: TelegramEnvConfigService.getAllowedUserIds(),
      allowedGroups: TelegramEnvConfigService.getAllowedGroupIds(),
      groupModeEnabled: TelegramEnvConfigService.isGroupModeEnabled(),
      hasWebhookSecret: Boolean(TelegramEnvConfigService.getWebhookSecret()),
      auditLogs,
      polling: getTelegramPollingDiagnostics(),
      boot,
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const setupAttemptedAt = Date.now();
  try {
    const body = (await request.json().catch(() => ({}))) as {
      mode?: "polling" | "webhook";
      repair?: boolean;
      force?: boolean;
    };

    const token = TelegramEnvConfigService.getBotToken();
    const runtimeMode = TelegramEnvConfigService.getRuntimeMode();
    const setupMode: "polling" | "webhook" = body.mode ?? (runtimeMode === "webhook" ? "webhook" : "polling");

    if (!token) {
      return NextResponse.json({
        ok: false,
        error: "TELEGRAM_BOT_TOKEN missing",
        nextAction: "Set TELEGRAM_BOT_TOKEN in env."
      }, { status: 400 });
    }

    // Register commands first as it's common for both
    const commandRegistered = await TelegramBotApiService.setMyCommands(token, COMMANDS);

    if (setupMode === "webhook") {
      const syncResult = await TelegramWebhookSyncService.sync({
        repair: body.repair ?? true,
        force: body.force ?? false,
        source: "setup-route"
      }, request);

      resetTelegramAuthConfigCache();
      TelegramBotApiService.stopPolling();

      return NextResponse.json({
        ...syncResult,
        setupAttemptedAt,
        commandRegistered,
      }, { status: syncResult.ok ? 200 : 200 }); // Keep 200 to let UI handle the specific match state
    } else {
      // Polling mode setup
      const res = await TelegramBotApiService.deleteWebhookWithResult(token, { dropPendingUpdates: true });
      await ensureTelegramPollingStarted();
      resetTelegramAuthConfigCache();

      await TelegramOpsService.addAuditLog({
        command: "polling_setup",
        result: res.ok ? "success" : "failed",
        detail: `Mode changed to polling. DeleteWebhook ok: ${res.ok}`,
        source: "telegram-setup",
      });

      return NextResponse.json({
        ok: res.ok,
        setupAttemptedAt,
        setupMode: "polling",
        commandRegistered,
        deleteWebhookOk: res.ok,
        nextAction: "Polling started. Verify in logs."
      });
    }
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
