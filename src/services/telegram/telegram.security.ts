import { logger } from "@/lib/logger";
import { TelegramOpsService, type TelegramRole as StoredRole } from "@/services/TelegramOpsService";

export type TelegramRole = "VIEWER" | "OPERATOR" | "ADMIN";

export type AuthorizationResult = {
  authorized: boolean;
  role: TelegramRole | null;
  reason: "authorized" | "unauthorized_user" | "invalid_user_id" | "insufficient_role";
  userId: number | null;
};

export const COMMAND_PERMISSIONS: Record<string, TelegramRole[]> = {
  "/start": ["VIEWER", "OPERATOR", "ADMIN"],
  "/help": ["VIEWER", "OPERATOR", "ADMIN"],
  "/status": ["VIEWER", "OPERATOR", "ADMIN"],
  "/latest": ["VIEWER", "OPERATOR", "ADMIN"],
  "/health": ["VIEWER", "OPERATOR", "ADMIN"],
  "/alerts": ["VIEWER", "OPERATOR", "ADMIN"],
  "/open": ["OPERATOR", "ADMIN"],
  "/close": ["OPERATOR", "ADMIN"],
  "/mode_auto": ["OPERATOR", "ADMIN"],
  "/mode_manual": ["OPERATOR", "ADMIN"],
  "/restart": ["ADMIN"],
  "/override": ["ADMIN"],
  "/debug": ["ADMIN"],
};

type TelegramAuthConfig = {
  users: Map<number, TelegramRole>;
  loadedAt: number;
};

declare global {
  // eslint-disable-next-line no-var
  var __telegramAuthConfig__: TelegramAuthConfig | undefined;
}

function toRole(role: StoredRole | undefined): TelegramRole {
  if (role === "Admin") return "ADMIN";
  if (role === "Operator") return "OPERATOR";
  return "VIEWER";
}

function parseAllowedIds(raw: string | undefined): number[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .map((item) => Number(item))
    .filter((item) => Number.isInteger(item) && item > 0);
}

async function loadConfig(): Promise<TelegramAuthConfig> {
  const existing = globalThis.__telegramAuthConfig__;
  if (existing) return existing;

  const users = new Map<number, TelegramRole>();
  const fromEnv = parseAllowedIds(process.env.TELEGRAM_ALLOWED_USER_IDS);
  for (const userId of fromEnv) {
    users.set(userId, "ADMIN");
  }

  const storedConfig = await TelegramOpsService.getConfig();
  if (storedConfig?.authorizedUsers) {
    for (const item of storedConfig.authorizedUsers) {
      if (typeof item.userId !== "number" || !Number.isInteger(item.userId) || item.userId <= 0) {
        continue;
      }
      if (!users.has(item.userId)) {
        users.set(item.userId, toRole(item.role));
      }
    }
  }

  const config: TelegramAuthConfig = {
    users,
    loadedAt: Date.now(),
  };

  globalThis.__telegramAuthConfig__ = config;
  logger.info("telegram", "Loaded allowed Telegram user IDs", {
    total: users.size,
    ids: Array.from(users.keys()),
    loadedAt: config.loadedAt,
  });
  return config;
}

export function resetTelegramAuthConfigCache(): void {
  globalThis.__telegramAuthConfig__ = undefined;
}

export function normalizeCommand(raw: string | undefined): string | null {
  if (!raw || typeof raw !== "string") return null;
  const clean = raw.trim().toLowerCase();
  if (!clean.startsWith("/")) return null;
  return clean.split(/\s+/)[0];
}

export async function authorizeTelegramUser(input: {
  userId?: number;
  command?: string;
}): Promise<AuthorizationResult> {
  if (!Number.isInteger(input.userId) || (input.userId ?? 0) <= 0) {
    return {
      authorized: false,
      role: null,
      reason: "invalid_user_id",
      userId: null,
    };
  }

  const config = await loadConfig();
  const role = config.users.get(input.userId!);
  if (!role) {
    return {
      authorized: false,
      role: null,
      reason: "unauthorized_user",
      userId: input.userId!,
    };
  }

  const command = normalizeCommand(input.command);
  if (!command) {
    return {
      authorized: true,
      role,
      reason: "authorized",
      userId: input.userId!,
    };
  }

  const allowedRoles = COMMAND_PERMISSIONS[command];
  if (Array.isArray(allowedRoles) && !allowedRoles.includes(role)) {
    return {
      authorized: false,
      role,
      reason: "insufficient_role",
      userId: input.userId!,
    };
  }

  return {
    authorized: true,
    role,
    reason: "authorized",
    userId: input.userId!,
  };
}

