import { NextRequest, NextResponse } from "next/server";
import { resolveAppBaseUrl, resolveTelegramWebhookUrl } from "@/services/telegram/TelegramWebhookUrlResolver";

export const dynamic = "force-dynamic";

/**
 * GET /api/telegram/webhook-self-test
 * 
 * Verifies that the webhook route is reachable from the public internet-ish context.
 * This does NOT call Telegram. It only confirms the deployment route is responding.
 */
export async function GET(request: NextRequest) {
  try {
    const appBaseUrl = resolveAppBaseUrl(request);
    const resolvedWebhookUrl = resolveTelegramWebhookUrl(request);
    const timestamp = Date.now();

    return NextResponse.json({
      ok: true,
      route: "/api/telegram/webhook-self-test",
      appBaseUrl,
      resolvedWebhookUrl,
      timestamp,
      info: "If you see this, your APP_BASE_URL is likely correct and the route is reachable."
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
