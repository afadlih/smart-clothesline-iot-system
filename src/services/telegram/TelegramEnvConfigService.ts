/**
 * TelegramEnvConfigService
 *
 * Single source of truth for Telegram configuration.
 * All secrets and IDs are read from environment variables.
 * Firestore telegram_config is NOT required and NOT used for secrets.
 *
 * Server-side only — never import from browser/client components.
 */

function parseIds(raw: string | undefined, allowNegative = false): number[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isInteger(n) && (allowNegative ? n !== 0 : n > 0));
}

export const TelegramEnvConfigService = {
  /** Bot token — from TELEGRAM_BOT_TOKEN env. Never from Firestore. */
  getBotToken(): string | null {
    return process.env.TELEGRAM_BOT_TOKEN || null;
  },

  /** Webhook secret — from TELEGRAM_WEBHOOK_SECRET env. Never from Firestore. */
  getWebhookSecret(): string | null {
    return process.env.TELEGRAM_WEBHOOK_SECRET || null;
  },

  /** Default chat ID for outgoing notifications. */
  getDefaultChatId(): string | null {
    return process.env.TELEGRAM_CHAT_ID || null;
  },

  /** User IDs allowed as ADMIN. Source: TELEGRAM_ALLOWED_USER_IDS (comma-sep). */
  getAllowedUserIds(): number[] {
    return parseIds(
      process.env.TELEGRAM_ALLOWED_USER_IDS ?? process.env.TELEGRAM_ALLOWED_USERS,
    );
  },

  /** Group/supergroup chat IDs (negative) allowed. Source: TELEGRAM_ALLOWED_GROUPS. */
  getAllowedGroupIds(): number[] {
    return parseIds(process.env.TELEGRAM_ALLOWED_GROUPS, true);
  },

  /** Whether group/supergroup commands are enabled. Source: TELEGRAM_ENABLE_GROUP_MODE. */
  isGroupModeEnabled(): boolean {
    return process.env.TELEGRAM_ENABLE_GROUP_MODE?.toLowerCase() === "true";
  },

  /**
   * Runtime mode.
   * On Vercel preview/production → always "webhook" (polling must not run).
   * Locally with TELEGRAM_BOT_TOKEN set → "polling" (dev convenience).
   */
  getRuntimeMode(): "webhook" | "polling" | "unconfigured" {
    const vercelEnv = process.env.VERCEL_ENV;
    if (vercelEnv === "production" || vercelEnv === "preview") return "webhook";
    if (process.env.TELEGRAM_BOT_TOKEN) return "polling";
    return "unconfigured";
  },

  /** True when the minimum required config (bot token) is present. */
  isConfigured(): boolean {
    return Boolean(process.env.TELEGRAM_BOT_TOKEN);
  },
} as const;
