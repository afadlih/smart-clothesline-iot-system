import mqtt, { MqttClient } from "mqtt";

export type SensorMessage = {
    temperature: number;
    humidity: number;
    light: number;
    rain: boolean;
    sourceId?: string;
};

type MessageCallback = (message: SensorMessage) => void;

const MQTT_BROKER_URL = "wss://broker.hivemq.com:8884/mqtt";
const MQTT_TOPIC = process.env.NEXT_PUBLIC_MQTT_TOPIC ?? "smart-clothesline/afadlih/sensor";
const EXPECTED_SOURCE_ID =
    process.env.NEXT_PUBLIC_MQTT_SOURCE_ID ?? "smart-clothesline-simulator";

class MQTTService {
    private client: MqttClient | null = null;
    private listeners = new Set<MessageCallback>();

    constructor() {
        if (typeof window !== "undefined") {
            this.connect();
        }
    }

    onMessage(callback: MessageCallback): () => void {
        this.connect();
        this.listeners.add(callback);

        return () => {
            this.listeners.delete(callback);
        };
    }

    private connect(): void {
        if (this.client) {
            return;
        }

        this.client = mqtt.connect(MQTT_BROKER_URL, {
            reconnectPeriod: 3000,
            connectTimeout: 10000,
            clean: true,
        });

        this.client.on("connect", () => {
            console.info("[MQTT] Connected to broker");
            this.client?.subscribe(MQTT_TOPIC, (error) => {
                if (error) {
                    console.error("[MQTT] Failed to subscribe:", error.message);
                    return;
                }

                console.info(`[MQTT] Subscribed to topic: ${MQTT_TOPIC}`);
            });
        });

        this.client.on("reconnect", () => {
            console.info("[MQTT] Reconnecting...");
        });

        this.client.on("error", (error) => {
            console.error("[MQTT] Connection error:", error.message);
        });

        this.client.on("offline", () => {
            console.warn("[MQTT] Client offline");
        });

        this.client.on("message", (topic, payload) => {
            if (topic !== MQTT_TOPIC) {
                return;
            }

            const parsed = this.parseMessage(payload.toString());
            if (!parsed) {
                return;
            }

            if (!this.isExpectedSource(parsed)) {
                return;
            }

            for (const listener of this.listeners) {
                listener(parsed);
            }
        });
    }

    private parseMessage(raw: string): SensorMessage | null {
        try {
            const data = JSON.parse(raw) as Partial<SensorMessage>;

            if (
                typeof data.temperature !== "number" ||
                typeof data.humidity !== "number" ||
                typeof data.light !== "number" ||
                typeof data.rain !== "boolean"
            ) {
                console.warn("[MQTT] Invalid payload shape:", data);
                return null;
            }

            return {
                temperature: data.temperature,
                humidity: data.humidity,
                light: data.light,
                rain: data.rain,
                sourceId: data.sourceId,
            };
        } catch (error) {
            console.warn("[MQTT] Failed to parse JSON message:", error);
            return null;
        }
    }

    private isExpectedSource(message: SensorMessage): boolean {
        if (message.sourceId !== EXPECTED_SOURCE_ID) {
            console.warn(
                `[MQTT] Ignored message from unknown source: ${message.sourceId ?? "unknown"}`,
            );
            return false;
        }

        return true;
    }
}

export const mqttService = new MQTTService();
