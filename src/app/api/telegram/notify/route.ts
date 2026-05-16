import { NextRequest, NextResponse } from "next/server";
import { TelegramNotificationService, TelegramNotificationInput } from "@/services/telegram/TelegramNotificationService";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as TelegramNotificationInput;
    
    // Basic validation
    if (!body.title || !body.description) {
      return NextResponse.json(
        { ok: false, error: "Missing required fields: title, description" },
        { status: 400 }
      );
    }

    const result = await TelegramNotificationService.sendNotification(body);

    if (result.skipped) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: result.reason,
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
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: String(error) },
      { status: 500 }
    );
  }
}

