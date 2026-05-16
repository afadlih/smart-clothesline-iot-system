import { NextRequest, NextResponse } from "next/server";
import { TelegramWebhookSyncService } from "@/services/telegram/TelegramWebhookSyncService";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const status = await TelegramWebhookSyncService.getStatus(request);
    return NextResponse.json(status);
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const result = await TelegramWebhookSyncService.sync({
      repair: body.repair ?? true,
      force: body.force ?? false,
      dropPendingUpdates: body.dropPendingUpdates ?? true,
      source: "sync-route"
    }, request);

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}

