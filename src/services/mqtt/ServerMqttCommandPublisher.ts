import mqtt from "mqtt";
import { doc, getDoc } from "firebase/firestore";
import { logger } from "@/lib/logger";
import { db } from "@/lib/firebase";

const LEGACY_COMMAND_TOPIC = "smart-clothesline/command";
const ACTIVE_DEVICE_SETTINGS_DOC = "active_device";

const ENV = {
  get brokerUrl() { return process.env.MQTT_BROKER_URL; },
  get username() { return process.env.MQTT_USERNAME; },
  get password() { return process.env.MQTT_PASSWORD; },
  get commandTopic() {
    return process.env.MQTT_TOPIC_COMMAND || process.env.NEXT_PUBLIC_MQTT_TOPIC_COMMAND || LEGACY_COMMAND_TOPIC;
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

type ActiveCommandDevice = {
  deviceId: string;
  source?: "esp32" | "wokwi";
  deviceName?: string;
};

type CommandTargetResolution = {
  deviceId: string | null;
  source: "iot-hub-active-device" | "env-fallback" | null;
  activeDevice: ActiveCommandDevice | null;
};

function maskBrokerUrl(url: string | undefined): string {
  if (!url) return "unconfigured";
  try {
    const parsed = new URL(url);
    if (parsed.username) parsed.username = "masked";
    if (parsed.password) parsed.password = "***";
    return parsed.toString();
  } catch {
    return url.replace(/\/\/([^:]+):([^@]+)@/, "//masked:***@");
  }
}

async function resolveActiveCommandDevice(): Promise<ActiveCommandDevice | null> {
  try {
    const snapshot = await getDoc(doc(db, "system_settings", ACTIVE_DEVICE_SETTINGS_DOC));
    if (!snapshot.exists()) return null;

    const data = snapshot.data() as Record<string, unknown>;
    if (typeof data.deviceId !== "string" || data.deviceId.trim().length === 0) return null;

    return {
      deviceId: data.deviceId.trim(),
      source: data.source === "wokwi" ? "wokwi" : "esp32",
      deviceName: typeof data.deviceName === "string" ? data.deviceName : undefined,
    };
  } catch (error) {
    logger.warn("mqtt", "Failed to resolve active command device from IoT Hub settings", error);
    return null;
  }
}

async function resolveCommandTarget(): Promise<CommandTargetResolution> {
  const activeDevice = await resolveActiveCommandDevice();

  if (activeDevice?.deviceId) {
    return {
      deviceId: activeDevice.deviceId,
      source: "iot-hub-active-device",
      activeDevice,
    };
  }

  const envTarget = ENV.targetDeviceId?.trim();
  if (envTarget) {
    return {
      deviceId: envTarget,
      source: "env-fallback",
      activeDevice: null,
    };
  }

  return {
    deviceId: null,
    source: null,
    activeDevice: null,
  };
}

export function resolveServerCommandTopic(configuredTopic: string, targetDeviceId?: string | null): string {
  const target = targetDeviceId?.trim();

  // Dashboard command path uses getDeviceCommandTopic(deviceId), which resolves
  // to smart-clothesline/{deviceId}/command. Server-side Telegram commands must
  // publish to that same topic so firmware only needs one command subscription.
  if (target) {
    return `smart-clothesline/${target}/command`;
  }

  return configuredTopic;
}

export function isServerMqttCommandPublisherConfigured(): boolean {
  if (typeof window !== "undefined") return false;
  return Boolean(ENV.brokerUrl && ENV.username && ENV.password);
}

export function getServerMqttCommandPublisherStatus() {
  const configuredCommandTopic = ENV.commandTopic;
  const fallbackTargetDeviceId = ENV.targetDeviceId || null;

  return {
    configured: isServerMqttCommandPublisherConfigured(),
    brokerUrlMasked: maskBrokerUrl(ENV.brokerUrl),
    hasUsername: Boolean(ENV.username),
    hasPassword: Boolean(ENV.password),
    commandTopic: resolveServerCommandTopic(configuredCommandTopic, fallbackTargetDeviceId),
    configuredCommandTopic,
    targetDeviceId: fallbackTargetDeviceId,
    targetSource: fallbackTargetDeviceId ? "env-fallback" : null,
  };
}

export async function getResolvedServerMqttCommandPublisherStatus() {
  const configuredCommandTopic = ENV.commandTopic;
  const target = await resolveCommandTarget();

  return {
    configured: isServerMqttCommandPublisherConfigured(),
    brokerUrlMasked: maskBrokerUrl(ENV.brokerUrl),
    hasUsername: Boolean(ENV.username),
    hasPassword: Boolean(ENV.password),
    commandTopic: resolveServerCommandTopic(configuredCommandTopic, target.deviceId),
    configuredCommandTopic,
    targetDeviceId: target.deviceId,
    targetSource: target.source,
    activeDevice: target.activeDevice,
  };
}

export async function publishDeviceCommand(input: ServerCommandInput): Promise<ServerCommandResult> {
  if (typeof window !== "undefined") {
    throw new Error("ServerMqttCommandPublisher cannot run in the browser.");
  }

  const brokerUrl = ENV.brokerUrl;
  const username = ENV.username;
  const password = ENV.password;
  const target = await resolveCommandTarget();
  const targetDeviceId = target.deviceId;
  const targetSource = target.source;
  const commandTopic = resolveServerCommandTopic(ENV.commandTopic, targetDeviceId);

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

  if (!targetDeviceId) {
    return {
      ok: false,
      mode: "server-direct",
      topic: commandTopic,
      command: input.command,
      detail: "Direct MQTT target device is not configured.",
      error: "No active IoT Hub command device and missing MQTT_TARGET_DEVICE_ID fallback",
    };
  }

  // Keep the published payload identical to the dashboard command contract.
  // Dashboard sendCommand publishes exactly: { deviceId, command }.
  const payload: Record<string, unknown> = {
    deviceId: targetDeviceId,
    command: input.command,
  };

  return new Promise((resolve) => {
    logger.info("mqtt", "Connecting to MQTT broker for direct command publish", {
      url: maskBrokerUrl(brokerUrl),
      topic: commandTopic,
      targetDeviceId,
      targetSource,
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
        if (client.connected) client.end(true);
        else client.end();
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
          return;
        }

        logger.info("mqtt", "Published direct command to MQTT", {
          topic: commandTopic,
          command: input.command,
          targetDeviceId,
          targetSource,
        });
        resolve({
          ok: true,
          mode: "server-direct",
          topic: commandTopic,
          command: input.command,
          detail: `Dispatched directly to MQTT from server using ${targetSource}.`,
        });
      });
    });
  });
}
