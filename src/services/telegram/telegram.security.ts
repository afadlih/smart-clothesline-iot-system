import { logger } from "@/lib/logger";
import { TelegramOpsService, type TelegramRole as StoredRole } from "@/services/TelegramOpsService";

export type TelegramRole = "VIEWER" | "OPERATOR" | "ADMIN";

export type AuthorizationResult = {
  authorized: boolean;
  role: TelegramRole | null;
  reason: "authorized" | "unauthorized_user" | "invalid_user_id" | "insufficient_role" | "unauthorized_group";
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
  "/ping": ["VIEWER", "OPERATOR", "ADMIN"],
  "/uptime": ["VIEWER", "OPERATOR", "ADMIN"],
  "/analytics": ["VIEWER", "OPERATOR", "ADMIN"],
  "/register_group": ["ADMIN"],
};

type TelegramAuthConfig = {
  users: Map<number, TelegramRole>;
  groups: Set<number>;
  operatorIds: Set<number>;
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

function parseAllowedIds(raw: string | undefined, options?: { allowNegative?: boolean }): number[] {
  if (!raw) return [];
  const allowNegative = Boolean(options?.allowNegative);
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .map((item) => Number(item))
    .filter((item) => {
      if (!Number.isInteger(item)) return false;
      if (allowNegative) return item !== 0;
      return item > 0;
    });
}

async function loadConfig(): Promise<TelegramAuthConfig> {
  const existing = globalThis.__telegramAuthConfig__;
  if (existing) return existing;

  const users = new Map<number, TelegramRole>();
  const groups = new Set<number>();
  const operators = new Set<number>();
  const fromEnv = parseAllowedIds(process.env.TELEGRAM_ALLOWED_USER_IDS ?? process.env.TELEGRAM_ALLOWED_USERS);
  for (const userId of fromEnv) {
    users.set(userId, "ADMIN");
  }
  for (const groupId of parseAllowedIds(process.env.TELEGRAM_ALLOWED_GROUPS, { allowNegative: true })) {
    groups.add(groupId);
  }
  for (const operatorId of parseAllowedIds(process.env.TELEGRAM_OPERATOR_IDS)) {
    operators.add(operatorId);
    if (!users.has(operatorId)) users.set(operatorId, "OPERATOR");
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
  if (storedConfig?.authorizedGroups) {
    for (const group of storedConfig.authorizedGroups) {
      if (typeof group.groupId === "number" && Number.isInteger(group.groupId)) {
        groups.add(group.groupId);
      }
    }
  }

  const config: TelegramAuthConfig = {
    users,
    groups,
    operatorIds: operators,
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
  const firstToken = clean.split(/\s+/)[0] ?? "";
  const [base] = firstToken.split("@");
  return base || null;
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

export async function authorizeTelegramActor(input: {
  userId?: number;
  command?: string;
  chatId?: number;
  chatType?: "private" | "group" | "supergroup";
}): Promise<AuthorizationResult> {
  const base = await authorizeTelegramUser({
    userId: input.userId,
    command: input.command,
  });
  if (!base.authorized) return base;

  const config = await loadConfig();
  const isGroup = input.chatType === "group" || input.chatType === "supergroup";
  if (isGroup) {
    // Config-first: use persisted groupModeEnabled from Firestore, env var is fallback only
    const storedConfig = await TelegramOpsService.getConfig();
    const allowGroupMode =
      Boolean(storedConfig?.groupModeEnabled) ||
      process.env.TELEGRAM_ENABLE_GROUP_MODE?.toLowerCase() === "true";

    if (!allowGroupMode) {
      return {
        authorized: false,
        role: base.role,
        reason: "unauthorized_group",
        userId: base.userId,
      };
    }
    const command = normalizeCommand(input.command);
    const canBypassGroupRegistration = command === "/register_group";
    if (!canBypassGroupRegistration && typeof input.chatId === "number" && !config.groups.has(input.chatId)) {
      return {
        authorized: false,
        role: base.role,
        reason: "unauthorized_group",
        userId: base.userId,
      };
    }
  }
  return base;
}

