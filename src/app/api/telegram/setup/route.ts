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

function hostFromUrl(url: string): string {
  try {
    return new URL(url).host.toLowerCase();
  } catch {
    return "";
  }
}

function isLikelyEphemeralVercelUrl(url: string): boolean {
  const host = hostFromUrl(url);
  if (!host.endsWith(".vercel.app")) return false;
  return host.includes("-git-") || /[a-z0-9-]+-[a-z0-9]{8,}\.vercel\.app$/.test(host);
}

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
  try {
    const body = (await request.json()) as {
      mode?: "polling" | "webhook";
      botToken?: string;
      chatId?: string;
    };

    const token = TelegramEnvConfigService.getBotToken() || body.botToken || "";
    const chatId = TelegramEnvConfigService.getDefaultChatId() || body.chatId;
    const webhookSecret = TelegramEnvConfigService.getWebhookSecret() ?? "";
    const webhookEnabled = isTelegramWebhookEnabled();
    const vercelEnv = getWebhookEnvironmentLabel();
    const resolvedWebhookUrl = resolveTelegramWebhookUrl(request);
    const appBaseUrl = resolveAppBaseUrl(request);
    const runtimeMode = TelegramEnvConfigService.getRuntimeMode();
    const setupMode: "polling" | "webhook" =
      body.mode ??
      (runtimeMode === "webhook" ? "webhook" : process.env.NODE_ENV !== "production" ? "polling" : webhookEnabled ? "webhook" : "polling");

    if (!token) {
      return NextResponse.json(
        {
          ok: false,
          error: "TELEGRAM_BOT_TOKEN is not configured in environment variables.",
          vercelEnv,
          nextAction: "Set TELEGRAM_BOT_TOKEN in Vercel environment variables.",
        },
        { status: 400 },
      );
    }

    if (setupMode === "webhook") {
      if (!webhookEnabled) {
        return NextResponse.json(
          {
            ok: false,
            error: "TELEGRAM_WEBHOOK_ENABLED is false. Webhook setup is disabled.",
            setupMode,
            vercelEnv,
            nextAction: "Enable TELEGRAM_WEBHOOK_ENABLED=true for production/staging only.",
          },
          { status: 400 },
        );
      }

      if (!process.env.APP_BASE_URL) {
        return NextResponse.json(
          {
            ok: false,
            error: "APP_BASE_URL is required when TELEGRAM_WEBHOOK_ENABLED=true.",
            setupMode,
            vercelEnv,
            nextAction: "Set APP_BASE_URL to your stable production/staging domain.",
          },
          { status: 400 },
        );
      }

      if (isLikelyEphemeralVercelUrl(appBaseUrl)) {
        return NextResponse.json(
          {
            ok: false,
            error: "APP_BASE_URL points to an ephemeral Vercel deployment URL.",
            setupMode,
            appBaseUrl,
            nextAction: "Use a stable domain/alias. Do not use unique deployment URLs for Telegram webhook.",
          },
          { status: 400 },
        );
      }
    }

    const connectionTest = await TelegramBotApiService.testTelegramConnection({ token, chatId });
    if (!connectionTest.tokenValid) {
      return NextResponse.json({ ok: false, error: "Invalid bot token" }, { status: 400 });
    }

    const commandRegistered = await TelegramBotApiService.setMyCommands(token, COMMANDS);
    let webhookRegistered = false;
    let webhookInfoAfterSetup: unknown = null;

    if (setupMode === "webhook") {
      webhookRegistered = await TelegramBotApiService.setWebhook(token, resolvedWebhookUrl, webhookSecret);
      webhookInfoAfterSetup = await TelegramBotApiService.getWebhookInfo(token).catch((err: unknown) => ({ error: String(err) }));
      TelegramBotApiService.stopPolling();
    } else {
      await TelegramBotApiService.deleteWebhook(token);
      await ensureTelegramPollingStarted();
      webhookInfoAfterSetup = await TelegramBotApiService.getWebhookInfo(token).catch((err: unknown) => ({ error: String(err) }));
    }

    resetTelegramAuthConfigCache();

    const webhookUrlAfter =
      webhookInfoAfterSetup &&
      typeof webhookInfoAfterSetup === "object" &&
      "ok" in webhookInfoAfterSetup &&
      (webhookInfoAfterSetup as { ok?: boolean }).ok &&
      "result" in webhookInfoAfterSetup
        ? ((webhookInfoAfterSetup as { result?: { url?: string } }).result?.url ?? null)
        : null;

    const webhookMatchesAppBaseUrl =
      setupMode !== "webhook" ? false : Boolean(webhookUrlAfter && webhookUrlAfter === resolvedWebhookUrl);

    const nextAction =
      setupMode === "webhook"
        ? webhookMatchesAppBaseUrl
          ? "Webhook is configured correctly."
          : "Webhook mismatch detected. Re-run setup after validating APP_BASE_URL."
        : "Polling mode active for local diagnostics only.";

    return NextResponse.json({
      ok: true,
      setupMode,
      commandRegistered,
      webhookRegistered,
      webhookInfoAfterSetup,
      webhookMatchesAppBaseUrl,
      resolvedWebhookUrl,
      appBaseUrl,
      vercelEnv,
      tokenValid: true,
      connectionTest,
      polling: getTelegramPollingDiagnostics(),
      nextAction,
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
