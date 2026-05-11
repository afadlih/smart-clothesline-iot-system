/**
 * Single source of truth for Telegram environment configuration.
 * Secrets remain server-only and are never read from Firestore.
 */

function parseIds(raw: string | undefined, allowNegative = false): number[] {
  if (!raw) return [];

  return raw
    .split(",")
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isInteger(value) && (allowNegative ? value !== 0 : value > 0));
}

function isWebhookEnabled(): boolean {
  return process.env.TELEGRAM_WEBHOOK_ENABLED?.toLowerCase() === "true";
}

export const TelegramEnvConfigService = {
  getBotToken(): string | null {
    return process.env.TELEGRAM_BOT_TOKEN || null;
  },

  getWebhookSecret(): string | null {
    return process.env.TELEGRAM_WEBHOOK_SECRET || null;
  },

  getDefaultChatId(): string | null {
    return process.env.TELEGRAM_CHAT_ID || null;
  },

  getAllowedUserIds(): number[] {
    return parseIds(
      process.env.TELEGRAM_ALLOWED_USER_IDS ?? process.env.TELEGRAM_ALLOWED_USERS,
    );
  },

  getAllowedGroupIds(): number[] {
    return parseIds(process.env.TELEGRAM_ALLOWED_GROUPS, true);
  },

  getOperatorIds(): number[] {
    return parseIds(process.env.TELEGRAM_OPERATOR_IDS);
  },

  isGroupModeEnabled(): boolean {
    return process.env.TELEGRAM_ENABLE_GROUP_MODE?.toLowerCase() === "true";
  },

  isLocalPollingEnabled(): boolean {
    return process.env.TELEGRAM_LOCAL_POLLING_ENABLED?.toLowerCase() === "true";
  },

  shouldDropPendingUpdatesOnStart(): boolean {
    return process.env.TELEGRAM_DROP_PENDING_UPDATES_ON_POLLING_START !== "false";
  },

  shouldIgnoreUpdatesBeforeStart(): boolean {
    return process.env.TELEGRAM_IGNORE_UPDATES_BEFORE_START !== "false";
  },

  getMaxUpdatesPerPoll(): number {
    const val = Number(process.env.TELEGRAM_MAX_UPDATES_PER_POLL);
    return Number.isInteger(val) && val > 0 ? val : 10;
  },

  getCommandTtlMs(): number {
    const val = Number(process.env.TELEGRAM_COMMAND_TTL_MS);
    return Number.isInteger(val) && val > 0 ? val : 2 * 60 * 1000;
  },

  getCommandMaxAgeMs(): number {
    const val = Number(process.env.TELEGRAM_COMMAND_MAX_AGE_MS);
    return Number.isInteger(val) && val > 0 ? val : 5 * 60 * 1000;
  },

  getRuntimeMode(): "webhook" | "polling" | "unconfigured" {
    const explicitMode = process.env.TELEGRAM_RUNTIME_MODE?.toLowerCase();
    
    if (explicitMode === "webhook") {
      return "webhook";
    }

    if (explicitMode === "polling") {
      const vercelEnv = process.env.VERCEL_ENV;
      const isVercel = vercelEnv === "production" || vercelEnv === "preview";
      const allowVercelPolling = process.env.TELEGRAM_ALLOW_VERCEL_POLLING === "true";

      // Polling on Vercel is highly discouraged as it triggers serverless timeouts
      // and consumes excessive execution time. Use only for temporary emergency debugging.
      if (isVercel && !allowVercelPolling) {
        return "unconfigured";
      }

      // Local polling requires explicit enablement even if mode is polling
      if (process.env.NODE_ENV !== "production" && !this.isLocalPollingEnabled()) {
        return "unconfigured";
      }
      return "polling";
    }

    if (!process.env.TELEGRAM_BOT_TOKEN) {
      return "unconfigured";
    }

    // Default behavior for local dev: only polling if explicitly enabled
    if (process.env.NODE_ENV !== "production") {
      return this.isLocalPollingEnabled() ? "polling" : "unconfigured";
    }

    if (isWebhookEnabled()) {
      return "webhook";
    }

    const vercelEnv = process.env.VERCEL_ENV;
    if (vercelEnv === "production" || vercelEnv === "preview") {
      return "unconfigured";
    }

    // Fallback for other environments: only polling if enabled
    return this.isLocalPollingEnabled() ? "polling" : "unconfigured";
  },

  isConfigured(): boolean {
    return Boolean(process.env.TELEGRAM_BOT_TOKEN);
  },
} as const;
