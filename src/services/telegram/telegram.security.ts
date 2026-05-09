import { logger } from "@/lib/logger";
import { TelegramOpsService, type TelegramRole as StoredRole } from "@/services/TelegramOpsService";
import { TelegramEnvConfigService } from "@/services/telegram/TelegramEnvConfigService";

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
  "/register_group": ["VIEWER", "OPERATOR", "ADMIN"],
};

type TelegramAuthConfig = {
  users: Map<number, TelegramRole>;
  groups: Set<number>;
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

/**
 * Load authorization config.
 *
 * Priority:
 *   1. Environment variables (always available, primary source)
 *   2. Firestore telegram_config (optional supplement — may be blocked by rules)
 *
 * If Firestore is unavailable or denied, env-based config is used.
 * Users from env receive ADMIN role. Users from Firestore keep their stored role.
 */
async function loadConfig(): Promise<TelegramAuthConfig> {
  const existing = globalThis.__telegramAuthConfig__;
  if (existing) return existing;

  const users = new Map<number, TelegramRole>();
  const groups = new Set<number>();

  // ── Env-first (primary, always works) ─────────────────────────────────────
  for (const userId of TelegramEnvConfigService.getAllowedUserIds()) {
    users.set(userId, "ADMIN");
  }
  for (const groupId of TelegramEnvConfigService.getAllowedGroupIds()) {
    groups.add(groupId);
  }

  // Operator IDs from optional TELEGRAM_OPERATOR_IDS env
  for (const id of TelegramEnvConfigService.getOperatorIds()) {
    if (!users.has(id)) {
      users.set(id, "OPERATOR");
    }
  }

  // ── Firestore supplement (optional, graceful fallback) ─────────────────────
  try {
    const storedConfig = await TelegramOpsService.getConfig();
    if (storedConfig?.authorizedUsers) {
      for (const item of storedConfig.authorizedUsers) {
        if (typeof item.userId !== "number" || !Number.isInteger(item.userId) || item.userId <= 0) continue;
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
  } catch (err) {
    // Firestore telegram_config denied by rules — env-only config is sufficient
    logger.warn("telegram", "Firestore config unavailable for auth — using env only", String(err));
  }

  const config: TelegramAuthConfig = {
    users,
    groups,
    loadedAt: Date.now(),
  };

  globalThis.__telegramAuthConfig__ = config;
  logger.info("telegram", "Loaded Telegram auth config", {
    totalUsers: users.size,
    totalGroups: groups.size,
    userIds: Array.from(users.keys()),
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
    return { authorized: false, role: null, reason: "invalid_user_id", userId: null };
  }

  const config = await loadConfig();
  const role = config.users.get(input.userId!);
  if (!role) {
    return { authorized: false, role: null, reason: "unauthorized_user", userId: input.userId! };
  }

  const command = normalizeCommand(input.command);
  if (!command) {
    return { authorized: true, role, reason: "authorized", userId: input.userId! };
  }

  const allowedRoles = COMMAND_PERMISSIONS[command];
  if (Array.isArray(allowedRoles) && !allowedRoles.includes(role)) {
    return { authorized: false, role, reason: "insufficient_role", userId: input.userId! };
  }

  return { authorized: true, role, reason: "authorized", userId: input.userId! };
}

export async function authorizeTelegramActor(input: {
  userId?: number;
  command?: string;
  chatId?: number;
  chatType?: "private" | "group" | "supergroup";
}): Promise<AuthorizationResult> {
  const base = await authorizeTelegramUser({ userId: input.userId, command: input.command });
  if (!base.authorized) return base;

  const isGroup = input.chatType === "group" || input.chatType === "supergroup";
  if (!isGroup) return base;

  // Group mode: env-first, Firestore supplement (all wrapped safely)
  let groupModeEnabled = TelegramEnvConfigService.isGroupModeEnabled();
  try {
    if (!groupModeEnabled) {
      const storedConfig = await TelegramOpsService.getConfig();
      groupModeEnabled = Boolean(storedConfig?.groupModeEnabled);
    }
  } catch {
    // Firestore unavailable — use env value already set above
  }

  if (!groupModeEnabled) {
    return { authorized: false, role: base.role, reason: "unauthorized_group", userId: base.userId };
  }

  const command = normalizeCommand(input.command);
  if (command === "/register_group") return base; // bypass group registration check

  const config = await loadConfig();
  if (typeof input.chatId === "number" && !config.groups.has(input.chatId)) {
    return { authorized: false, role: base.role, reason: "unauthorized_group", userId: base.userId };
  }

  return base;
}
