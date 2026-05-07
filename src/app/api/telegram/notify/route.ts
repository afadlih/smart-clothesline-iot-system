import { NextRequest, NextResponse } from "next/server";
import { TelegramBotApiService } from "@/services/TelegramBotApiService";

type NotifyPayload = {
  title?: string;
  description?: string;
  severity?: "critical" | "warning" | "info";
  timestamp?: number;
  alertKey?: string;
};

const severityIcon: Record<NonNullable<NotifyPayload["severity"]>, string> = {
  critical: "🔴",
  warning: "⚠️",
  info: "ℹ️",
};

function normalizeTimestamp(input?: number): number {
  if (typeof input !== "number" || !Number.isFinite(input)) {
    return Date.now();
  }

  let value = input;
  // Handle epoch seconds input.
  if (value > 0 && value < 1_000_000_000_000) {
    value *= 1000;
  }

  // Guard against unrealistic dates (older than 2020 or > year 2100).
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
  const when = new Date(timestamp).toLocaleString("en-US", {
    hour12: false,
    timeZone: "Asia/Jakarta",
  });
  const icon = severityIcon[severity] ?? "⚠️";

  return `${icon} ${title}\n${description}\nTime: ${when}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as NotifyPayload;
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!token || !chatId) {
      return NextResponse.json(
        { ok: false, skipped: true, reason: "Telegram env is not configured" },
        { status: 200 },
      );
    }

    const text = toTelegramMessage(body);
    const sent = await TelegramBotApiService.sendMessage(token, chatId, text);

    if (!sent) {
      return NextResponse.json({ ok: false, error: "Failed to send Telegram notification" }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
