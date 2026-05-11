import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { FirebaseError } from "firebase/app";
import { db } from "@/lib/firebase";
import { logger } from "@/lib/logger";
import { TelegramEnvConfigService } from "@/services/telegram/TelegramEnvConfigService";

const TELEGRAM_CONFIG_COLLECTION = "telegram_config";
const TELEGRAM_CONFIG_DOC = "global";
const TELEGRAM_COMMAND_COLLECTION = "telegram_commands";
const TELEGRAM_AUDIT_COLLECTION = "telegram_audit";

export const DEFAULT_TELEGRAM_COMMAND_TTL_MS = 2 * 60 * 1000;
export const DEFAULT_TELEGRAM_COMMAND_MAX_AGE_MS = 5 * 60 * 1000;
export const TELEGRAM_BRIDGE_MAX_COMMANDS_PER_TICK = 2;

export type TelegramRole = "Viewer" | "Operator" | "Admin";

export type TelegramAuthorizedUser = {
  userId: number;
  username?: string;
  role: TelegramRole;
};

export type TelegramAuthorizedGroup = {
  groupId: number;
  title?: string;
  type?: "group" | "supergroup";
};

export type TelegramConfig = {
  botToken: string;
  webhookSecret: string;
  mode: "polling" | "webhook";
  enabled: boolean;
  chatId?: string;
  authorizedUsers: TelegramAuthorizedUser[];
  authorizedGroups?: TelegramAuthorizedGroup[];
  groupModeEnabled?: boolean;
  updatedAt?: unknown;
};

export type TelegramCommandJob = {
  id: string;
  command:
    | "/open"
    | "/close"
    | "/mode_auto"
    | "/mode_manual"
    | "/restart";
  status: "pending" | "processing" | "done" | "failed";
  source: "telegram";
  chatId?: number;
  userId: number;
  username?: string;
  createdAt: number;
  updatedAt: number;
  expiresAt?: number;
  dispatchMode?: "bridge-fallback" | "server-direct";
  attemptCount?: number;
  directDispatchAt?: number;
  directDispatchResult?: string;
  result?: string;
};

function isCommandJobCommand(
  value: unknown,
): value is TelegramCommandJob["command"] {
  return value === "/open" || value === "/close" || value === "/mode_auto" || value === "/mode_manual" || value === "/restart";
}

export class TelegramOpsService {
  static async getConfig(): Promise<TelegramConfig | null> {
    const snapshot = await getDoc(doc(db, TELEGRAM_CONFIG_COLLECTION, TELEGRAM_CONFIG_DOC));
    if (!snapshot.exists()) return null;
    const value = snapshot.data() as Partial<TelegramConfig>;
    const authorizedUsers: TelegramAuthorizedUser[] = [];
    if (Array.isArray(value.authorizedUsers)) {
      for (const item of value.authorizedUsers) {
        const candidate = item as Partial<TelegramAuthorizedUser>;
        if (typeof candidate.userId !== "number") continue;
        authorizedUsers.push({
          userId: candidate.userId,
          username: typeof candidate.username === "string" ? candidate.username : undefined,
          role:
            candidate.role === "Admin" || candidate.role === "Operator" || candidate.role === "Viewer"
              ? candidate.role
              : "Viewer",
        });
      }
    }

    const authorizedGroups: TelegramAuthorizedGroup[] = [];
    if (Array.isArray(value.authorizedGroups)) {
      for (const item of value.authorizedGroups) {
        const candidate = item as Partial<TelegramAuthorizedGroup>;
        if (typeof candidate.groupId !== "number") continue;
        authorizedGroups.push({
          groupId: candidate.groupId,
          title: typeof candidate.title === "string" ? candidate.title : undefined,
          type: candidate.type === "supergroup" ? "supergroup" : "group",
        });
      }
    }

    return {
      botToken: typeof value.botToken === "string" ? value.botToken : "",
      webhookSecret: typeof value.webhookSecret === "string" ? value.webhookSecret : "",
      mode: value.mode === "polling" ? "polling" : "webhook",
      enabled: Boolean(value.enabled),
      chatId: typeof value.chatId === "string" ? value.chatId : undefined,
      authorizedUsers,
      authorizedGroups,
      groupModeEnabled: Boolean(value.groupModeEnabled),
      updatedAt: value.updatedAt,
    };
  }

  static async saveConfig(config: Omit<TelegramConfig, "updatedAt">): Promise<void> {
    await setDoc(
      doc(db, TELEGRAM_CONFIG_COLLECTION, TELEGRAM_CONFIG_DOC),
      {
        ...config,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  }

  static async recordCommandResult(input: {
    command: TelegramCommandJob["command"];
    status: "done" | "failed";
    chatId?: number;
    userId: number;
    username?: string;
    result: string;
    dispatchMode: "server-direct" | "bridge-fallback";
  }): Promise<string> {
    try {
      const now = Date.now();
      const ref = await addDoc(collection(db, TELEGRAM_COMMAND_COLLECTION), {
        command: input.command,
        status: input.status,
        source: "telegram",
        chatId: typeof input.chatId === "number" ? input.chatId : null,
        userId: input.userId,
        username: input.username ?? null,
        createdAt: now,
        updatedAt: now,
        result: input.result,
        dispatchMode: input.dispatchMode,
        directDispatchAt: input.dispatchMode === "server-direct" ? now : null,
        directDispatchResult: input.dispatchMode === "server-direct" ? input.result : null,
      });
      return ref.id;
    } catch (error) {
      logger.error("telegram", "Failed to record command result", error);
      throw error;
    }
  }

  static async enqueueCommand(input: {
    command: TelegramCommandJob["command"];
    chatId?: number;
    userId: number;
    username?: string;
  }): Promise<string> {
    try {
      const now = Date.now();
      const ref = await addDoc(collection(db, TELEGRAM_COMMAND_COLLECTION), {
        command: input.command,
        status: "pending",
        source: "telegram",
        chatId: typeof input.chatId === "number" ? input.chatId : null,
        userId: input.userId,
        username: input.username ?? null,
        createdAt: now,
        updatedAt: now,
        expiresAt: now + TelegramEnvConfigService.getCommandTtlMs(),
        dispatchMode: "bridge-fallback",
        attemptCount: 0,
      });
      return ref.id;
    } catch (error) {
      if (error instanceof FirebaseError) {
        if (error.code.includes("permission-denied")) {
          throw new Error("Firestore permission denied");
        }
        if (error.code.includes("invalid-argument")) {
          throw new Error("Command schema rejected");
        }
      }
      throw new Error("Command queue unavailable");
    }
  }

  static async fetchPendingCommands(maxItems: number = 5): Promise<TelegramCommandJob[]> {
    const safeMax = Math.min(maxItems, 5);
    const now = Date.now();
    const minCreatedAt = now - TelegramEnvConfigService.getCommandMaxAgeMs();

    let snapshot;
    try {
      const q = query(
        collection(db, TELEGRAM_COMMAND_COLLECTION),
        where("status", "==", "pending"),
        where("createdAt", ">=", minCreatedAt),
        orderBy("createdAt", "asc"),
        limit(safeMax),
      );
      snapshot = await getDocs(q);
    } catch {
      // Fallback if index missing or other error
      const fallbackQuery = query(
        collection(db, TELEGRAM_COMMAND_COLLECTION),
        where("status", "==", "pending"),
        limit(20),
      );
      snapshot = await getDocs(fallbackQuery);
    }

    const items: TelegramCommandJob[] = [];
    for (const item of snapshot.docs) {
      const value = item.data() as Partial<TelegramCommandJob>;
      
      // Client side filter to be sure
      const createdAt = typeof value.createdAt === "number" ? value.createdAt : 0;
      if (createdAt < minCreatedAt) continue;
      
      const expiresAt = typeof value.expiresAt === "number" ? value.expiresAt : 0;
      if (expiresAt > 0 && expiresAt < now) continue;

      if (!isCommandJobCommand(value.command)) {
        continue;
      }

      items.push({
        id: item.id,
        command: value.command,
        status:
          value.status === "processing" ||
          value.status === "done" ||
          value.status === "failed" ||
          value.status === "pending"
            ? value.status
            : "pending",
        source: "telegram",
        chatId: typeof value.chatId === "number" ? value.chatId : undefined,
        userId: typeof value.userId === "number" ? value.userId : 0,
        username: typeof value.username === "string" ? value.username : undefined,
        createdAt: createdAt || Date.now(),
        updatedAt: typeof value.updatedAt === "number" ? value.updatedAt : Date.now(),
        expiresAt: value.expiresAt,
        dispatchMode: value.dispatchMode,
        attemptCount: value.attemptCount,
        result: typeof value.result === "string" ? value.result : undefined,
      });
    }
    return items
      .sort((a, b) => a.createdAt - b.createdAt)
      .slice(0, safeMax);
  }

  static async expireStalePendingCommands(options?: { maxAgeMs?: number }): Promise<number> {
    const now = Date.now();
    const maxAge = options?.maxAgeMs ?? TelegramEnvConfigService.getCommandMaxAgeMs();
    const minCreatedAt = now - maxAge;

    const q = query(
      collection(db, TELEGRAM_COMMAND_COLLECTION),
      where("status", "==", "pending"),
      limit(50),
    );

    const snapshot = await getDocs(q);
    let expiredCount = 0;

    for (const item of snapshot.docs) {
      const value = item.data() as Partial<TelegramCommandJob>;
      const createdAt = typeof value.createdAt === "number" ? value.createdAt : 0;
      const expiresAt = typeof value.expiresAt === "number" ? value.expiresAt : 0;

      const isStaleByAge = createdAt > 0 && createdAt < minCreatedAt;
      const isStaleByExpiry = expiresAt > 0 && expiresAt < now;

      if (isStaleByAge || isStaleByExpiry) {
        if (expiredCount >= 100) break;
        await updateDoc(item.ref, {
          status: "failed",
          result: "Command expired before dispatch",
          updatedAt: now,
        });
        expiredCount++;
      }
    }

    return expiredCount;
  }

  static async inspectStalePendingCommands(options?: { maxAgeMs?: number }): Promise<{
    scannedCount: number;
    expiredCount: number;
    sampleIds: string[];
  }> {
    const now = Date.now();
    const maxAge = options?.maxAgeMs ?? TelegramEnvConfigService.getCommandMaxAgeMs();
    const minCreatedAt = now - maxAge;

    const q = query(
      collection(db, TELEGRAM_COMMAND_COLLECTION),
      where("status", "==", "pending"),
      limit(200),
    );

    const snapshot = await getDocs(q);
    let expiredCount = 0;
    const sampleIds: string[] = [];

    for (const item of snapshot.docs) {
      const value = item.data() as Partial<TelegramCommandJob>;
      const createdAt = typeof value.createdAt === "number" ? value.createdAt : 0;
      const expiresAt = typeof value.expiresAt === "number" ? value.expiresAt : 0;

      const isStaleByAge = createdAt > 0 && createdAt < minCreatedAt;
      const isStaleByExpiry = expiresAt > 0 && expiresAt < now;

      if (isStaleByAge || isStaleByExpiry) {
        expiredCount++;
        if (sampleIds.length < 5) sampleIds.push(item.id);
      }
    }

    return {
      scannedCount: snapshot.size,
      expiredCount,
      sampleIds,
    };
  }

  static async markCommandStatus(
    id: string,
    status: TelegramCommandJob["status"],
    result?: string,
  ): Promise<void> {
    await updateDoc(doc(db, TELEGRAM_COMMAND_COLLECTION, id), {
      status,
      result: result ?? null,
      updatedAt: Date.now(),
    });
  }

  static async addAuditLog(input: {
    userId?: number;
    username?: string;
    command: string;
    result: "success" | "failed" | "blocked" | "pending";
    detail: string;
    source: "telegram-webhook" | "telegram-bridge";
  }): Promise<void> {
    await addDoc(collection(db, TELEGRAM_AUDIT_COLLECTION), {
      ...input,
      timestamp: Date.now(),
    });
  }

  static async getRecentAuditLogs(maxItems: number = 20): Promise<
    Array<{
      id: string;
      command: string;
      result: string;
      detail: string;
      timestamp: number;
      username?: string;
    }>
  > {
    const q = query(collection(db, TELEGRAM_AUDIT_COLLECTION), orderBy("timestamp", "desc"), limit(maxItems));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((item) => {
      const value = item.data() as Record<string, unknown>;
      return {
        id: item.id,
        command: typeof value.command === "string" ? value.command : "unknown",
        result: typeof value.result === "string" ? value.result : "unknown",
        detail: typeof value.detail === "string" ? value.detail : "-",
        timestamp: typeof value.timestamp === "number" ? value.timestamp : Date.now(),
        username: typeof value.username === "string" ? value.username : undefined,
      };
    });
  }

  static async getDiagnosticsSnapshot() {
    const now = Date.now();
    const minCreatedAt = now - TelegramEnvConfigService.getCommandMaxAgeMs();

    const allPending = await getDocs(query(
      collection(db, TELEGRAM_COMMAND_COLLECTION),
      where("status", "==", "pending"),
      limit(100)
    ));

    let staleCount = 0;
    let oldestAgeMs = 0;

    for (const d of allPending.docs) {
      const data = d.data() as Partial<TelegramCommandJob>;
      const createdAt = data.createdAt ?? 0;
      if (createdAt > 0) {
        if (createdAt < minCreatedAt) staleCount++;
        const age = now - createdAt;
        if (age > oldestAgeMs) oldestAgeMs = age;
      }
    }

    return {
      pendingCount: allPending.size,
      stalePendingCount: staleCount,
      oldestPendingAgeMs: oldestAgeMs,
      commandTtlMs: TelegramEnvConfigService.getCommandTtlMs(),
      commandMaxAgeMs: TelegramEnvConfigService.getCommandMaxAgeMs(),
    };
  }

  static async cleanupAllPending(options?: { reason?: string }): Promise<number> {
    const now = Date.now();
    const reason = options?.reason ?? "Manual cleanup triggered";

    const q = query(
      collection(db, TELEGRAM_COMMAND_COLLECTION),
      where("status", "==", "pending"),
      limit(200)
    );

    const snapshot = await getDocs(q);
    let count = 0;

    for (const d of snapshot.docs) {
      await updateDoc(d.ref, {
        status: "failed",
        result: reason,
        updatedAt: now,
      });
      count++;
    }

    return count;
  }
}
