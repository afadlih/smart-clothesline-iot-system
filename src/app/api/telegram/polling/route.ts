import { NextResponse } from "next/server";
import { ensureTelegramPollingStarted, getTelegramPollingDiagnostics } from "@/lib/telegramSingleton";
import { TelegramEnvConfigService } from "@/services/telegram/TelegramEnvConfigService";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    if (TelegramEnvConfigService.getRuntimeMode() !== "polling") {
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: "Polling is disabled in this runtime mode",
        diagnostics: getTelegramPollingDiagnostics(),
      });
    }
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
