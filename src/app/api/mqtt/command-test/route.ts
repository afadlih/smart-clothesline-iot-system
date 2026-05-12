import { NextRequest, NextResponse } from "next/server";
import { publishDeviceCommand, isServerMqttCommandPublisherConfigured } from "@/services/mqtt/ServerMqttCommandPublisher";

const VALID_COMMANDS = new Set(["OPEN", "CLOSE", "AUTO", "MANUAL", "RESTART"]);

export async function POST(request: NextRequest) {
  const secretHeader = request.headers.get("x-internal-command-secret");
  const envSecret = process.env.INTERNAL_COMMAND_SECRET;

  if (!envSecret) {
    return NextResponse.json({ ok: false, error: "Server is missing INTERNAL_COMMAND_SECRET" }, { status: 400 });
  }

  if (secretHeader !== envSecret) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!isServerMqttCommandPublisherConfigured()) {
    return NextResponse.json({
      ok: false,
      published: false,
      detail: "ServerMqttCommandPublisher is not configured on this environment",
    }, { status: 400 });
  }

  try {
    const body = await request.json();
    if (!body || typeof body !== "object" || !body.command) {
      return NextResponse.json({ ok: false, error: "Missing command in body" }, { status: 400 });
    }

    const command = body.command as string;
    if (!VALID_COMMANDS.has(command)) {
      return NextResponse.json({ ok: false, error: "Invalid command" }, { status: 400 });
    }

    let sourceCommand: string;
    switch(command) {
        case "OPEN": sourceCommand = "/open"; break;
        case "CLOSE": sourceCommand = "/close"; break;
        case "AUTO": sourceCommand = "/mode_auto"; break;
        case "MANUAL": sourceCommand = "/mode_manual"; break;
        case "RESTART": sourceCommand = "/restart"; break;
        default: sourceCommand = "/status"; break;
    }

    const result = await publishDeviceCommand({
      command: command as "OPEN" | "CLOSE" | "AUTO" | "MANUAL" | "RESTART",
      requestedBy: "telegram",
      sourceCommand: sourceCommand as "/open" | "/close" | "/mode_auto" | "/mode_manual" | "/restart",
      username: "api-test",
    });

    if (result.ok) {
      return NextResponse.json({
        ok: true,
        published: true,
        topic: result.topic,
        command: result.command,
        detail: "Command published through server-side MQTT",
      });
    } else {
      return NextResponse.json({
        ok: false,
        published: false,
        detail: result.detail || result.error,
      });
    }
  } catch {
    return NextResponse.json({
      ok: false,
      published: false,
      detail: "Internal server error",
    }, { status: 500 });
  }
}
