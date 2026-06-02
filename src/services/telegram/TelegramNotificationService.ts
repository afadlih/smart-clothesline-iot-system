import { Timestamp, collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { TelegramBotApiService } from "@/services/TelegramBotApiService";
import { TelegramOpsService } from "@/services/TelegramOpsService";
import { TelegramEnvConfigService } from "@/services/telegram/TelegramEnvConfigService";
import { formatDateTime } from "@/utils/timeFormat";

export type TelegramNotificationSeverity = "critical" | "warning" | "info";

export type TelegramNotificationType =
  | "rain_detected"
  | "device_offline"
  | "telemetry_stale"
  | "dry_candidate"
  | "config_sync_failed"
  | "system_health"
  | "hadoop_batch_report"
  | "custom";

export type TelegramNotificationInput = {
  title: string;
  description: string;
  severity?: TelegramNotificationSeverity;
  type?: TelegramNotificationType;
  timestamp?: number;
  alertKey?: string;
  deviceId?: string;
  source?: "dashboard" | "sensor" | "mqtt" | "firebase" | "system" | "hadoop" | "manual";
  recommendedAction?: string;
  dashboardPath?: string;
  includeTelemetryContext?: boolean;
  metadata?: Record<string, string | number | boolean | null | undefined>;
};

export type TelegramNotificationResult = {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  sentCount: number;
  targetsCount: number;
};

type TelemetryContext = {
  deviceId: string;
  deviceStatus: string;
  mode: string;
  source: string;
  rain: string;
  temperature: string;
  humidity: string;
  light: string;
  delaySec: string;
  timestamp?: number;
};

const DEFAULT_RECOMMENDED_ACTION: Record<TelegramNotificationType, string> = {
  rain_detected:
    "Open the dashboard to review the device and close the clothesline if needed.",
  device_offline:
    "Check device power, Wi-Fi/MQTT connection, and latest telemetry from the dashboard.",
  telemetry_stale:
    "Open the dashboard to verify whether the device is still online and sending sensor data.",
  dry_candidate:
    "Open the dashboard to confirm clothes condition before retracting or changing mode.",
  config_sync_failed:
    "Open the dashboard settings and verify device configuration sync status.",
  system_health:
    "Open the dashboard diagnostics page and review system health indicators.",
  hadoop_batch_report:
    "Open the Big Data analytics page to review Hadoop batch processing results.",
  custom:
    "Open the dashboard to review the latest device state.",
};

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
    const ctx = await this.getTelemetryContext();
    const cooldownKey = input.alertKey
      || `${input.type ?? "custom"}:${input.deviceId ?? ctx?.deviceId ?? "unknown"}:${input.severity ?? "warning"}:${input.title}`;

    const isCritical = input.severity === "critical";
    const cooldownMs = isCritical ? 5_000 : 30_000;

    const cooldownMap = getCooldownMap();
    const last = cooldownMap.get(cooldownKey) ?? 0;

    if (Date.now() - last < cooldownMs) {
      const token = TelegramEnvConfigService.getBotToken();
      const defaultChatId = TelegramEnvConfigService.getDefaultChatId();
      const targets = (!token || !defaultChatId) ? [] : await this.resolveTargets();

      return {
        ok: true,
        skipped: true,
        reason: "cooldown",
        sentCount: 0,
        targetsCount: targets.length,
      };
    }

    const token = TelegramEnvConfigService.getBotToken();
    const defaultChatId = TelegramEnvConfigService.getDefaultChatId();

    if (!token || !defaultChatId) {
      return {
        ok: false,
        skipped: true,
        reason: "Telegram not configured: missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID",
        sentCount: 0,
        targetsCount: 0,
      };
    }

    const targets = await this.resolveTargets();
    const message = await this.buildMessage(input);

    let sentCount = 0;
    for (const target of targets) {
      const sent = await TelegramBotApiService.sendMessage(token, target, message, {
        disableWebPagePreview: true,
      });
      if (sent) sentCount++;
    }

    if (sentCount > 0) {
      cooldownMap.set(cooldownKey, Date.now());
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
    const label = this.formatSeverityLabel(severity);
    const title = input.title.trim() || "Operational Alert";
    const description = input.description.trim() || "-";
    const timestamp = normalizeTimestamp(input.timestamp);
    const when = formatDateTime(timestamp);

    const ctx = await this.getTelemetryContext();

    const deviceId = input.deviceId || ctx?.deviceId || "unknown";
    const type = input.type || "custom";

    const recommendedAction = this.inferRecommendedAction(input);
    const dashboardUrl = this.buildDashboardUrl(input.dashboardPath || this.getDefaultDashboardPath(type));

    const lines: string[] = [];

    // [SEVERITY] Title
    lines.push(`${label} ${title}`);
    lines.push("");

    // Device:
    lines.push("Device:");
    lines.push(deviceId);
    lines.push("");

    // Event:
    lines.push("Event:");
    lines.push(`Type: ${this.formatTypeLabel(type)}`);
    lines.push(`Source: ${input.source || "system"}`);
    
    // Sanitize and append metadata if present
    const sanitizedMetadata = this.sanitizeMetadata(input.metadata);
    if (sanitizedMetadata.length > 0) {
      for (const [k, v] of sanitizedMetadata) {
        lines.push(`${k}: ${v}`);
      }
    }
    lines.push("");

    // Latest telemetry:
    lines.push("Latest telemetry:");
    if (input.includeTelemetryContext !== false && ctx) {
      lines.push(`Device Status: ${ctx.deviceStatus}`);
      lines.push(`Mode: ${ctx.mode}`);
      lines.push(`Rain: ${ctx.rain}`);
      lines.push(`Temperature: ${ctx.temperature}`);
      lines.push(`Humidity: ${ctx.humidity}`);
      lines.push(`Light: ${ctx.light}`);
      lines.push(`Telemetry Delay: ${ctx.delaySec}`);
      lines.push(`State Source: ${ctx.source}`);
    } else {
      lines.push("Telemetry unavailable");
    }
    lines.push("");

    // Reason:
    lines.push("Reason:");
    lines.push(description);
    lines.push("");

    // Recommended action:
    lines.push("Recommended action:");
    lines.push(recommendedAction);
    lines.push("");

    // Dashboard:
    lines.push("Dashboard:");
    if (dashboardUrl) {
      lines.push(dashboardUrl);
    } else {
      lines.push("Open the Smart Clothesline dashboard.");
    }
    lines.push("");

    // Time:
    lines.push("Time:");
    lines.push(when);
    lines.push("");

    // Alert key:
    lines.push("Alert key:");
    const alertKey = input.alertKey || `${type}:${deviceId}:${severity}:${input.title}`;
    lines.push(alertKey);

    return lines.join("\n");
  }

  private static inferRecommendedAction(input: TelegramNotificationInput): string {
    if (input.recommendedAction) {
      let action = input.recommendedAction;
      if (input.severity === "critical") {
        action = `Immediate attention recommended.\n${action}`;
      }
      return action;
    }

    const type = input.type || "custom";
    const defaultAction = DEFAULT_RECOMMENDED_ACTION[type] || DEFAULT_RECOMMENDED_ACTION.custom;
    
    if (input.severity === "critical") {
      return `Immediate attention recommended.\n${defaultAction}`;
    }
    return defaultAction;
  }

  private static buildDashboardUrl(path?: string): string | null {
    const baseUrl = process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL;
    if (!baseUrl) return null;

    const normalizedBase = baseUrl.replace(/\/+$/, "");
    const normalizedPath = path?.startsWith("/") ? path : `/${path || "dashboard"}`;

    return `${normalizedBase}${normalizedPath}`;
  }

  private static getDefaultDashboardPath(type: TelegramNotificationType): string {
    if (type === "system_health" || type === "config_sync_failed") {
      return "/dashboard?panel=diagnostics";
    }
    if (type === "hadoop_batch_report") {
      return "/big-data";
    }
    return "/dashboard";
  }

  private static sanitizeMetadata(metadata?: TelegramNotificationInput["metadata"]): Array<[string, string]> {
    if (!metadata || typeof metadata !== "object") return [];
    const forbiddenKeys = ["token", "password", "secret", "key", "auth", "credential", "private", "env"];
    const result: Array<[string, string]> = [];
    
    for (const [k, v] of Object.entries(metadata)) {
      const isForbidden = forbiddenKeys.some((f) => k.toLowerCase().includes(f));
      if (isForbidden) continue;
      if (v === null || v === undefined) continue;
      
      let valStr = String(v);
      if (valStr.length > 100) {
        valStr = valStr.substring(0, 100) + "...";
      }
      result.push([k, valStr]);
    }
    return result;
  }

  private static formatSeverityLabel(severity: TelegramNotificationSeverity): string {
    const SEVERITY_LABEL: Record<TelegramNotificationSeverity, string> = {
      critical: "[CRITICAL]",
      warning: "[WARNING]",
      info: "[INFO]",
    };
    return SEVERITY_LABEL[severity] || "[WARNING]";
  }

  private static formatTypeLabel(type?: TelegramNotificationType): string {
    if (!type) return "Custom";
    const TYPE_LABELS: Record<TelegramNotificationType, string> = {
      rain_detected: "Rain Detected",
      device_offline: "Device Offline",
      telemetry_stale: "Telemetry Stale",
      dry_candidate: "Dry Candidate",
      config_sync_failed: "Config Sync Failed",
      system_health: "System Health",
      hadoop_batch_report: "Hadoop Batch Report",
      custom: "Custom",
    };
    return TYPE_LABELS[type] || "Custom";
  }

  private static formatDelay(ms: number): string {
    if (ms < 0) return "0s";
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes < 60) {
      return `${minutes}m ${String(remainingSeconds).padStart(2, "0")}s`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${String(remainingMinutes).padStart(2, "0")}m`;
  }

  private static async getTelemetryContext(): Promise<TelemetryContext | null> {
    try {
      const q = query(collection(db, "sensor_data"), orderBy("createdAt", "desc"), limit(1));
      const snap = await getDocs(q);
      if (snap.empty) return null;
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const d = snap.docs[0].data() as Record<string, any>;
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

      const devId = d.deviceId ?? d.device_id ?? d.device;
      const statusVal = d.status ?? d.state ?? d.clotheslineStatus;
      const modeVal = d.mode ?? d.operationMode;
      const sourceVal = d.source ?? d.stateSource ?? d.state_source;

      const tempVal = d.temperature ?? d.temp;
      const humVal = d.humidity ?? d.hum;
      const lightVal = d.light ?? d.lightValue ?? d.ldr;

      let rainVal = "UNKNOWN";
      const rainRaw = d.rain ?? d.rainDetected ?? d.isRaining;
      if (rainRaw !== undefined && rainRaw !== null) {
        rainVal = Boolean(rainRaw) ? "DETECTED" : "CLEAR";
      }

      return {
        deviceId: devId ? String(devId) : "-",
        deviceStatus: statusVal ? String(statusVal).toUpperCase() : "-",
        mode: modeVal ? String(modeVal).toUpperCase() : "-",
        source: sourceVal ? String(sourceVal) : "-",
        rain: rainVal,
        temperature: typeof tempVal === "number" ? `${tempVal.toFixed(1)} C` : "-",
        humidity: typeof humVal === "number" ? `${humVal.toFixed(1)} %` : "-",
        light: typeof lightVal === "number" ? `${Math.round(lightVal)}` : "-",
        delaySec: this.formatDelay(Date.now() - ts),
        timestamp: ts,
      };
    } catch {
      return null;
    }
  }
}
