import { TelegramBotApiService } from "@/services/TelegramBotApiService";
import { TelegramEnvConfigService } from "@/services/telegram/TelegramEnvConfigService";
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
    globalThis.__telegramSingletonState__ = { started: false, tokenFingerprint: null };
  }
  return globalThis.__telegramSingletonState__;
}

function fingerprint(token: string): string {
  return token.slice(-8);
}

/**
 * Start polling if and only if:
 * - A bot token is configured in env
 * - The runtime mode is "polling" (local dev only)
 *
 * On Vercel production/preview, getRuntimeMode() returns "webhook" and
 * this function returns immediately without starting a polling loop.
 */
export async function ensureTelegramPollingStarted(): Promise<{
  ok: boolean;
  started: boolean;
  reason: string;
}> {
  const mode = TelegramEnvConfigService.getRuntimeMode();
  const token = TelegramEnvConfigService.getBotToken();

  if (mode !== "polling" || !token) {
    TelegramBotApiService.stopPolling();
    const state = getState();
    state.started = false;
    state.tokenFingerprint = null;
    return { ok: true, started: false, reason: `Polling disabled (mode=${mode})` };
  }

  const state = getState();
  const fp = fingerprint(token);

  if (state.started && state.tokenFingerprint === fp) {
    return { ok: true, started: true, reason: "Already running" };
  }

  if (state.started && state.tokenFingerprint !== fp) {
    TelegramBotApiService.stopPolling();
    state.started = false;
  }

  const webhookDeleted = await TelegramBotApiService.deleteWebhook(token, {
    dropPendingUpdates: TelegramEnvConfigService.shouldDropPendingUpdatesOnStart(),
  });
  logger.info("telegram", "Webhook deleted before polling", { 
    webhookDeleted,
    dropPendingUpdates: TelegramEnvConfigService.shouldDropPendingUpdatesOnStart() 
  });

  state.started = true;
  state.tokenFingerprint = fp;
  
  void TelegramBotApiService.startPolling(token, {
    ignoreBeforeStart: TelegramEnvConfigService.shouldIgnoreUpdatesBeforeStart(),
    maxUpdates: TelegramEnvConfigService.getMaxUpdatesPerPoll(),
  });

  return { ok: true, started: true, reason: "Polling started" };
}

export function getTelegramPollingDiagnostics() {
  return TelegramBotApiService.getPollingDiagnostics();
}
