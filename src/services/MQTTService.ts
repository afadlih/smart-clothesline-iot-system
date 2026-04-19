import mqtt, { MqttClient } from "mqtt";

export type SensorMessage = {
    temperature: number;
    humidity: number;
    light: number;
    rain: boolean;
    sourceId?: string;
};

export type MqttConnectionState =
    | "connecting"
    | "online"
    | "reconnecting"
    | "offline"
    | "error";

export type MqttConnectionSnapshot = {
    state: MqttConnectionState;
    isOnline: boolean;
    topic: string;
    lastError: string | null;
    lastMessageAt: string | null;
};

type MessageCallback = (message: SensorMessage) => void;
type StatusCallback = (status: MqttConnectionSnapshot) => void;

const MQTT_BROKER_URL = "wss://broker.hivemq.com:8884/mqtt";
const MQTT_TOPIC = process.env.NEXT_PUBLIC_MQTT_TOPIC ?? "smart-clothesline/sensor";
const EXPECTED_SOURCE_ID =
    process.env.NEXT_PUBLIC_MQTT_SOURCE_ID ?? "smart-clothesline-simulator";

const MIN_TEMPERATURE = -20;
const MAX_TEMPERATURE = 80;
const MIN_HUMIDITY = 0;
const MAX_HUMIDITY = 100;
const MIN_LIGHT = 0;
const MAX_LIGHT = 5000;

class MQTTService {
    private client: MqttClient | null = null;
    private listeners = new Set<MessageCallback>();
    private statusListeners = new Set<StatusCallback>();
    private connectionStatus: MqttConnectionSnapshot = {
        state: "connecting",
        isOnline: false,
        topic: MQTT_TOPIC,
        lastError: null,
        lastMessageAt: null,
    };

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

    onConnectionStatus(callback: StatusCallback): () => void {
        this.connect();
        this.statusListeners.add(callback);
        callback(this.getConnectionSnapshot());

        return () => {
            this.statusListeners.delete(callback);
        };
    }

    getConnectionSnapshot(): MqttConnectionSnapshot {
        return { ...this.connectionStatus };
    }

    private updateConnectionStatus(
        patch: Partial<Omit<MqttConnectionSnapshot, "topic">>,
    ): void {
        this.connectionStatus = {
            ...this.connectionStatus,
            ...patch,
        };

        const snapshot = this.getConnectionSnapshot();
        for (const listener of this.statusListeners) {
            listener(snapshot);
        }
    }

    private connect(): void {
        if (this.client) {
            return;
        }

        this.updateConnectionStatus({
            state: "connecting",
            isOnline: false,
            lastError: null,
        });

        this.client = mqtt.connect(MQTT_BROKER_URL, {
            reconnectPeriod: 10000,
            connectTimeout: 10000,
            clean: true,
        });

        this.client.on("connect", () => {
            console.info("[MQTT] Connected to broker");
            this.updateConnectionStatus({
                state: "online",
                isOnline: true,
                lastError: null,
            });

            this.client?.subscribe(MQTT_TOPIC, (error) => {
                if (error) {
                    console.error("[MQTT] Failed to subscribe:", error.message);
                    this.updateConnectionStatus({
                        state: "error",
                        isOnline: false,
                        lastError: error.message,
                    });
                    return;
                }

                console.info(`[MQTT] Subscribed to topic: ${MQTT_TOPIC}`);
            });
        });

        this.client.on("reconnect", () => {
            console.info("[MQTT] Reconnecting...");
            this.updateConnectionStatus({
                state: "reconnecting",
                isOnline: false,
                lastError: null,
            });
        });

        this.client.on("error", (error) => {
            console.error("[MQTT] Connection error:", error.message);
            this.updateConnectionStatus({
                state: "error",
                isOnline: false,
                lastError: error.message,
            });
        });

        this.client.on("offline", () => {
            console.warn("[MQTT] Client offline");
            this.updateConnectionStatus({
                state: "offline",
                isOnline: false,
            });
        });

        this.client.on("close", () => {
            this.updateConnectionStatus({
                state: "offline",
                isOnline: false,
            });
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

            this.updateConnectionStatus({
                state: "online",
                isOnline: true,
                lastError: null,
                lastMessageAt: new Date().toISOString(),
            });

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

            if (
                data.temperature < MIN_TEMPERATURE ||
                data.temperature > MAX_TEMPERATURE ||
                data.humidity < MIN_HUMIDITY ||
                data.humidity > MAX_HUMIDITY ||
                data.light < MIN_LIGHT ||
                data.light > MAX_LIGHT
            ) {
                console.warn("[MQTT] Sensor value out of expected range:", data);
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
        if (!EXPECTED_SOURCE_ID) {
            return true;
        }

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
