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
  const setupAttemptedAt = Date.now();
  try {
    const body = (await request.json().catch(() => ({}))) as {
      mode?: "polling" | "webhook";
      repair?: boolean;
      force?: boolean;
    };

    const token = TelegramEnvConfigService.getBotToken();
    const webhookSecret = TelegramEnvConfigService.getWebhookSecret();
    const webhookEnabled = isTelegramWebhookEnabled();
    const resolvedWebhookUrl = resolveTelegramWebhookUrl(request);
    const appBaseUrl = resolveAppBaseUrl(request);
    const runtimeMode = TelegramEnvConfigService.getRuntimeMode();
    const allowEphemeral = TelegramEnvConfigService.shouldAllowEphemeralWebhook();
    const envDropOnSetup = TelegramEnvConfigService.shouldDropPendingUpdatesOnWebhookSetup();
    
    const repair = body.repair === true;
    const force = body.force === true;
    const dropPendingUpdates = repair || envDropOnSetup || force;

    const setupMode: "polling" | "webhook" =
      body.mode ?? (runtimeMode === "webhook" ? "webhook" : "polling");

    if (!token) {
      return NextResponse.json(
        {
          ok: false,
          error: "TELEGRAM_BOT_TOKEN is not configured in environment variables.",
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
            nextAction: "Set APP_BASE_URL to your stable production/staging domain.",
          },
          { status: 400 },
        );
      }

      if (!allowEphemeral && isLikelyEphemeralVercelUrl(appBaseUrl)) {
        return NextResponse.json(
          {
            ok: false,
            error: "APP_BASE_URL points to an ephemeral Vercel deployment URL.",
            appBaseUrl,
            nextAction: "Use a stable domain/alias or set TELEGRAM_ALLOW_EPHEMERAL_WEBHOOK=true.",
          },
          { status: 400 },
        );
      }
    }

    const connectionTest = await TelegramBotApiService.testTelegramConnection({ token });
    if (!connectionTest.tokenValid) {
      return NextResponse.json({ ok: false, error: "Invalid bot token in environment" }, { status: 400 });
    }

    const commandRegistered = await TelegramBotApiService.setMyCommands(token, COMMANDS);
    let webhookRegistered = false;
    let setWebhookDescription: string | null = null;
    let setWebhookOk = false;

    if (setupMode === "webhook") {
      // Phase 6: Force Repair mode
      if (force) {
        await TelegramBotApiService.deleteWebhook(token, { dropPendingUpdates: true });
      }

      const res = await TelegramBotApiService.setWebhookWithResult(token, resolvedWebhookUrl, {
        secretToken: webhookSecret || undefined,
        dropPendingUpdates,
      });

      webhookRegistered = res.ok;
      setWebhookOk = res.ok;
      setWebhookDescription = res.description ?? null;
      TelegramBotApiService.stopPolling();
    } else {
      const res = await TelegramBotApiService.deleteWebhookWithResult(token, { dropPendingUpdates });
      webhookRegistered = false; // Intentionally false for JSON clarity
      setWebhookOk = res.ok;
      setWebhookDescription = res.description ?? null;
      await ensureTelegramPollingStarted();
    }

    resetTelegramAuthConfigCache();

    const webhookInfoAfter = await TelegramBotApiService.getWebhookInfo(token);
    const actualTelegramWebhookUrl = webhookInfoAfter.ok ? webhookInfoAfter.result?.url ?? null : null;
    
    const webhookMatchesAppBaseUrl =
      setupMode !== "webhook" ? false : Boolean(actualTelegramWebhookUrl && actualTelegramWebhookUrl === resolvedWebhookUrl);

    // Audit the setup attempt
    await TelegramOpsService.addAuditLog({
      command: "webhook_setup",
      result: setWebhookOk ? "success" : "failed",
      detail: setWebhookDescription || (setWebhookOk ? "Webhook registered" : "Setup failed"),
      source: "telegram-setup",
    });

    let nextAction = "Webhook setup completed successfully.";
    if (setupMode === "webhook") {
      if (!webhookRegistered || !webhookMatchesAppBaseUrl) {
        if (!webhookRegistered) {
          nextAction = `Telegram API Error: ${setWebhookDescription || "Unknown error"}. Check if your bot token is correct and not used by another deployment.`;
        } else {
          nextAction = "Webhook registration call succeeded, but Telegram info still shows a mismatch. This usually happens if multiple deployments are fighting for the same bot token.";
        }
      }
    }

    const finalOk = setupMode === "polling" ? setWebhookOk : (webhookRegistered && webhookMatchesAppBaseUrl);

    return NextResponse.json({
      ok: finalOk,
      setupAttemptedAt,
      setupMode,
      commandRegistered,
      webhookRegistered,
      setWebhookOk,
      setWebhookDescription,
      resolvedWebhookUrl,
      appBaseUrl,
      actualTelegramWebhookUrl,
      webhookMatchesAppBaseUrl,
      droppedPendingUpdates: dropPendingUpdates,
      nextAction,
    }, { status: finalOk ? 200 : (setWebhookOk ? 200 : 502) });
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
