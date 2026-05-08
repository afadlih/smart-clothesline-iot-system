import { NextRequest, NextResponse } from "next/server";
import { TelegramOpsService } from "@/services/TelegramOpsService";
import { TelegramBotApiService } from "@/services/TelegramBotApiService";
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
  { command: "override", description: "Admin override command" },
  { command: "debug", description: "Admin debug summary" },
  { command: "alerts", description: "Latest alerts" },
  { command: "help", description: "Available commands" },
  { command: "ping", description: "Ping bot runtime" },
  { command: "uptime", description: "Polling uptime diagnostics" },
  { command: "analytics", description: "Analytics summary" },
  { command: "register_group", description: "Register current group" },
];

export async function GET() {
  try {
    const config = await TelegramOpsService.getConfig();
    if (!config) {
      return NextResponse.json({ ok: true, configured: false, polling: getTelegramPollingDiagnostics() });
    }
    const tokenOk = config.botToken ? await TelegramBotApiService.getMe(config.botToken) : { ok: false };
    const auditLogs = await TelegramOpsService.getRecentAuditLogs(20);

    // Only start polling when mode is polling — skip in webhook/production mode
    let boot: Awaited<ReturnType<typeof ensureTelegramPollingStarted>> | null = null;
    if (config.mode === "polling") {
      boot = await ensureTelegramPollingStarted();
    } else {
      // Webhook mode: stop any stray polling loop if it was somehow started
      TelegramBotApiService.stopPolling();
    }

    return NextResponse.json({
      ok: true,
      configured: true,
      enabled: config.enabled,
      mode: config.mode,
      tokenValid: tokenOk.ok,
      tokenDescription: tokenOk.description ?? null,
      hasWebhookSecret: Boolean(config.webhookSecret),
      authorizedUsers: config.authorizedUsers,
      authorizedGroups: config.authorizedGroups ?? [],
      groupModeEnabled: Boolean(config.groupModeEnabled),
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
      botToken: string;
      chatId?: string;
      webhookSecret: string;
      mode: "polling" | "webhook";
      enabled: boolean;
      authorizedUsers: Array<{ userId: number; username?: string; role: "Viewer" | "Operator" | "Admin" }>;
      authorizedGroups?: Array<{ groupId: number; title?: string; type?: "group" | "supergroup" }>;
      groupModeEnabled?: boolean;
      webhookUrl?: string;
    };

    const token = body.botToken || process.env.TELEGRAM_BOT_TOKEN || "";
    const chatId = body.chatId || process.env.TELEGRAM_CHAT_ID;
    const connectionTest = await TelegramBotApiService.testTelegramConnection({
      token,
      chatId,
    });
    if (!connectionTest.tokenValid) {
      return NextResponse.json({ ok: false, error: "Invalid bot token" }, { status: 400 });
    }

    const commandRegistered = await TelegramBotApiService.setMyCommands(token, COMMANDS);
    let webhookRegistered = true;
    if (body.mode === "webhook" && body.webhookUrl) {
      webhookRegistered = await TelegramBotApiService.setWebhook(
        token,
        body.webhookUrl,
        body.webhookSecret,
      );
    } else if (body.mode === "polling") {
      await TelegramBotApiService.deleteWebhook(token);
    }

    await TelegramOpsService.saveConfig({
      botToken: token,
      chatId,
      webhookSecret: body.webhookSecret,
      mode: body.mode,
      enabled: body.enabled,
      authorizedUsers: body.authorizedUsers ?? [],
      authorizedGroups: Array.isArray(body.authorizedGroups) ? body.authorizedGroups : [],
      groupModeEnabled: Boolean(body.groupModeEnabled),
    });
    resetTelegramAuthConfigCache();

    // Only start polling when mode is polling — webhook mode does not need a long-lived loop
    let boot: Awaited<ReturnType<typeof ensureTelegramPollingStarted>> | null = null;
    if (body.mode === "polling") {
      boot = await ensureTelegramPollingStarted();
    } else {
      // Webhook mode: stop any stray polling loop
      TelegramBotApiService.stopPolling();
    }

    return NextResponse.json({
      ok: true,
      commandRegistered,
      webhookRegistered,
      tokenValid: true,
      connectionTest,
      polling: getTelegramPollingDiagnostics(),
      boot,
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
