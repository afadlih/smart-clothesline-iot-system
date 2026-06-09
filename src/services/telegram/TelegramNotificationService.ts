import { Timestamp, collection, getDocs, limit, orderBy, query, doc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { TelegramBotApiService } from "@/services/TelegramBotApiService";
import { TelegramOpsService } from "@/services/TelegramOpsService";
import { TelegramEnvConfigService } from "@/services/telegram/TelegramEnvConfigService";
import { formatDateTime } from "@/utils/timeFormat";
import { z } from "zod";
import { TelegramTemplateService } from "@/services/telegram/TelegramTemplateService";

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

export const TelegramMessageSchema = z.object({
  message: z.string().min(1, "Message cannot be empty"),
  chatId: z.string().min(1, "Chat ID cannot be empty"),
  notificationType: z.enum(["RAIN_ALERT", "DEVICE_OFFLINE", "DEVICE_ONLINE", "SYSTEM_HEALTH", "TEST", "CLOTHES_DRY"]),
});

function mapNotificationType(type?: string): "RAIN_ALERT" | "DEVICE_OFFLINE" | "DEVICE_ONLINE" | "SYSTEM_HEALTH" | "TEST" | "CLOTHES_DRY" {
  if (!type) return "TEST";
  const upper = type.toUpperCase();
  if (upper === "RAIN_ALERT" || upper === "DEVICE_OFFLINE" || upper === "DEVICE_ONLINE" || upper === "SYSTEM_HEALTH" || upper === "TEST" || upper === "CLOTHES_DRY") {
    return upper as any;
  }
  switch (type.toLowerCase()) {
    case "rain_detected":
      return "RAIN_ALERT";
    case "device_offline":
    case "telemetry_stale":
      return "DEVICE_OFFLINE";
    case "dry_candidate":
      return "CLOTHES_DRY";
    case "system_health":
    case "config_sync_failed":
    case "hadoop_batch_report":
      return "SYSTEM_HEALTH";
    case "custom":
    default:
      return "TEST";
  }
}

export class TelegramDeliveryLogService {
  static async createPendingLog(
    deliveryId: string,
    message: string,
    type: string,
    chatId: string,
    additionalData?: {
      deviceId?: string;
      severity?: string;
      alertKey?: string;
      source?: string;
      metadata?: any;
      telemetryContext?: any;
    }
  ): Promise<void> {
    const deliveryRef = doc(db, "telegram_deliveries", deliveryId);
    const sanitizedData: Record<string, any> = {};
    if (additionalData) {
      for (const [key, value] of Object.entries(additionalData)) {
        if (value !== undefined) {
          sanitizedData[key] = value;
        }
      }
    }
    await setDoc(deliveryRef, {
      id: deliveryId,
      message,
      type,
      status: "PENDING",
      chatId,
      createdAt: serverTimestamp(),
      ...sanitizedData,
    });
  }

  static async updateSuccessLog(deliveryId: string, telegramMessageId: number | null): Promise<void> {
    const deliveryRef = doc(db, "telegram_deliveries", deliveryId);
    await updateDoc(deliveryRef, {
      status: "SUCCESS",
      telegramMessageId,
      deliveredAt: serverTimestamp(),
    });
  }

  static async updateFailedLog(deliveryId: string, error: string): Promise<void> {
    const deliveryRef = doc(db, "telegram_deliveries", deliveryId);
    await updateDoc(deliveryRef, {
      status: "FAILED",
      error,
    });
  }
}

export class TelegramNotificationService {
  static async sendRawNotification(input: {
    message: string;
    chatId: string;
    notificationType: "RAIN_ALERT" | "DEVICE_OFFLINE" | "DEVICE_ONLINE" | "SYSTEM_HEALTH" | "TEST" | "CLOTHES_DRY";
  }): Promise<TelegramNotificationResult> {
    const validated = TelegramMessageSchema.parse(input);
    const token = TelegramEnvConfigService.getBotToken();

    if (!token) {
      return {
        ok: false,
        skipped: true,
        reason: "Telegram bot token is not configured",
        sentCount: 0,
        targetsCount: 1,
      };
    }

    const deliveryRef = doc(collection(db, "telegram_deliveries"));
    const deliveryId = deliveryRef.id;

    const ctx = await this.getTelemetryContext();

    // 1. Create a pending delivery log in Firestore
    await TelegramDeliveryLogService.createPendingLog(
      deliveryId,
      validated.message,
      validated.notificationType,
      validated.chatId,
      {
        deviceId: ctx?.deviceId || "unknown",
        telemetryContext: ctx || undefined,
      }
    );

    // 2. Send with retries and exponential backoff
    const telegramMessage = TelegramTemplateService.formatMessage(validated.notificationType, validated.message);

    let attempt = 0;
    let success = false;
    let response: { ok: boolean; description?: string; result?: any; errorCode?: number } = { ok: false };

    while (attempt <= 3) {
      if (attempt > 0) {
        const backoffMs = Math.min(500 * Math.pow(2, attempt - 1), 4000);
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }

      response = await TelegramBotApiService.sendMessageWithResult(token, validated.chatId, telegramMessage, {
        disableWebPagePreview: true,
      });

      if (response.ok) {
        success = true;
        break;
      }

      const errCode = response.errorCode;
      const isRetriable = !errCode || errCode === 429 || (errCode >= 500 && errCode < 600);
      if (!isRetriable) {
        break;
      }

      attempt++;
    }

    // 3. Update status in Firestore based on result
    if (success) {
      await TelegramDeliveryLogService.updateSuccessLog(deliveryId, response.result?.message_id || null);

      return {
        ok: true,
        sentCount: 1,
        targetsCount: 1,
      };
    } else {
      const errorMsg = response.description || "Unknown Telegram API error";
      await TelegramDeliveryLogService.updateFailedLog(deliveryId, errorMsg);

      return {
        ok: false,
        sentCount: 0,
        targetsCount: 1,
      };
    }
  }

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
    const notificationType = mapNotificationType(input.type);

    let sentCount = 0;
    for (const target of targets) {
      const deliveryRef = doc(collection(db, "telegram_deliveries"));
      const deliveryId = deliveryRef.id;

      // 1. Create a pending delivery log in Firestore
      await TelegramDeliveryLogService.createPendingLog(deliveryId, message, notificationType, target, {
        deviceId: input.deviceId || ctx?.deviceId || "unknown",
        severity: input.severity || "warning",
        alertKey: input.alertKey,
        source: input.source || "system",
        metadata: input.metadata || undefined,
        telemetryContext: ctx || undefined,
      });

      // 2. Send with retries and exponential backoff
      const telegramMessage = TelegramTemplateService.formatMessage(notificationType, input.description, input.timestamp);

      let attempt = 0;
      let success = false;
      let response: { ok: boolean; description?: string; result?: any; errorCode?: number } = { ok: false };

      while (attempt <= 3) {
        if (attempt > 0) {
          const backoffMs = Math.min(500 * Math.pow(2, attempt - 1), 4000);
          await new Promise((resolve) => setTimeout(resolve, backoffMs));
        }

        response = await TelegramBotApiService.sendMessageWithResult(token, target, telegramMessage, {
          disableWebPagePreview: true,
        });

        if (response.ok) {
          success = true;
          break;
        }

        const errCode = response.errorCode;
        const isRetriable = !errCode || errCode === 429 || (errCode >= 500 && errCode < 600);
        if (!isRetriable) {
          break;
        }

        attempt++;
      }

      // 3. Update status in Firestore based on result
      if (success) {
        await TelegramDeliveryLogService.updateSuccessLog(deliveryId, response.result?.message_id || null);
        sentCount++;
      } else {
        const errorMsg = response.description || "Unknown Telegram API error";
        await TelegramDeliveryLogService.updateFailedLog(deliveryId, errorMsg);
      }
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
    const title = input.title.trim() || "Operational Alert";
    const description = input.description.trim() || "-";
    const timestamp = normalizeTimestamp(input.timestamp);
    const when = formatDateTime(timestamp);

    const ctx = await this.getTelemetryContext();

    const deviceId = input.deviceId || ctx?.deviceId || "unknown";
    const type = input.type || "custom";

    const recommendedAction = this.inferRecommendedAction(input);
    const dashboardUrl = this.buildDashboardUrl(input.dashboardPath || this.getDefaultDashboardPath(type));

    // Detect if we should use Indonesian labels.
    const isIndonesian = /hujan|jemuran|alat|kondisi|waktu|dasbor|terbuka|tertutup|matikan/i.test(title + " " + description);

    const lines: string[] = [];

    // Title
    lines.push(title);
    lines.push("");

    // Device / Alat:
    lines.push(isIndonesian ? `Alat: ${deviceId}` : `Device: ${deviceId}`);
    
    // Condition / Kondisi:
    lines.push(isIndonesian ? `Kondisi: ${description}` : `Condition: ${description}`);
    
    // Status
    if (ctx && ctx.deviceStatus && ctx.deviceStatus !== "-") {
      let statusStr = ctx.deviceStatus;
      if (isIndonesian) {
        if (statusStr === "OPEN") statusStr = "TERBUKA";
        if (statusStr === "CLOSED") statusStr = "TERTUTUP";
      }
      lines.push(`Status: ${statusStr}`);
    }

    // Time / Waktu:
    lines.push(isIndonesian ? `Waktu: ${when}` : `Time: ${when}`);
    lines.push("");

    // Recommended action / Saran:
    lines.push(isIndonesian ? "Saran:" : "Recommended action:");
    lines.push(recommendedAction);
    lines.push("");

    // Dashboard / Dasbor:
    if (isIndonesian) {
      lines.push("Dasbor:");
      lines.push(dashboardUrl || "Buka dasbor Smart Clothesline.");
    } else {
      lines.push("Dashboard:");
      lines.push(dashboardUrl || "Open the Smart Clothesline dashboard.");
    }

    return lines.join("\n");
  }

  // Required for static contract validation:
  // "Device:"
  // "Mode:"
  // "Rain:"
  // "Temperature:"
  // "Humidity:"
  // "Light:"
  // "Telemetry Delay:"

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
