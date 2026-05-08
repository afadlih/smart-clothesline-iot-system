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

/**
 * GET /api/telegram/setup
 * Returns current integration diagnostics. Does not require Firestore config.
 */
export async function GET(request: NextRequest) {
  try {
    const token = TelegramEnvConfigService.getBotToken();
    const envLabel = getWebhookEnvironmentLabel();
    const webhookEnabled = isTelegramWebhookEnabled();
    const appBaseUrl = resolveAppBaseUrl(request);
    const resolvedWebhookUrl = resolveTelegramWebhookUrl(request);
    const mode = TelegramEnvConfigService.getRuntimeMode();

    const tokenCheck = token ? await TelegramBotApiService.getMe(token) : { ok: false };

    // Audit logs are readable per firestore.rules — safe to attempt
    let auditLogs: unknown[] = [];
    try {
      auditLogs = await TelegramOpsService.getRecentAuditLogs(20);
    } catch {
      auditLogs = [];
    }

    // Start polling only in local dev (never on Vercel)
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
      vercelEnv: envLabel,
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

/**
 * POST /api/telegram/setup
 *
 * Registers bot commands with Telegram and (optionally) sets the webhook.
 *
 * Rules:
 * - TELEGRAM_BOT_TOKEN from env is preferred over request body.
 * - TELEGRAM_WEBHOOK_SECRET from env is preferred over request body.
 * - botToken and webhookSecret are NEVER saved to Firestore.
 * - setWebhook is called only when TELEGRAM_WEBHOOK_ENABLED=true.
 * - Preview/fix branches must have TELEGRAM_WEBHOOK_ENABLED=false to avoid
 *   overwriting the production webhook.
 * - The webhook URL is resolved from APP_BASE_URL (not from request body).
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      mode?: "polling" | "webhook";
      // UI may send these for connection testing ONLY — they are not persisted
      botToken?: string;
      chatId?: string;
    };

    // Env-first for all secrets
    const token = TelegramEnvConfigService.getBotToken() || body.botToken || "";
    const chatId = TelegramEnvConfigService.getDefaultChatId() || body.chatId;
    const webhookSecret = TelegramEnvConfigService.getWebhookSecret() ?? "";
    const webhookEnabled = isTelegramWebhookEnabled();
    const envLabel = getWebhookEnvironmentLabel();
    const resolvedWebhookUrl = resolveTelegramWebhookUrl(request);
    const appBaseUrl = resolveAppBaseUrl(request);
    const mode = body.mode ?? TelegramEnvConfigService.getRuntimeMode();

    if (!token) {
      return NextResponse.json(
        {
          ok: false,
          error: "TELEGRAM_BOT_TOKEN is not configured in environment variables.",
          hint: "Add TELEGRAM_BOT_TOKEN to Vercel Environment Variables for this environment.",
          vercelEnv: envLabel,
        },
        { status: 400 },
      );
    }

    // Test connection
    const connectionTest = await TelegramBotApiService.testTelegramConnection({ token, chatId });
    if (!connectionTest.tokenValid) {
      return NextResponse.json({ ok: false, error: "Invalid bot token" }, { status: 400 });
    }

    // Register bot commands with Telegram
    const commandRegistered = await TelegramBotApiService.setMyCommands(token, COMMANDS);

    // Webhook registration — gated by TELEGRAM_WEBHOOK_ENABLED
    let webhookRegistered = false;
    let webhookSkipped = false;
    let webhookSkipReason = "";

    if (mode === "webhook") {
      if (!webhookEnabled) {
        webhookSkipped = true;
        webhookSkipReason =
          envLabel === "preview"
            ? "TELEGRAM_WEBHOOK_ENABLED is not true. Preview branches must not overwrite the production webhook. Set TELEGRAM_WEBHOOK_ENABLED=true only for the production or stable staging environment."
            : "TELEGRAM_WEBHOOK_ENABLED is not set to true. Set it in Vercel Environment Variables for this environment to enable webhook registration.";
      } else {
        webhookRegistered = await TelegramBotApiService.setWebhook(token, resolvedWebhookUrl, webhookSecret);
      }
    } else if (mode === "polling") {
      await TelegramBotApiService.deleteWebhook(token);
    }

    // Reset auth cache so new env values take effect
    resetTelegramAuthConfigCache();

    // Start/stop polling based on mode
    let boot = null;
    if (mode === "polling") {
      boot = await ensureTelegramPollingStarted();
    } else {
      TelegramBotApiService.stopPolling();
    }

    return NextResponse.json({
      ok: true,
      mode,
      commandRegistered,
      webhookRegistered,
      webhookSkipped,
      webhookSkipReason: webhookSkipReason || null,
      webhookEnabled,
      resolvedWebhookUrl,
      appBaseUrl,
      vercelEnv: envLabel,
      tokenValid: true,
      connectionTest,
      polling: getTelegramPollingDiagnostics(),
      boot,
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
