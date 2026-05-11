import mqtt from "mqtt";
import { logger } from "@/lib/logger";

const ENV = {
  get brokerUrl() { return process.env.MQTT_BROKER_URL; },
  get username() { return process.env.MQTT_USERNAME; },
  get password() { return process.env.MQTT_PASSWORD; },
  get commandTopic() { 
    return process.env.MQTT_TOPIC_COMMAND || process.env.NEXT_PUBLIC_MQTT_TOPIC_COMMAND || "smart-clothesline/command"; 
  },
  get targetDeviceId() { return process.env.MQTT_TARGET_DEVICE_ID; }
};

export type ServerCommandInput = {
  command: "OPEN" | "CLOSE" | "AUTO" | "MANUAL" | "RESTART";
  requestedBy: "telegram";
  sourceCommand: "/open" | "/close" | "/mode_auto" | "/mode_manual" | "/restart";
  chatId?: number;
  userId?: number;
  username?: string;
};

export type ServerCommandResult = {
  ok: boolean;
  mode: "server-direct";
  topic: string;
  command: string;
  detail: string;
  error?: string;
};

function maskBrokerUrl(url: string | undefined): string {
  if (!url) return "unconfigured";
  try {
    const parsed = new URL(url);
    if (parsed.password) {
      parsed.password = "***";
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

export function isServerMqttCommandPublisherConfigured(): boolean {
  if (typeof window !== "undefined") return false;
  return Boolean(ENV.brokerUrl && ENV.username && ENV.password);
}

export function getServerMqttCommandPublisherStatus() {
  return {
    configured: isServerMqttCommandPublisherConfigured(),
    brokerUrlMasked: maskBrokerUrl(ENV.brokerUrl),
    hasUsername: Boolean(ENV.username),
    hasPassword: Boolean(ENV.password),
    commandTopic: ENV.commandTopic,
    targetDeviceId: ENV.targetDeviceId || null,
  };
}

export async function publishDeviceCommand(input: ServerCommandInput): Promise<ServerCommandResult> {
  if (typeof window !== "undefined") {
    throw new Error("ServerMqttCommandPublisher cannot run in the browser.");
  }

  const brokerUrl = ENV.brokerUrl;
  const username = ENV.username;
  const password = ENV.password;
  const commandTopic = ENV.commandTopic;
  const targetDeviceId = ENV.targetDeviceId;

  if (!brokerUrl || !username || !password) {
    return {
      ok: false,
      mode: "server-direct",
      topic: commandTopic,
      command: input.command,
      detail: "Direct MQTT is not fully configured on the server.",
      error: "Missing MQTT_BROKER_URL, MQTT_USERNAME, or MQTT_PASSWORD",
    };
  }

  const payload: Record<string, unknown> = {
    command: input.command,
    source: "telegram-server",
    sourceCommand: input.sourceCommand,
    requestedAt: Date.now(),
  };

  if (targetDeviceId) {
    payload.deviceId = targetDeviceId;
  }

  return new Promise((resolve) => {
    logger.info("mqtt", "Connecting to MQTT broker for direct command publish", {
      url: maskBrokerUrl(brokerUrl),
      topic: commandTopic,
    });

    const client = mqtt.connect(brokerUrl, {
      username,
      password,
      reconnectPeriod: 0,
      connectTimeout: 8000,
      clean: true,
    });

    const cleanup = () => {
      try {
        if (client.connected) {
          client.end(true);
        } else {
          client.end();
        }
      } catch {
        // Ignore cleanup errors
      }
    };

    const timeout = setTimeout(() => {
      cleanup();
      resolve({
        ok: false,
        mode: "server-direct",
        topic: commandTopic,
        command: input.command,
        detail: "Direct MQTT publish timed out.",
        error: "Connection or publish timeout after 8000ms",
      });
    }, 8000);

    client.on("error", (err) => {
      clearTimeout(timeout);
      cleanup();
      logger.error("mqtt", "Server MQTT command publish error", err.message);
      resolve({
        ok: false,
        mode: "server-direct",
        topic: commandTopic,
        command: input.command,
        detail: "Direct MQTT connection error.",
        error: err.message,
      });
    });

    client.on("connect", () => {
      const message = JSON.stringify(payload);
      client.publish(commandTopic, message, { qos: 1 }, (err) => {
        clearTimeout(timeout);
        cleanup();
        
        if (err) {
          logger.error("mqtt", "Failed to publish direct command", err.message);
          resolve({
            ok: false,
            mode: "server-direct",
            topic: commandTopic,
            command: input.command,
            detail: "Direct MQTT publish failed.",
            error: err.message,
          });
        } else {
          logger.info("mqtt", "Published direct command to MQTT", {
            topic: commandTopic,
            command: input.command,
          });
          resolve({
            ok: true,
            mode: "server-direct",
            topic: commandTopic,
            command: input.command,
            detail: "Dispatched directly to MQTT from server.",
          });
        }
      });
    });
  });
}
