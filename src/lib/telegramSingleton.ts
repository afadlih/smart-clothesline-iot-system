import { TelegramBotApiService } from "@/services/TelegramBotApiService";
import { TelegramOpsService } from "@/services/TelegramOpsService";
import { logger } from "@/lib/logger";

type TelegramSingletonState = {
  started: boolean;
  tokenFingerprint: string | null;
};

declare global {
  // eslint-disable-next-line no-var
  var __telegramSingletonState__: TelegramSingletonState | undefined;
}

function getState(): TelegramSingletonState {
  if (!globalThis.__telegramSingletonState__) {
    globalThis.__telegramSingletonState__ = {
      started: false,
      tokenFingerprint: null,
    };
  }
  return globalThis.__telegramSingletonState__;
}

function fingerprint(token: string): string {
  return token.slice(-8);
}

export async function ensureTelegramPollingStarted(): Promise<{
  ok: boolean;
  started: boolean;
  reason: string;
}> {
  const config = await TelegramOpsService.getConfig();
  if (!config?.enabled || config.mode !== "polling" || !config.botToken) {
    TelegramBotApiService.stopPolling();
    const state = getState();
    state.started = false;
    state.tokenFingerprint = null;
    return { ok: true, started: false, reason: "Polling disabled by config" };
  }

  const state = getState();
  const fp = fingerprint(config.botToken);
  if (state.started && state.tokenFingerprint === fp) {
    return { ok: true, started: true, reason: "Already running" };
  }

  if (state.started && state.tokenFingerprint !== fp) {
    TelegramBotApiService.stopPolling();
    state.started = false;
  }

  const webhookDeleted = await TelegramBotApiService.deleteWebhook(config.botToken);
  logger.info("telegram", "Webhook deleted before polling", { webhookDeleted });

  state.started = true;
  state.tokenFingerprint = fp;
  void TelegramBotApiService.startPolling(config.botToken);
  return { ok: true, started: true, reason: "Polling started" };
}

export function getTelegramPollingDiagnostics() {
  return TelegramBotApiService.getPollingDiagnostics();
}

