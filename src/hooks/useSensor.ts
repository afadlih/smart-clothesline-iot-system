import { useEffect, useState } from "react";
import { SensorData } from "@/models/SensorData";
import { DecisionEngine } from "@/features/dashboard/DecisionEngine";
import { getMqttClient, MQTT_TOPIC, type SensorData as MqttSensorData } from "@/lib/mqttClient";

type ConnectionState = "connecting" | "online" | "reconnecting" | "offline" | "error";

export type ConnectionSnapshot = {
    state: ConnectionState;
    isOnline: boolean;
    topic: string;
    lastError: string | null;
    lastMessageAt: string | null;
};

export type SensorHistoryItem = {
    id: string;
    data: SensorData;
    status: string;
    reason: string;
};

export type SerialLogItem = {
    id: string;
    level: "INFO" | "WARN";
    message: string;
    timestamp: string;
};

const MAX_HISTORY_ITEMS = 20;
const MAX_SERIAL_LOGS = 40;
const LIGHT_DARK_THRESHOLD = 200;
const LIGHT_ADC_MAX = 4095;
const DEFAULT_LIGHT_ORIENTATION: LightOrientation =
    process.env.NEXT_PUBLIC_LIGHT_ORIENTATION === "normal" ? "normal" : "inverted";

type LightOrientation = "unknown" | "normal" | "inverted";

type SensorSnapshot = {
    sensor: SensorData | null;
    status: "TERBUKA" | "TERTUTUP" | null;
    loading: boolean;
    history: SensorHistoryItem[];
    serialLogs: SerialLogItem[];
    connection: ConnectionSnapshot;
};

const sharedState: SensorSnapshot = {
    sensor: null,
    status: null,
    loading: true,
    history: [],
    serialLogs: [],
    connection: {
        state: "connecting",
        isOnline: false,
        topic: MQTT_TOPIC,
        lastError: null,
        lastMessageAt: null,
    },
};

const listeners = new Set<(snapshot: SensorSnapshot) => void>();
let streamStarted = false;
let clientInitialized = false;
let lightOrientation: LightOrientation = DEFAULT_LIGHT_ORIENTATION;

function updateConnectionStatus(patch: Partial<Omit<ConnectionSnapshot, "topic">>): void {
    sharedState.connection = {
        ...sharedState.connection,
        ...patch,
    };
    notifyListeners();
}

function parsePayload(raw: string): MqttSensorData | null {
    try {
        const data = JSON.parse(raw) as Partial<MqttSensorData>;

        if (
            typeof data.temperature !== "number" ||
            typeof data.humidity !== "number" ||
            typeof data.light !== "number" ||
            typeof data.rain !== "boolean" ||
            (data.status !== "TERBUKA" && data.status !== "TERTUTUP")
        ) {
            return null;
        }

        return {
            temperature: data.temperature,
            humidity: data.humidity,
            light: data.light,
            rain: data.rain,
            status: data.status,
        };
    } catch {
        return null;
    }
}

function inferLightOrientation(message: MqttSensorData): LightOrientation {
    if (message.rain) {
        return "unknown";
    }

    if (message.status === "TERBUKA") {
        return message.light < LIGHT_DARK_THRESHOLD ? "inverted" : "normal";
    }

    return message.light < LIGHT_DARK_THRESHOLD ? "normal" : "inverted";
}

function normalizeLight(rawValue: number): number {
    const clamped = Math.max(0, Math.min(rawValue, LIGHT_ADC_MAX));

    if (lightOrientation === "inverted") {
        return LIGHT_ADC_MAX - clamped;
    }

    return clamped;
}

function mapToSensorData(message: MqttSensorData, normalizedLight: number): SensorData {
    return new SensorData({
        temp: message.temperature,
        humidity: message.humidity,
        light: normalizedLight,
        rain: message.rain ? 1 : 0,
        timestamp: new Date().toISOString(),
    });
}

function cloneSnapshot(): SensorSnapshot {
    return {
        sensor: sharedState.sensor,
        status: sharedState.status,
        loading: sharedState.loading,
        history: [...sharedState.history],
        serialLogs: [...sharedState.serialLogs],
        connection: { ...sharedState.connection },
    };
}

function notifyListeners(): void {
    const snapshot = cloneSnapshot();
    for (const listener of listeners) {
        listener(snapshot);
    }
}

function startStreamIfNeeded(): void {
    if (streamStarted) {
        return;
    }

    streamStarted = true;

    let client;
    try {
        client = getMqttClient();
    } catch (error) {
        updateConnectionStatus({
            state: "error",
            isOnline: false,
            lastError: error instanceof Error ? error.message : "MQTT init failed",
        });
        sharedState.loading = false;
        notifyListeners();
        return;
    }

    if (!clientInitialized) {
        clientInitialized = true;

        updateConnectionStatus({
            state: "connecting",
            isOnline: false,
            lastError: null,
        });

        client.on("connect", () => {
            updateConnectionStatus({
                state: "online",
                isOnline: true,
                lastError: null,
            });

            client.subscribe(MQTT_TOPIC, (error) => {
                if (error) {
                    updateConnectionStatus({
                        state: "error",
                        isOnline: false,
                        lastError: error.message,
                    });
                }
            });
        });

        client.on("reconnect", () => {
            updateConnectionStatus({
                state: "reconnecting",
                isOnline: false,
                lastError: null,
            });
        });

        client.on("offline", () => {
            updateConnectionStatus({
                state: "offline",
                isOnline: false,
            });
        });

        client.on("error", (error) => {
            updateConnectionStatus({
                state: "error",
                isOnline: false,
                lastError: error.message,
            });
        });

        client.on("message", (topic, payload) => {
            if (topic !== MQTT_TOPIC) {
                return;
            }

            const parsed = parsePayload(payload.toString());
            if (!parsed) {
                return;
            }

            const inferred = inferLightOrientation(parsed);
            if (inferred !== "unknown" && lightOrientation !== inferred) {
                lightOrientation = inferred;
                console.info(`[MQTT] Light orientation detected: ${lightOrientation}`);
            }

            const normalizedLight = normalizeLight(parsed.light);
            const data = mapToSensorData(parsed, normalizedLight);
            sharedState.sensor = data;
            sharedState.status = parsed.status;
            sharedState.loading = false;

            const status = parsed.status;
            const reason = DecisionEngine.getReason(data);
            const id = `${data.timestamp}-${Math.random().toString(36).slice(2, 10)}`;

            const nextHistoryItem: SensorHistoryItem = {
                id,
                data,
                status,
                reason,
            };
            sharedState.history = [nextHistoryItem, ...sharedState.history].slice(0, MAX_HISTORY_ITEMS);

            const nextLog: SerialLogItem = {
                id,
                level: data.isRaining() ? "WARN" : "INFO",
                message: `RX sensor temp=${data.temperature.toFixed(1)}C hum=${data.humidity.toFixed(1)}% light=${data.light.toFixed(0)} rain=${data.isRaining() ? "yes" : "no"} -> ${status}`,
                timestamp: data.timestamp,
            };
            sharedState.serialLogs = [nextLog, ...sharedState.serialLogs].slice(0, MAX_SERIAL_LOGS);

            updateConnectionStatus({
                state: "online",
                isOnline: true,
                lastError: null,
                lastMessageAt: data.timestamp,
            });

            notifyListeners();
        });
    }
}

export function useSensor() {
    const [snapshot, setSnapshot] = useState<SensorSnapshot>(() => cloneSnapshot());

    useEffect(() => {
        startStreamIfNeeded();
        const listener = (nextSnapshot: SensorSnapshot) => {
            setSnapshot(nextSnapshot);
        };

        listeners.add(listener);
        listener(cloneSnapshot());

        return () => {
            listeners.delete(listener);
        };
    }, []);

    return snapshot;
}