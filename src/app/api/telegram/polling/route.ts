import { NextResponse } from "next/server";
import { ensureTelegramPollingStarted, getTelegramPollingDiagnostics } from "@/lib/telegramSingleton";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const boot = await ensureTelegramPollingStarted();
    return NextResponse.json({
      ok: true,
      boot,
      diagnostics: getTelegramPollingDiagnostics(),
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
