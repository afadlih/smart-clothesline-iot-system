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
    const secret = request.headers.get("x-internal-command-secret");
    const expectedSecret = process.env.INTERNAL_COMMAND_SECRET;

    if (!expectedSecret) {
      return NextResponse.json({ ok: false, error: "INTERNAL_COMMAND_SECRET not configured on server" }, { status: 500 });
    }

    if (!secret) {
      return NextResponse.json({ ok: false, error: "Missing x-internal-command-secret header" }, { status: 400 });
    }

    if (secret !== expectedSecret) {
      return NextResponse.json({ ok: false, error: "Invalid internal command secret" }, { status: 401 });
    }

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
