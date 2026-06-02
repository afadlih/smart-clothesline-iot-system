import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { SensorData } from "@/models/SensorData";
import { DeviceStateSource, MqttDiagnosticsService } from "@/services/MqttDiagnosticsService";
import { STATUS_TOPIC } from "@/services/MQTTService";
import { DeviceState, DeviceConfig, UiState, SensorHistoryItem, SerialLogItem, DeviceCommand, LastMqttMessage, ScheduleRuntimeState, EventLog, ConnectionSnapshot } from "@/features/sensor/types";

interface MainStoreState {
    sensorData: SensorData | null;
    deviceState: DeviceState;
    deviceConfig: DeviceConfig;
    uiState: UiState;
    loading: boolean;
    history: SensorHistoryItem[];
    serialLogs: SerialLogItem[];
    pendingCommand: DeviceCommand | null;
    commandStatus: "idle" | "pending" | "success" | "timeout";
    commandSentAt: number | null;
    configSentAt: number | null;
    lastSensorUpdate: number | null;
    lastHeartbeatUpdate: number | null;
    lastStatusUpdate: number | null;
    lastMqttMessage: LastMqttMessage | null;
    debug: {
        lastTransition: string | null;
        lastTransitionAt: number | null;
        lastAckResult: "none" | "matched" | "mismatch" | "timeout";
        dedupedStatusCount: number;
        deviceStateSource: DeviceStateSource;
        mqttDiagnostics: ReturnType<typeof MqttDiagnosticsService.snapshot>;
        scheduleRuntime: ScheduleRuntimeState;
    };
    events: EventLog[];
    connection: ConnectionSnapshot;
    queueStats: {
        total: number;
        readyToSync: number;
        failed: number;
        oldestItemAge: number | null;
    };
    commandGuard: {
        state: string;
        canSendCommand: boolean;
        disabledCommands: string[];
        reason: string;
    };
    updateState: (fn: (draft: MainStoreState) => void) => void;
}

export const useMainStore = create<MainStoreState>()(
    immer((set) => ({
        sensorData: null,
        deviceState: {
            status: null,
            mode: null,
            lastCommand: null,
            updatedAt: null,
        },
        deviceConfig: {
            rainThreshold: 3000,
            lightThreshold: 3000,
            updateIntervalSec: 5,
            autoCloseOnRain: true,
            autoCloseOnDark: true,
            autoOpenWhenSafe: false,
            syncState: "IDLE",
            lastSyncAt: null,
            syncMessage: "Not synced yet",
        },
        uiState: {
            connection: "DISCONNECTED",
            stream: "NO_DATA",
            deviceSync: "IDLE",
        },
        loading: true,
        history: [],
        serialLogs: [],
        pendingCommand: null,
        commandStatus: "idle",
        commandSentAt: null,
        configSentAt: null,
        lastSensorUpdate: null,
        lastHeartbeatUpdate: null,
        lastStatusUpdate: null,
        lastMqttMessage: null,
        debug: {
            lastTransition: null,
            lastTransitionAt: null,
            lastAckResult: "none",
            dedupedStatusCount: 0,
            deviceStateSource: "UNKNOWN",
            mqttDiagnostics: MqttDiagnosticsService.snapshot(),
            scheduleRuntime: {
                loaded: false,
                source: "none",
                deviceId: null,
                activeScheduleId: null,
                isActiveNow: false,
                lastCommand: null,
                lastCommandAt: null,
                lastReason: "Initialized schedule runtime",
            },
        },
        events: [],
        connection: {
            state: "connecting",
            isOnline: false,
            topic: STATUS_TOPIC,
            source: "MQTT",
            lastError: null,
            lastMessageAt: null,
            reconnectCount: 0,
            connectedSinceAt: null,
            uptimeMs: 0,
        },
        queueStats: {
            total: 0,
            readyToSync: 0,
            failed: 0,
            oldestItemAge: null,
        },
        commandGuard: {
            state: "UNKNOWN",
            canSendCommand: false,
            disabledCommands: [],
            reason: "Awaiting telemetry.",
        },

        updateState: (fn) => set(fn),
    }))
);