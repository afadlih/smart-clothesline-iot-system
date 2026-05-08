import { NextRequest, NextResponse } from "next/server";
import { TelegramBotApiService } from "@/services/TelegramBotApiService";
import { TelegramOpsService } from "@/services/TelegramOpsService";
import { TelegramEnvConfigService } from "@/services/telegram/TelegramEnvConfigService";
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

// Server-side cooldown to deduplicate alerts across browser tabs
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
  return Date.now() - (getCooldownMap().get(alertKey) ?? 0) < NOTIFY_COOLDOWN_MS;
}
function recordCooldown(alertKey: string): void {
  getCooldownMap().set(alertKey, Date.now());
}

function normalizeTimestamp(input?: number): number {
  if (typeof input !== "number" || !Number.isFinite(input)) return Date.now();
  let v = input;
  if (v > 0 && v < 1_000_000_000_000) v *= 1000;
  if (v < 1_577_836_800_000 || v > 4_102_444_800_000) return Date.now();
  return Math.floor(v);
}

function toTelegramMessage(payload: NotifyPayload): string {
  const title = payload.title?.trim() || "Operational Alert";
  const desc = payload.description?.trim() || "-";
  const severity = payload.severity ?? "warning";
  const when = formatDateTime(normalizeTimestamp(payload.timestamp));
  return `${severityLabel[severity] ?? "[WARNING]"} ${title}\n${desc}\nTime: ${when}`;
}

async function getTelemetryContext() {
  try {
    const q = query(collection(db, "sensor_data"), orderBy("createdAt", "desc"), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const d = snap.docs[0].data() as Record<string, unknown>;
    const ts = normalizeTimestamp(
      typeof d.timestamp === "number" ? d.timestamp : typeof d.createdAt === "number" ? d.createdAt : undefined,
    );
    return {
      deviceStatus: typeof d.status === "string" ? d.status : "UNKNOWN",
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

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as NotifyPayload;
    const alertKey = body.alertKey || `${body.severity ?? "warning"}-${body.title ?? "alert"}`;

    if (isInCooldown(alertKey)) {
      return NextResponse.json({ ok: true, skipped: true, reason: "cooldown", cooldownMs: NOTIFY_COOLDOWN_MS });
    }

    // ── Env-first for token and chatId ────────────────────────────────────────
    const token = TelegramEnvConfigService.getBotToken();
    const chatId = TelegramEnvConfigService.getDefaultChatId();
    const groupModeEnabled = TelegramEnvConfigService.isGroupModeEnabled();
    const envGroupIds = TelegramEnvConfigService.getAllowedGroupIds();

    // ── Optional Firestore supplement for group targets ────────────────────────
    let firestoreGroupIds: number[] = [];
    try {
      const config = await TelegramOpsService.getConfig();
      if (config?.groupModeEnabled && Array.isArray(config.authorizedGroups)) {
        firestoreGroupIds = config.authorizedGroups
          .map((g) => g.groupId)
          .filter((id) => Number.isInteger(id));
      }
    } catch {
      // Firestore unavailable — env values are sufficient
    }

    if (!token || !chatId) {
      return NextResponse.json(
        { ok: false, skipped: true, reason: "Telegram not configured (missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID)" },
        { status: 200 },
      );
    }

    // Build target list: primary chatId + group targets (deduped)
    const allGroupIds = groupModeEnabled
      ? [...new Set([...envGroupIds, ...firestoreGroupIds])]
      : [];
    const targets = [...new Set([chatId, ...allGroupIds.map(String)])].filter(Boolean);

    const ctx = await getTelemetryContext();
    const text = [
      toTelegramMessage(body),
      "",
      "Realtime Context",
      ctx
        ? [
            `Device: ${ctx.deviceStatus}`,
            `Rain: ${ctx.rain}`,
            `Temperature: ${ctx.temperature}`,
            `Humidity: ${ctx.humidity}`,
            `Light: ${ctx.light}`,
            `Delay: ${ctx.delaySec}`,
          ].join("\n")
        : "Telemetry unavailable",
    ].join("\n");

    let sentCount = 0;
    for (const target of targets) {
      const sent = await TelegramBotApiService.sendMessage(token, target as string | number, text);
      if (sent) sentCount++;
    }

    if (sentCount === 0) {
      return NextResponse.json({ ok: false, error: "Failed to send Telegram notification" }, { status: 502 });
    }

    recordCooldown(alertKey);
    return NextResponse.json({ ok: true, sentCount });
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
