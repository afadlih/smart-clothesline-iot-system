import { NextRequest, NextResponse } from "next/server";
import {
  TelegramNotificationService,
  TelegramNotificationInput,
  TelegramNotificationSeverity,
  TelegramNotificationType,
} from "@/services/telegram/TelegramNotificationService";

const MAX_TITLE_LENGTH = 120;
const MAX_DESCRIPTION_LENGTH = 1500;
const MAX_RECOMMENDED_ACTION_LENGTH = 500;

const ALLOWED_SEVERITIES: Set<string> = new Set(["critical", "warning", "info"]);
const ALLOWED_TYPES: Set<string> = new Set([
  "rain_detected",
  "device_offline",
  "telemetry_stale",
  "dry_candidate",
  "config_sync_failed",
  "system_health",
  "hadoop_batch_report",
  "custom",
]);

export async function POST(request: NextRequest) {
  let body: Record<string, unknown> = {};
  try {
    const rawBody = await request.json();
    if (rawBody && typeof rawBody === "object") {
      body = rawBody as Record<string, unknown>;
    }
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON" },
      { status: 400 }
    );
  }

  // Extract and validate fields
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";

  if (!title || !description) {
    return NextResponse.json(
      { ok: false, error: "Missing required fields: title, description" },
      { status: 400 }
    );
  }

  // Validate severity if provided
  if (body.severity !== undefined) {
    if (typeof body.severity !== "string" || !ALLOWED_SEVERITIES.has(body.severity)) {
      return NextResponse.json(
        { ok: false, error: `Invalid severity: ${body.severity}` },
        { status: 400 }
      );
    }
  }

  // Validate type if provided
  if (body.type !== undefined) {
    if (typeof body.type !== "string" || !ALLOWED_TYPES.has(body.type)) {
      return NextResponse.json(
        { ok: false, error: `Invalid type: ${body.type}` },
        { status: 400 }
      );
    }
  }

  // Trim and truncate long values
  const truncatedTitle = title.length > MAX_TITLE_LENGTH ? title.substring(0, MAX_TITLE_LENGTH) : title;
  const truncatedDescription =
    description.length > MAX_DESCRIPTION_LENGTH ? description.substring(0, MAX_DESCRIPTION_LENGTH) : description;

  let recommendedAction: string | undefined;
  if (typeof body.recommendedAction === "string") {
    const trimmed = body.recommendedAction.trim();
    recommendedAction = trimmed.length > MAX_RECOMMENDED_ACTION_LENGTH
      ? trimmed.substring(0, MAX_RECOMMENDED_ACTION_LENGTH)
      : trimmed;
  }

  let metadata: Record<string, string | number | boolean | null | undefined> | undefined;
  if (body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata)) {
    metadata = body.metadata as Record<string, string | number | boolean | null | undefined>;
  }

  const payload: TelegramNotificationInput = {
    title: truncatedTitle,
    description: truncatedDescription,
    severity: typeof body.severity === "string" ? (body.severity as TelegramNotificationSeverity) : undefined,
    type: typeof body.type === "string" ? (body.type as TelegramNotificationType) : undefined,
    timestamp: typeof body.timestamp === "number" ? body.timestamp : undefined,
    alertKey: typeof body.alertKey === "string" ? body.alertKey : undefined,
    deviceId: typeof body.deviceId === "string" ? body.deviceId : undefined,
    source: typeof body.source === "string" ? (body.source as TelegramNotificationInput["source"]) : undefined,
    recommendedAction,
    dashboardPath: typeof body.dashboardPath === "string" ? body.dashboardPath : undefined,
    includeTelemetryContext: typeof body.includeTelemetryContext === "boolean" ? body.includeTelemetryContext : undefined,
    metadata,
  };

  try {
    const result = await TelegramNotificationService.sendNotification(payload);

    if (result.skipped) {
      return NextResponse.json({
        ok: result.ok,
        skipped: true,
        reason: result.reason,
        sentCount: result.sentCount,
        targetsCount: result.targetsCount,
      });
    }

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: "Failed to send notification" },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      sentCount: result.sentCount,
      targetsCount: result.targetsCount,
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
