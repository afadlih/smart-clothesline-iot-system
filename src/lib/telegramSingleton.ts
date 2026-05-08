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

/**
 * Resolve the bot token for polling.
 *
 * Priority:
 *   1. TELEGRAM_BOT_TOKEN env var (always available on Vercel, never blocked)
 *   2. Firestore telegram_config.botToken (usually blocked by firestore.rules)
 *
 * Polling is only started when mode is "polling". In webhook/production mode
 * (VERCEL_ENV = "production" | "preview") polling should NOT be started.
 */
async function resolvePollToken(): Promise<{ token: string | null; mode: string }> {
  // In Vercel production/preview, webhook mode is assumed — never start polling
  const vercelEnv = process.env.VERCEL_ENV;
  if (vercelEnv === "production" || vercelEnv === "preview") {
    return { token: null, mode: "webhook" };
  }

  // Env-first for development
  const envToken = process.env.TELEGRAM_BOT_TOKEN;

  // Try Firestore for mode config (graceful — may be blocked)
  let firestoreMode: string | null = null;
  let firestoreToken: string | null = null;
  try {
    const config = await TelegramOpsService.getConfig();
    if (config) {
      firestoreMode = config.mode ?? null;
      firestoreToken = config.botToken || null;
      // If Firestore says webhook, don't start polling
      if (config.mode === "webhook") {
        return { token: null, mode: "webhook" };
      }
      // If Firestore says disabled, don't start polling
      if (!config.enabled) {
        return { token: null, mode: "disabled" };
      }
    }
  } catch {
    // Firestore unavailable — fall through to env
    logger.warn("telegram", "Firestore config unavailable for polling, using env");
  }

  const token = envToken || firestoreToken;
  const mode = firestoreMode ?? "polling";
  return { token, mode };
}

export async function ensureTelegramPollingStarted(): Promise<{
  ok: boolean;
  started: boolean;
  reason: string;
}> {
  const { token, mode } = await resolvePollToken();

  if (!token || mode !== "polling") {
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

  const webhookDeleted = await TelegramBotApiService.deleteWebhook(token);
  logger.info("telegram", "Webhook deleted before polling", { webhookDeleted });

  state.started = true;
  state.tokenFingerprint = fp;
  void TelegramBotApiService.startPolling(token);
  return { ok: true, started: true, reason: "Polling started" };
}

export function getTelegramPollingDiagnostics() {
  return TelegramBotApiService.getPollingDiagnostics();
}
