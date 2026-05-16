import mqtt from "mqtt";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { logger } from "@/lib/logger";

const LEGACY_COMMAND_TOPIC = "smart-clothesline/command";
const ACTIVE_DEVICE_DOC = "active_device";

type DeviceCommand = "OPEN" | "CLOSE" | "AUTO" | "MANUAL" | "RESTART";

type TargetResolution = {
  deviceId: string | null;
  source: "iot-hub-active-device" | "env-fallback" | "legacy-global-fallback";
};

export type TelegramMqttCommandResult = {
  ok: boolean;
  topic: string;
  command: DeviceCommand;
  targetDeviceId: string | null;
  targetSource: TargetResolution["source"];
  detail: string;
  error?: string;
};

function getBrokerUrl() {
  return process.env.MQTT_BROKER_URL;
}

function getMqttUser() {
  return process.env.MQTT_USERNAME;
}

function getMqttSecret() {
  return process.env.MQTT_PASSWORD;
}

function getConfiguredTopic() {
  return process.env.MQTT_TOPIC_COMMAND || process.env.NEXT_PUBLIC_MQTT_TOPIC_COMMAND || LEGACY_COMMAND_TOPIC;
}

function getEnvTargetDeviceId() {
  return process.env.MQTT_TARGET_DEVICE_ID?.trim() || null;
}

async function resolveTarget(): Promise<TargetResolution> {
  try {
    const snapshot = await getDoc(doc(db, "system_settings", ACTIVE_DEVICE_DOC));
    if (snapshot.exists()) {
      const data = snapshot.data() as Record<string, unknown>;
      if (typeof data.deviceId === "string" && data.deviceId.trim()) {
        return { deviceId: data.deviceId.trim(), source: "iot-hub-active-device" };
      }
    }
  } catch (error) {
    logger.warn("mqtt", "Unable to read active IoT Hub device for Telegram command", error);
  }

  const envDeviceId = getEnvTargetDeviceId();
  if (envDeviceId) {
    return { deviceId: envDeviceId, source: "env-fallback" };
  }

  return { deviceId: null, source: "legacy-global-fallback" };
}

function resolveTopic(targetDeviceId: string | null) {
  if (targetDeviceId) return `smart-clothesline/${targetDeviceId}/command`;
  return getConfiguredTopic();
}

export function isTelegramMqttCommandPublisherConfigured() {
  return Boolean(getBrokerUrl() && getMqttUser() && getMqttSecret());
}

export async function getTelegramMqttCommandPublisherStatus() {
  const target = await resolveTarget();
  return {
    configured: isTelegramMqttCommandPublisherConfigured(),
    commandTopic: resolveTopic(target.deviceId),
    configuredCommandTopic: getConfiguredTopic(),
    targetDeviceId: target.deviceId,
    targetSource: target.source,
  };
}

export async function publishTelegramDeviceCommand(command: DeviceCommand): Promise<TelegramMqttCommandResult> {
  const brokerUrl = getBrokerUrl();
  const username = getMqttUser();
  const secret = getMqttSecret();
  const target = await resolveTarget();
  const topic = resolveTopic(target.deviceId);

  if (!brokerUrl || !username || !secret) {
    return {
      ok: false,
      topic,
      command,
      targetDeviceId: target.deviceId,
      targetSource: target.source,
      detail: "Direct MQTT is not configured.",
      error: "Missing MQTT_BROKER_URL, MQTT_USERNAME, or MQTT_PASSWORD",
    };
  }

  const payload = target.deviceId ? { deviceId: target.deviceId, command } : { command };

  return new Promise((resolve) => {
    const client = mqtt.connect(brokerUrl, {
      username,
      password: secret,
      reconnectPeriod: 0,
      connectTimeout: 8000,
      clean: true,
    });

    const finish = (result: TelegramMqttCommandResult) => {
      try { client.end(true); } catch { /* noop */ }
      resolve(result);
    };

    const timeout = setTimeout(() => {
      finish({
        ok: false,
        topic,
        command,
        targetDeviceId: target.deviceId,
        targetSource: target.source,
        detail: "Direct MQTT publish timed out.",
        error: "timeout",
      });
    }, 8000);

    client.on("error", (error) => {
      clearTimeout(timeout);
      finish({
        ok: false,
        topic,
        command,
        targetDeviceId: target.deviceId,
        targetSource: target.source,
        detail: "Direct MQTT connection error.",
        error: error.message,
      });
    });

    client.on("connect", () => {
      client.publish(topic, JSON.stringify(payload), { qos: 1 }, (error) => {
        clearTimeout(timeout);
        finish({
          ok: !error,
          topic,
          command,
          targetDeviceId: target.deviceId,
          targetSource: target.source,
          detail: error
            ? "Direct MQTT publish failed."
            : `Published Telegram command using ${target.source}.`,
          error: error?.message,
        });
      });
    });
  });
}
