import { NextRequest, NextResponse } from "next/server";
import { TelegramEnvConfigService } from "@/services/telegram/TelegramEnvConfigService";
import { TelegramBotApiService } from "@/services/TelegramBotApiService";
import { TelegramOpsService } from "@/services/TelegramOpsService";
import { getTelegramPollingDiagnostics } from "@/lib/telegramSingleton";
import { logger } from "@/lib/logger";

type SelfTestBody = {
  sendPing?: boolean;
};

export const dynamic = "force-dynamic";

async function runSelfTest(sendPing: boolean) {
  try {
    const token = TelegramEnvConfigService.getBotToken();
    const chatId = TelegramEnvConfigService.getDefaultChatId();
    const runtimeMode = TelegramEnvConfigService.getRuntimeMode();
    const allowedUserIds = TelegramEnvConfigService.getAllowedUserIds();
    const allowedGroupIds = TelegramEnvConfigService.getAllowedGroupIds();

    const polling = getTelegramPollingDiagnostics();

    const baseResult = {
      ok: true,
      configured: Boolean(token),
      runtimeMode,
      groupModeEnabled: TelegramEnvConfigService.isGroupModeEnabled(),
      allowedUserIdsCount: allowedUserIds.length,
      allowedGroupsCount: allowedGroupIds.length,
      polling,
      checks: {
        tokenValid: false,
        chatConfigured: Boolean(chatId),
        pingSent: false,
      },
      recent: {
        pendingCommands: [] as unknown[],
        auditLogs: [] as unknown[],
      },
      warnings: [] as string[],
    };

    if (!token) {
      baseResult.warnings.push("TELEGRAM_BOT_TOKEN is missing");
      return NextResponse.json(baseResult);
    }

    const me = await TelegramBotApiService.getMe(token);
    baseResult.checks.tokenValid = me.ok;
    if (!me.ok) {
      baseResult.warnings.push(`Bot token invalid: ${me.description ?? "unknown error"}`);
    }

    if (!chatId) {
      baseResult.warnings.push("TELEGRAM_CHAT_ID is missing");
    } else if (sendPing && me.ok) {
      const pingText = [
        "Telegram self-test",
        `Time: ${new Date().toISOString()}`,
        `Mode: ${runtimeMode}`,
      ].join("\n");
      const ping = await TelegramBotApiService.sendMessageWithResult(token, chatId, pingText);
      baseResult.checks.pingSent = ping.ok;
      if (!ping.ok) {
        baseResult.warnings.push(`Ping failed: ${ping.description ?? "unknown error"}`);
      }
    }

    try {
      baseResult.recent.pendingCommands = await TelegramOpsService.fetchPendingCommands(10);
    } catch (error) {
      baseResult.warnings.push(`Cannot read pending command queue: ${String(error)}`);
    }

    try {
      baseResult.recent.auditLogs = await TelegramOpsService.getRecentAuditLogs(10);
    } catch (error) {
      baseResult.warnings.push(`Cannot read Telegram audit logs: ${String(error)}`);
    }

    return baseResult;
  } catch (error) {
    logger.error("telegram", "Self-test failed", error);
    throw error;
  }
}

export async function GET() {
  try {
    return NextResponse.json(await runSelfTest(false));
  } catch {
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as SelfTestBody;
    return NextResponse.json(await runSelfTest(body.sendPing === true));
  } catch {
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
