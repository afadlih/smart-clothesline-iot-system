import { Timestamp, collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { TelegramBotApiService } from "@/services/TelegramBotApiService";
import { TelegramOpsService } from "@/services/TelegramOpsService";
import { TelegramEnvConfigService } from "@/services/telegram/TelegramEnvConfigService";
import { formatDateTime } from "@/utils/timeFormat";

export type TelegramNotificationSeverity = "critical" | "warning" | "info";

export type TelegramNotificationInput = {
  title: string;
  description: string;
  severity?: TelegramNotificationSeverity;
  timestamp?: number;
  alertKey?: string;
  includeTelemetryContext?: boolean;
};

export type TelegramNotificationResult = {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  sentCount: number;
  targetsCount: number;
};

const SEVERITY_LABEL: Record<TelegramNotificationSeverity, string> = {
  critical: "[CRITICAL]",
  warning: "[WARNING]",
  info: "[INFO]",
};

const NOTIFY_COOLDOWN_MS = 30_000;

// Use globalThis for cooldown state to persist across HMR/reloads in dev
declare global {
  // eslint-disable-next-line no-var
  var __telegramNotifyCooldown__: Map<string, number> | undefined;
}

function getCooldownMap(): Map<string, number> {
  if (!globalThis.__telegramNotifyCooldown__) {
    globalThis.__telegramNotifyCooldown__ = new Map<string, number>();
  }
  return globalThis.__telegramNotifyCooldown__;
}

function normalizeTimestamp(input?: number): number {
  if (typeof input !== "number" || !Number.isFinite(input)) return Date.now();
  let v = input;
  // Handle seconds vs milliseconds
  if (v > 0 && v < 1_000_000_000_000) v *= 1000;
  // Basic range check (approx 2020 to 2100)
  if (v < 1_577_836_800_000 || v > 4_102_444_800_000) return Date.now();
  return Math.floor(v);
}

export class TelegramNotificationService {
  static async sendNotification(input: TelegramNotificationInput): Promise<TelegramNotificationResult> {
    const alertKey = input.alertKey || `${input.severity ?? "warning"}-${input.title}`;
    const cooldownMap = getCooldownMap();
    const last = cooldownMap.get(alertKey) ?? 0;

    if (Date.now() - last < NOTIFY_COOLDOWN_MS) {
      return {
        ok: true,
        skipped: true,
        reason: "cooldown",
        sentCount: 0,
        targetsCount: 0,
      };
    }

    const token = TelegramEnvConfigService.getBotToken();
    const defaultChatId = TelegramEnvConfigService.getDefaultChatId();

    if (!token || !defaultChatId) {
      return {
        ok: false,
        skipped: true,
        reason: "Telegram not configured (missing token or chat ID)",
        sentCount: 0,
        targetsCount: 0,
      };
    }

    const targets = await this.resolveTargets();
    const message = await this.buildMessage(input);

    let sentCount = 0;
    for (const target of targets) {
      const sent = await TelegramBotApiService.sendMessage(token, target, message);
      if (sent) sentCount++;
    }

    if (sentCount > 0) {
      cooldownMap.set(alertKey, Date.now());
    }

    return {
      ok: sentCount > 0,
      sentCount,
      targetsCount: targets.length,
    };
  }

  private static async resolveTargets(): Promise<string[]> {
    const defaultChatId = TelegramEnvConfigService.getDefaultChatId();
    const groupModeEnabled = TelegramEnvConfigService.isGroupModeEnabled();
    const envGroupIds = TelegramEnvConfigService.getAllowedGroupIds();

    let firestoreGroupIds: number[] = [];
    try {
      const config = await TelegramOpsService.getConfig();
      if (config?.groupModeEnabled && Array.isArray(config.authorizedGroups)) {
        firestoreGroupIds = config.authorizedGroups
          .map((g) => g.groupId)
          .filter((id) => Number.isInteger(id));
      }
    } catch {
      // ignore firestore error
    }

    const allGroupIds = groupModeEnabled
      ? [...new Set([...envGroupIds, ...firestoreGroupIds])]
      : [];
    
    const targets = [...new Set([defaultChatId, ...allGroupIds.map(String)])].filter(Boolean);
    return targets as string[];
  }

  private static async buildMessage(input: TelegramNotificationInput): Promise<string> {
    const severity = input.severity ?? "warning";
    const label = SEVERITY_LABEL[severity] || "[WARNING]";
    const title = input.title.trim() || "Operational Alert";
    const description = input.description.trim() || "-";
    const timestamp = normalizeTimestamp(input.timestamp);
    const when = formatDateTime(timestamp);

    const lines = [
      `${label} ${title}`,
      description,
      `Time: ${when}`,
    ];

    if (input.includeTelemetryContext !== false) {
      const ctx = await this.getTelemetryContext();
      if (ctx) {
        lines.push("");
        lines.push("Realtime Context");
        lines.push(`Device: ${ctx.deviceStatus}`);
        lines.push(`Mode: ${ctx.mode}`);
        lines.push(`State Source: ${ctx.source}`);
        lines.push(`Rain: ${ctx.rain}`);
        lines.push(`Temperature: ${ctx.temperature}`);
        lines.push(`Humidity: ${ctx.humidity}`);
        lines.push(`Light: ${ctx.light}`);
        lines.push(`Telemetry Delay: ${ctx.delaySec}`);
      } else {
        lines.push("");
        lines.push("Telemetry unavailable");
      }
    }

    return lines.join("\n");
  }

  private static async getTelemetryContext() {
    try {
      const q = query(collection(db, "sensor_data"), orderBy("createdAt", "desc"), limit(1));
      const snap = await getDocs(q);
      if (snap.empty) return null;
      
      const d = snap.docs[0].data() as Record<string, unknown>;
      const createdAtMs =
        d.createdAt && typeof d.createdAt === "object" && "toMillis" in d.createdAt
          ? (d.createdAt as Timestamp).toMillis()
          : null;
      
      const ts = normalizeTimestamp(
        typeof d.receivedAt === "number"
          ? d.receivedAt
          : typeof d.timestamp === "number"
            ? d.timestamp
            : createdAtMs ?? undefined,
      );

      return {
        deviceStatus: typeof d.status === "string" ? d.status : "UNKNOWN",
        mode: d.mode === "AUTO" || d.mode === "MANUAL" ? d.mode : "UNKNOWN",
        source: typeof d.source === "string" ? d.source : "UNKNOWN",
        rain: Boolean(d.rain) ? "DETECTED" : "CLEAR",
        temperature: typeof d.temperature === "number" ? `${d.temperature.toFixed(1)} C` : "-",
        humidity: typeof d.humidity === "number" ? `${d.humidity.toFixed(1)} %` : "-",
        light: typeof d.light === "number" ? `${Math.round(d.light)}` : "-",
        delaySec: `${Math.max(0, Math.floor((Date.now() - ts) / 1000))}s`,
      };
    } catch {
      return null;
    }
  }
}
