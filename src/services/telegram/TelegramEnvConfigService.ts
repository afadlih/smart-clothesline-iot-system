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

  getAllowedGroupIds(): number[] {
    return parseIds(process.env.TELEGRAM_ALLOWED_GROUPS, true);
  },

  isGroupModeEnabled(): boolean {
    return process.env.TELEGRAM_ENABLE_GROUP_MODE?.toLowerCase() === "true";
  },

  shouldDropPendingUpdatesOnWebhookSetup(): boolean {
    return process.env.TELEGRAM_DROP_PENDING_UPDATES_ON_WEBHOOK_SETUP === "true";
  },

  isConfigured(): boolean {
    return Boolean(process.env.TELEGRAM_BOT_TOKEN);
  },
} as const;

