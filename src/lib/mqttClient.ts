import mqtt, { MqttClient } from "mqtt";

export interface SensorData {
  temperature: number;
  humidity: number;
  light: number;
  rain: boolean;
  status: "OPEN" | "CLOSED";
}

const MQTT_BROKER_URL = process.env.NEXT_PUBLIC_MQTT_BROKER_URL ?? "wss://broker.hivemq.com:8884/mqtt";
// SECURITY NOTE:
// NEXT_PUBLIC MQTT credentials are browser-visible by design.
// Do not use privileged/admin broker credentials here.
const MQTT_USER = process.env.NEXT_PUBLIC_MQTT_USERNAME;
const MQTT_PASS = process.env.NEXT_PUBLIC_MQTT_PASSWORD;
export const MQTT_TOPIC = process.env.NEXT_PUBLIC_MQTT_TOPIC_SENSOR ?? "smart-clothesline/sensor";

let client: MqttClient | null = null;

export function getMqttClient(): MqttClient {
  if (client) {
    return client;
  }

  if (typeof window === "undefined") {
    throw new Error("MQTT client can only be initialized in the browser.");
  }

  if ((MQTT_USER || MQTT_PASS) && process.env.NODE_ENV !== "production") {
    console.warn("[MQTT] Using browser-exposed MQTT credentials. Ensure ACL is low privilege.");
  }

  client = mqtt.connect(MQTT_BROKER_URL, {
    ...(MQTT_USER ? { username: MQTT_USER } : {}),
    ...(MQTT_PASS ? { password: MQTT_PASS } : {}),
    reconnectPeriod: 5000,
    connectTimeout: 10000,
    clean: true,
  });

  client.on("connect", () => {
    console.info("[MQTT] Connected to broker");
  });

  client.on("reconnect", () => {
    console.info("[MQTT] Reconnecting...");
  });

  client.on("error", (error) => {
    console.error("[MQTT] Connection error:", error.message);
  });

  client.on("offline", () => {
    console.warn("[MQTT] Client offline");
  });

  return client;
}
