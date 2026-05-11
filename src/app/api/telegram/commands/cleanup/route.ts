import { NextRequest, NextResponse } from "next/server";
import { TelegramOpsService } from "@/services/TelegramOpsService";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * POST /api/telegram/commands/cleanup
 * 
 * Securely clear the pending command queue.
 * Requires X-Internal-Secret header matching INTERNAL_COMMAND_SECRET.
 */
export async function POST(request: NextRequest) {
  try {
    const secret = process.env.INTERNAL_COMMAND_SECRET;
    const providedSecret = request.headers.get("X-Internal-Secret");

    if (!secret || providedSecret !== secret) {
      logger.warn("security", "Unauthorized cleanup attempt", {
        hasSecret: Boolean(secret),
        providedMatch: providedSecret === secret
      });
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const reason = body.reason || "Manual cleanup via API";
    const mode = body.mode || "stale"; // "stale" or "all"

    let clearedCount = 0;
    if (mode === "all") {
      clearedCount = await TelegramOpsService.cleanupAllPending({ reason });
    } else {
      clearedCount = await TelegramOpsService.expireStalePendingCommands();
    }

    logger.info("telegram", "Command queue cleanup executed", { mode, clearedCount, reason });

    return NextResponse.json({
      ok: true,
      clearedCount,
      mode,
      reason
    });
  } catch (error) {
    logger.error("telegram", "Cleanup endpoint failed", error);
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
