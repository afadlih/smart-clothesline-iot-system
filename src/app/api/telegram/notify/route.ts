import { NextRequest, NextResponse } from "next/server";
import { TelegramBotApiService } from "@/services/TelegramBotApiService";
import { TelegramOpsService } from "@/services/TelegramOpsService";
import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { formatDateTime } from "@/utils/timeFormat";

type NotifyPayload = {
  title?: string;
  description?: string;
  severity?: "critical" | "warning" | "info";
  timestamp?: number;
  alertKey?: string;
};

const severityLabel: Record<NonNullable<NotifyPayload["severity"]>, string> = {
  critical: "[CRITICAL]",
  warning: "[WARNING]",
  info: "[INFO]",
};

// Server-side cooldown to deduplicate alerts when multiple browser tabs
// call this endpoint for the same alert condition.
const NOTIFY_COOLDOWN_MS = 30_000;
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
function isInCooldown(alertKey: string): boolean {
  const map = getCooldownMap();
  const lastSent = map.get(alertKey) ?? 0;
  return Date.now() - lastSent < NOTIFY_COOLDOWN_MS;
}
function recordCooldown(alertKey: string): void {
  getCooldownMap().set(alertKey, Date.now());
}

function normalizeTimestamp(input?: number): number {
  if (typeof input !== "number" || !Number.isFinite(input)) {
    return Date.now();
  }

  let value = input;
  if (value > 0 && value < 1_000_000_000_000) {
    value *= 1000;
  }

  if (value < 1_577_836_800_000 || value > 4_102_444_800_000) {
    return Date.now();
  }

  return Math.floor(value);
}

function toTelegramMessage(payload: NotifyPayload): string {
  const title = payload.title?.trim() || "Operational Alert";
  const description = payload.description?.trim() || "-";
  const severity = payload.severity ?? "warning";
  const timestamp = normalizeTimestamp(payload.timestamp);
  const when = formatDateTime(timestamp);
  const prefix = severityLabel[severity] ?? "[WARNING]";

  return `${prefix} ${title}\n${description}\nTime: ${when}`;
}

async function getTelemetryContext(): Promise<{
  deviceStatus: string;
  rain: string;
  temperature: string;
  humidity: string;
  light: string;
  delaySec: string;
}> {
  try {
    const q = query(collection(db, "sensor_data"), orderBy("createdAt", "desc"), limit(1));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      return {
        deviceStatus: "UNKNOWN",
        rain: "-",
        temperature: "-",
        humidity: "-",
        light: "-",
        delaySec: "-",
      };
    }
    const item = snapshot.docs[0].data() as Record<string, unknown>;
    const timestampRaw =
      typeof item.timestamp === "number"
        ? item.timestamp
        : typeof item.createdAt === "number"
          ? item.createdAt
          : Date.now();
    const timestamp = normalizeTimestamp(timestampRaw);
    const delaySec = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
    return {
      deviceStatus: typeof item.status === "string" ? item.status : "UNKNOWN",
      rain: Boolean(item.rain) ? "DETECTED" : "CLEAR",
      temperature: typeof item.temperature === "number" ? `${item.temperature.toFixed(1)} C` : "-",
      humidity: typeof item.humidity === "number" ? `${item.humidity.toFixed(1)} %` : "-",
      light: typeof item.light === "number" ? `${Math.round(item.light)}` : "-",
      delaySec: `${delaySec}s`,
    };
  } catch {
    return {
      deviceStatus: "UNKNOWN",
      rain: "-",
      temperature: "-",
      humidity: "-",
      light: "-",
      delaySec: "-",
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as NotifyPayload;

    // Server-side dedupe: skip if same alertKey was sent within cooldown window
    const alertKey = body.alertKey || `${body.severity ?? "warning"}-${body.title ?? "alert"}`;
    if (isInCooldown(alertKey)) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: "cooldown",
        cooldownMs: NOTIFY_COOLDOWN_MS,
      });
    }

    const config = await TelegramOpsService.getConfig();
    const token = config?.botToken || process.env.TELEGRAM_BOT_TOKEN;
    const chatId = config?.chatId || process.env.TELEGRAM_CHAT_ID;
    const groupTargets =
      config?.groupModeEnabled && Array.isArray(config.authorizedGroups)
        ? config.authorizedGroups
            .map((group) => group.groupId)
            .filter((groupId) => Number.isInteger(groupId))
        : [];

    if (!token || !chatId) {
      return NextResponse.json(
        { ok: false, skipped: true, reason: "Telegram env/config is not configured" },
        { status: 200 },
      );
    }

    const context = await getTelemetryContext();
    const text = [
      toTelegramMessage(body),
      "",
      "Realtime Context",
      `Device: ${context.deviceStatus}`,
      `Rain: ${context.rain}`,
      `Temperature: ${context.temperature}`,
      `Humidity: ${context.humidity}`,
      `Light: ${context.light}`,
      `Telemetry Delay: ${context.delaySec}`,
    ].join("\n");
    const targets = [
      chatId,
      ...groupTargets,
    ].filter((target, index, arr) => target && arr.indexOf(target) === index);
    let sentCount = 0;
    for (const target of targets) {
      const sent = await TelegramBotApiService.sendMessage(token, target as string | number, text);
      if (sent) sentCount += 1;
    }

    if (sentCount === 0) {
      return NextResponse.json({ ok: false, error: "Failed to send Telegram notification" }, { status: 502 });
    }

    // Record cooldown after a successful send
    recordCooldown(alertKey);

    return NextResponse.json({ ok: true, sentCount });
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
