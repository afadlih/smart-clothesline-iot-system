import { NextRequest, NextResponse } from "next/server";
import { doc, getDoc } from "firebase/firestore";
import { TelegramEnvConfigService } from "@/services/telegram/TelegramEnvConfigService";
import { TelegramBotApiService } from "@/services/TelegramBotApiService";
import { type TelegramCommandJob } from "@/services/TelegramOpsService";
import { logger } from "@/lib/logger";
import { db } from "@/lib/firebase";

type CommandResultPayload = {
  commandId: string;
  result: "done" | "failed" | "pending";
  message?: string;
};

function isStrictRuntime(): boolean {
  return process.env.VERCEL_ENV === "production" || process.env.VERCEL_ENV === "preview";
}

function parsePayload(input: unknown): CommandResultPayload | null {
  if (!input || typeof input !== "object") return null;
  const body = input as Record<string, unknown>;
  if (typeof body.commandId !== "string" || body.commandId.trim().length === 0) return null;
  if (body.result !== "done" && body.result !== "failed" && body.result !== "pending") return null;
  if (body.message !== undefined && typeof body.message !== "string") return null;
  if (typeof body.message === "string" && body.message.length > 500) return null;

  return {
    commandId: body.commandId.trim(),
    result: body.result,
    message: typeof body.message === "string" ? body.message.trim() : undefined,
  };
}

function resolveAllowedOrigins(request: NextRequest): string[] {
  const allowed = new Set<string>();
  const configuredBase = process.env.APP_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  if (configuredBase) {
    try {
      allowed.add(new URL(configuredBase).origin);
    } catch {
      logger.warn("telegram", "Invalid APP_BASE_URL for origin check");
    }
  }

  const host = request.headers.get("host");
  if (host) {
    const proto = request.headers.get("x-forwarded-proto") ?? "https";
    allowed.add(`${proto}://${host}`);
  }
  return [...allowed];
}

function isAllowedOrigin(request: NextRequest): boolean {
  if (!isStrictRuntime()) return true;

  const origin = request.headers.get("origin");
  if (!origin) return false;

  return resolveAllowedOrigins(request).includes(origin);
}

export async function POST(request: NextRequest) {
  try {
    if (!isAllowedOrigin(request)) {
      return NextResponse.json({ ok: false, error: "Forbidden origin" }, { status: 403 });
    }

    const payload = parsePayload(await request.json().catch(() => null));
    if (!payload) {
      return NextResponse.json({ ok: false, error: "Invalid request body" }, { status: 400 });
    }

    const commandRef = doc(db, "telegram_commands", payload.commandId);
    const commandSnap = await getDoc(commandRef);
    if (!commandSnap.exists()) {
      return NextResponse.json({ ok: false, error: "Command not found" }, { status: 404 });
    }

    const commandData = commandSnap.data() as TelegramCommandJob;
    if (!commandData.chatId) {
      return NextResponse.json({ ok: true, skipped: "No chatId associated with command" });
    }

    const botToken = TelegramEnvConfigService.getBotToken();
    if (!botToken) {
      return NextResponse.json({ ok: true, skipped: "Bot token not configured" });
    }

    const statusPrefix =
      payload.result === "done"
        ? "[OK]"
        : payload.result === "failed"
          ? "[FAILED]"
          : "[PENDING]";

    const statusText =
      payload.result === "done"
        ? "executed successfully"
        : payload.result === "failed"
          ? "failed"
          : "pending";

    const lines = [
      `${statusPrefix} Command ${statusText}: ${commandData.command}`,
      payload.message ? `Detail: ${payload.message}` : null,
      `Reference: ${payload.commandId}`,
    ].filter(Boolean);

    await TelegramBotApiService.sendMessage(botToken, commandData.chatId, lines.join("\n"));
    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error("telegram", "Failed to send command result notification", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
