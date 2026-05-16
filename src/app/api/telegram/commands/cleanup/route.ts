import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      error: "Telegram command cleanup endpoint has been removed. Telegram is notification-only.",
    },
    { status: 410 }
  );
}
