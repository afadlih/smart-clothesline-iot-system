import { SensorData } from "@/models/SensorData";

type ConnectionState = "connecting" | "online" | "reconnecting" | "offline" | "error";
type DeviceStatus = "OPEN" | "CLOSED" | "MOVING" | "FAULT" | "RESTARTING" | "UNKNOWN";
type DeviceMode = "AUTO" | "MANUAL";
export type DeviceCommand = "OPEN" | "CLOSE" | "AUTO" | "MANUAL" | "RESTART";
type UiConnectionState = "DISCONNECTED" | "CONNECTED";
type UiStreamState = "NO_DATA" | "STREAMING" | "STALE";
type UiDeviceSyncState = "IDLE" | "WAITING_ACK" | "SYNCED";
type ConfigSyncState = "IDLE" | "PENDING" | "SYNCED" | "FAILED";

export type DeviceState = {
    status: DeviceStatus | null;
    mode: DeviceMode | null;
    lastCommand: DeviceCommand | null;
    updatedAt: number | null;
};

export type DeviceConfig = {
    rainThreshold: number;
    lightThreshold: number;
    updateIntervalSec: number;
    autoCloseOnRain: boolean;
    autoCloseOnDark: boolean;
    autoOpenWhenSafe: boolean;
    syncState: ConfigSyncState;
    lastSyncAt: number | null;
    syncMessage: string;
};

export type UiState = {
    connection: UiConnectionState;
    stream: UiStreamState;
    deviceSync: UiDeviceSyncState;
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

export type LastMqttMessage = {
    topic: string;
    payload: string;
    receivedAt: number;
};

export type ScheduleRuntimeState = {
    loaded: boolean;
    source: "firestore" | "cache" | "none";
    deviceId: string | null;
    activeScheduleId: string | null;
    isActiveNow: boolean;
    lastCommand: "OPEN" | "CLOSE" | null;
    lastCommandAt: number | null;
    lastReason: string;
};

export type EventLog = {
  type: "USER" | "DEVICE" | "SYSTEM";
  action: string;
  status?: "OPEN" | "CLOSED" | "RESTARTING";
  mode?: "AUTO" | "MANUAL";
  reason?: string;
  timestamp: number;
};

export type ConnectionSnapshot = {
    state: ConnectionState;
    isOnline: boolean;
    topic: string;
    source: "MQTT";
    lastError: string | null;
    lastMessageAt: string | null;
    reconnectCount: number;
    connectedSinceAt: string | null;
    uptimeMs: number;
};
