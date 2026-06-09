import { NextRequest, NextResponse } from "next/server";
import { TelegramWebhookHealth } from "@/services/telegram/TelegramWebhookHealth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const health = await TelegramWebhookHealth.check(request);
    return NextResponse.json(health);
  } catch (error) {
    return NextResponse.json(
      {
        healthy: false,
        expectedUrl: "",
        actualUrl: "",
        mismatchReason: String(error),
        status: "Disconnected",
      },
      { status: 500 }
    );
  }
}
