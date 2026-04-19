import { useEffect, useState } from "react";
import { SensorData } from "@/models/SensorData";
import { SensorService } from "@/services/SensorService";
import { DecisionEngine } from "@/features/dashboard/DecisionEngine";
import { type MqttConnectionSnapshot } from "@/services/MQTTService";

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

type SensorSnapshot = {
    sensor: SensorData | null;
    history: SensorHistoryItem[];
    serialLogs: SerialLogItem[];
    connection: MqttConnectionSnapshot;
};

const sharedState: SensorSnapshot = {
    sensor: null,
    history: [],
    serialLogs: [],
    connection: SensorService.getConnectionStatusSnapshot(),
};

const listeners = new Set<(snapshot: SensorSnapshot) => void>();
let streamStarted = false;

function cloneSnapshot(): SensorSnapshot {
    return {
        sensor: sharedState.sensor,
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

    SensorService.subscribeToSensorData((data) => {
        sharedState.sensor = data;

        const status = DecisionEngine.getClotheslineStatus(data);
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

        notifyListeners();
    });

    SensorService.subscribeToConnectionStatus((status) => {
        sharedState.connection = status;
        notifyListeners();
    });
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