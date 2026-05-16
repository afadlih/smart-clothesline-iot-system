import { NextResponse } from "next/server";

function gone() {
  return NextResponse.json(
    {
      ok: false,
      error: "Telegram command cleanup endpoint has been removed. Telegram is notification-only.",
    },
    { status: 410 }
  );
}

export async function GET() {
  return gone();
}

export async function POST() {
  return gone();
}
