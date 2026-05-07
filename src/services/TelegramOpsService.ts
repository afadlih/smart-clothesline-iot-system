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
import { db } from "@/lib/firebase";

const TELEGRAM_CONFIG_COLLECTION = "telegram_config";
const TELEGRAM_CONFIG_DOC = "global";
const TELEGRAM_COMMAND_COLLECTION = "telegram_commands";
const TELEGRAM_AUDIT_COLLECTION = "telegram_audit";

export type TelegramRole = "Viewer" | "Operator" | "Admin";

export type TelegramAuthorizedUser = {
  userId: number;
  username?: string;
  role: TelegramRole;
};

export type TelegramConfig = {
  botToken: string;
  webhookSecret: string;
  mode: "polling" | "webhook";
  enabled: boolean;
  chatId?: string;
  authorizedUsers: TelegramAuthorizedUser[];
  updatedAt?: unknown;
};

export type TelegramCommandJob = {
  id: string;
  command:
    | "/open"
    | "/close"
    | "/mode_auto"
    | "/mode_manual";
  status: "pending" | "processing" | "done" | "failed";
  source: "telegram";
  userId: number;
  username?: string;
  createdAt: number;
  updatedAt: number;
  result?: string;
};

function isCommandJobCommand(
  value: unknown,
): value is TelegramCommandJob["command"] {
  return value === "/open" || value === "/close" || value === "/mode_auto" || value === "/mode_manual";
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

    return {
      botToken: typeof value.botToken === "string" ? value.botToken : "",
      webhookSecret: typeof value.webhookSecret === "string" ? value.webhookSecret : "",
      mode: value.mode === "polling" ? "polling" : "webhook",
      enabled: Boolean(value.enabled),
      chatId: typeof value.chatId === "string" ? value.chatId : undefined,
      authorizedUsers,
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

  static async enqueueCommand(input: {
    command: TelegramCommandJob["command"];
    userId: number;
    username?: string;
  }): Promise<string> {
    const now = Date.now();
    const ref = await addDoc(collection(db, TELEGRAM_COMMAND_COLLECTION), {
      command: input.command,
      status: "pending",
      source: "telegram",
      userId: input.userId,
      username: input.username ?? null,
      createdAt: now,
      updatedAt: now,
    });
    return ref.id;
  }

  static async fetchPendingCommands(maxItems: number = 5): Promise<TelegramCommandJob[]> {
    let snapshot;
    try {
      const q = query(
        collection(db, TELEGRAM_COMMAND_COLLECTION),
        where("status", "==", "pending"),
        orderBy("createdAt", "asc"),
        limit(maxItems),
      );
      snapshot = await getDocs(q);
    } catch {
      const fallbackQuery = query(
        collection(db, TELEGRAM_COMMAND_COLLECTION),
        where("status", "==", "pending"),
        limit(Math.max(maxItems * 3, 20)),
      );
      snapshot = await getDocs(fallbackQuery);
    }
    const items: TelegramCommandJob[] = [];
    for (const item of snapshot.docs) {
      const value = item.data() as Partial<TelegramCommandJob>;
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
        userId: typeof value.userId === "number" ? value.userId : 0,
        username: typeof value.username === "string" ? value.username : undefined,
        createdAt: typeof value.createdAt === "number" ? value.createdAt : Date.now(),
        updatedAt: typeof value.updatedAt === "number" ? value.updatedAt : Date.now(),
        result: typeof value.result === "string" ? value.result : undefined,
      });
    }
    return items
      .sort((a, b) => a.createdAt - b.createdAt)
      .slice(0, maxItems);
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
}
