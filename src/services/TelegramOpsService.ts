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
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { logger } from "@/lib/logger";

const TELEGRAM_CONFIG_COLLECTION = "telegram_config";
const TELEGRAM_CONFIG_DOC = "global";
const TELEGRAM_AUDIT_COLLECTION = "telegram_audit";

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

  static async addAuditLog(input: {
    userId?: number;
    username?: string;
    command: string;
    result: "success" | "failed" | "blocked" | "pending";
    detail: string;
    source: "telegram-webhook" | "telegram-bridge" | "telegram-setup";
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

