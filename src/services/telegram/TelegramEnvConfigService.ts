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

  getRuntimeMode(): "webhook" | "polling" | "unconfigured" {
    const explicitMode = process.env.TELEGRAM_RUNTIME_MODE?.toLowerCase();
    if (explicitMode === "webhook" || explicitMode === "polling") {
      return explicitMode;
    }

    if (!process.env.TELEGRAM_BOT_TOKEN) {
      return "unconfigured";
    }

    // Local development should use polling by default.
    // This prevents local apps from being blocked by production webhook settings.
    if (process.env.NODE_ENV !== "production") {
      return "polling";
    }

    if (isWebhookEnabled()) {
      return "webhook";
    }

    const vercelEnv = process.env.VERCEL_ENV;
    if (vercelEnv === "production" || vercelEnv === "preview") {
      return "unconfigured";
    }

    return "polling";
  },

  isConfigured(): boolean {
    return Boolean(process.env.TELEGRAM_BOT_TOKEN);
  },
} as const;
