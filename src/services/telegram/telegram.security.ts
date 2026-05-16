import { logger } from "@/lib/logger";
import { TelegramOpsService, type TelegramRole as StoredRole } from "@/services/TelegramOpsService";
import { TelegramEnvConfigService } from "@/services/telegram/TelegramEnvConfigService";

export type TelegramRole = "VIEWER" | "OPERATOR" | "ADMIN";

export type AuthorizationResult = {
  authorized: boolean;
  role: TelegramRole | null;
  reason: "authorized" | "unauthorized_user" | "invalid_user_id" | "unauthorized_group";
  userId: number | null;
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

async function loadConfig(): Promise<TelegramAuthConfig> {
  const existing = globalThis.__telegramAuthConfig__;
  if (existing) return existing;

  const users = new Map<number, TelegramRole>();
  const groups = new Set<number>();

  for (const groupId of TelegramEnvConfigService.getAllowedGroupIds()) {
    groups.add(groupId);
  }


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
    logger.warn("telegram", "Firestore config unavailable for auth — using env only", String(err));
  }

  const config: TelegramAuthConfig = {
    users,
    groups,
    loadedAt: Date.now(),
  };

  globalThis.__telegramAuthConfig__ = config;
  return config;
}

export function resetTelegramAuthConfigCache(): void {
  globalThis.__telegramAuthConfig__ = undefined;
}

export async function authorizeTelegramUser(input: {
  userId?: number;
}): Promise<AuthorizationResult> {
  if (!Number.isInteger(input.userId) || (input.userId ?? 0) <= 0) {
    return { authorized: false, role: null, reason: "invalid_user_id", userId: null };
  }

  const config = await loadConfig();
  const role = config.users.get(input.userId!);
  if (!role) {
    return { authorized: false, role: null, reason: "unauthorized_user", userId: input.userId! };
  }

  return { authorized: true, role, reason: "authorized", userId: input.userId! };
}

export async function authorizeTelegramActor(input: {
  userId?: number;
  chatId?: number;
  chatType?: "private" | "group" | "supergroup";
}): Promise<AuthorizationResult> {
  const base = await authorizeTelegramUser({ userId: input.userId });
  if (!base.authorized) return base;

  const isGroup = input.chatType === "group" || input.chatType === "supergroup";
  if (!isGroup) return base;

  let groupModeEnabled = TelegramEnvConfigService.isGroupModeEnabled();
  try {
    if (!groupModeEnabled) {
      const storedConfig = await TelegramOpsService.getConfig();
      groupModeEnabled = Boolean(storedConfig?.groupModeEnabled);
    }
  } catch {
    // ignore
  }

  if (!groupModeEnabled) {
    return { authorized: false, role: base.role, reason: "unauthorized_group", userId: base.userId };
  }

  const config = await loadConfig();
  if (typeof input.chatId === "number" && !config.groups.has(input.chatId)) {
    return { authorized: false, role: base.role, reason: "unauthorized_group", userId: base.userId };
  }

  return base;
}

