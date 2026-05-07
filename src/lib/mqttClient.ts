import mqtt, { MqttClient } from "mqtt";

export interface SensorData {
  temperature: number;
  humidity: number;
  light: number;
  rain: boolean;
  status: "OPEN" | "CLOSED";
}

const MQTT_BROKER_URL = "wss://broker.hivemq.com:8884/mqtt";
export const MQTT_TOPIC = "smart-clothesline/sensor";

let client: MqttClient | null = null;

export function getMqttClient(): MqttClient {
  if (client) {
    return client;
  }

  if (typeof window === "undefined") {
    throw new Error("MQTT client can only be initialized in the browser.");
  }

  client = mqtt.connect(MQTT_BROKER_URL, {
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
