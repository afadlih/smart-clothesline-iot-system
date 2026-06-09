import { NextRequest, NextResponse } from "next/server";
import {
  TelegramNotificationService,
  TelegramMessageSchema,
} from "@/services/telegram/TelegramNotificationService";
import { z } from "zod";

export const dynamic = "force-dynamic";

const MAX_TITLE_LENGTH = 120;
const MAX_DESCRIPTION_LENGTH = 1500;
const MAX_RECOMMENDED_ACTION_LENGTH = 500;

// Zod Schema for the Standard Input as backup validation
const StandardNotificationSchema = z.object({
  title: z.string().min(1, "title is required").max(MAX_TITLE_LENGTH),
  description: z.string().min(1, "description is required").max(MAX_DESCRIPTION_LENGTH),
  severity: z.enum(["critical", "warning", "info"]).optional(),
  type: z.enum([
    "rain_detected",
    "device_offline",
    "telemetry_stale",
    "dry_candidate",
    "config_sync_failed",
    "system_health",
    "hadoop_batch_report",
    "custom",
  ]).optional(),
  timestamp: z.number().optional(),
  alertKey: z.string().optional(),
  deviceId: z.string().optional(),
  source: z.enum(["dashboard", "sensor", "mqtt", "firebase", "system", "hadoop", "manual"]).optional(),
  recommendedAction: z.string().max(MAX_RECOMMENDED_ACTION_LENGTH).optional(),
  dashboardPath: z.string().optional(),
  includeTelemetryContext: z.boolean().optional(),
  metadata: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null(), z.undefined()])).optional(),
});

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

  // Determine if it is a Raw/Retry/Test notification or a Standard notification
  const isRaw = "chatId" in body || "message" in body || "notificationType" in body;

  if (isRaw) {
    try {
      // Validate using the TelegramMessageSchema
      const validated = TelegramMessageSchema.parse({
        message: body.message,
        chatId: body.chatId,
        notificationType: body.notificationType,
      });

      const result = await TelegramNotificationService.sendRawNotification(validated);
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
    } catch (err) {
      if (err instanceof z.ZodError) {
        return NextResponse.json(
          { ok: false, error: "Validation failed", details: err.issues },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { ok: false, error: "Internal server error" },
        { status: 500 }
      );
    }
  }

  // Otherwise, fallback to Standard Notification format
  try {
    const validatedInput = StandardNotificationSchema.parse(body);

    const result = await TelegramNotificationService.sendNotification(validatedInput);

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
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { ok: false, error: "Validation failed", details: err.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
