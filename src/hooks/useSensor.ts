import { useEffect, useMemo, useState } from "react";
import { DecisionEngine } from "@/features/dashboard/DecisionEngine";
import {
    getFinalState,
    type ScheduleDecision,
    type StoredScheduleItem,
} from "@/features/system/ScheduleEngine";
import { SensorData } from "@/models/SensorData";
import type { EventLog } from "@/models/EventLog";
import { EventLogService } from "@/services/EventLogService";
import { FirestoreService, sensorDataQueue } from "@/services/FirestoreService";
import {
    COMMAND_TOPIC,
    CONFIG_TOPIC,
    CONFIG_ACK_TOPIC,
    SENSOR_TOPIC,
    STATUS_TOPIC,
    mqttService,
} from "@/services/MQTTService";
import { pushSystemEvent } from "@/hooks/useNotificationEngine";
import { commandRateLimiter } from "@/utils/rateLimiter";
import { DeviceHealthService } from "@/services/DeviceHealthService";
import { SmartAlertsService } from "@/services/SmartAlertsService";
import { ScheduleService } from "@/services/ScheduleService";
import { TelemetryNormalizerService } from "@/services/TelemetryNormalizerService";
import { OperationalStateResolver } from "@/services/OperationalStateResolver";
import { TelegramOpsService } from "@/services/TelegramOpsService";
import { useSensorStore } from "@/stores/sensorStore";

type ConnectionState = "connecting" | "online" | "reconnecting" | "offline" | "error";
type DeviceStatus = "OPEN" | "CLOSED" | "RESTARTING";
type DeviceMode = "AUTO" | "MANUAL";
type DeviceCommand = "OPEN" | "CLOSE" | "AUTO" | "RESTART";
type UiConnectionState = "DISCONNECTED" | "CONNECTED";
type UiStreamState = "NO_DATA" | "STREAMING" | "STALE";
type UiDeviceSyncState = "IDLE" | "WAITING_ACK" | "SYNCED";
type ConfigSyncState = "IDLE" | "PENDING" | "SYNCED" | "FAILED";

type MqttSensorPayload = {
    deviceId?: string;
    temperature: number;
    humidity: number;
    light: number;
    rain: boolean;
    timestamp?: number;
    heartbeat?: number;
};

type MqttDeviceStatusPayload = {
    deviceId?: string;
    status: DeviceStatus;
    mode: DeviceMode;
    lastCommand?: DeviceCommand;
    source?: "DEVICE";
    timestamp?: number;
};

type MqttConfigAckPayload = {
    type: "CONFIG_ACK";
    deviceId?: string;
    rainThreshold: number;
    lightThreshold: number;
    updateIntervalSec?: number;
    autoCloseOnRain?: boolean;
    autoCloseOnDark?: boolean;
    autoOpenWhenSafe?: boolean;
    timestamp?: number;
};

type StatusPacket =
    | { kind: "device"; payload: MqttDeviceStatusPayload }
    | { kind: "configAck"; payload: MqttConfigAckPayload };

type DeviceState = {
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

export type ConnectionSnapshot = {
    state: ConnectionState;
    isOnline: boolean;
    topic: string;
    source: "MQTT";
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

export type LastMqttMessage = {
    topic: string;
    payload: string;
    receivedAt: number;
};

type SensorSnapshot = {
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
    };
    events: EventLog[];
    connection: ConnectionSnapshot;
    queueStats: {
        total: number;
        readyToSync: number;
        failed: number;
        oldestItemAge: number | null;
    };
};

const MAX_HISTORY_ITEMS = 20;
const MAX_SERIAL_LOGS = 40;
const MAX_EVENT_ITEMS = 10;
const ACK_TIMEOUT_MS = 5_000;
const CONFIG_ACK_TIMEOUT_MS = 5_000;
const CONFIG_PUBLISH_INTERVAL_MS = 5_000;
const FRESHNESS_MS = 10_000;
const STATUS_DEBOUNCE_MS = 1_000;
const OFFLINE_ALERT_INTERVAL_MS = 10_000;
const ACTIVE_DEVICE_STORAGE_KEY = "smart-clothesline-active-device-id-v1";
const WOKWI_DEVICE_ID = "wokwi-default";

const sharedState: SensorSnapshot = {
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
    },
    events: [],
    connection: {
        state: "connecting",
        isOnline: false,
        topic: STATUS_TOPIC,
        source: "MQTT",
        lastError: null,
        lastMessageAt: null,
    },
    queueStats: {
        total: 0,
        readyToSync: 0,
        failed: 0,
        oldestItemAge: null,
    },
};

const listeners = new Set<(snapshot: SensorSnapshot) => void>();
let streamStarted = false;
let eventHydrated = false;
let lastOfflineAlertAt = 0;
let previousDeviceStatus: DeviceStatus | null = null;
let offlineAlertRaised = false;
let lastConfigPublishAt = 0;
let lastConfigPublishKey: string | null = null;

function toInternalStatus(status: DeviceStatus | null): "OPEN" | "CLOSED" {
    return status === "OPEN" ? "OPEN" : "CLOSED";
}

function getConfigPublishKey(config: Omit<DeviceConfig, "syncState" | "lastSyncAt" | "syncMessage">): string {
    return JSON.stringify({
        rainThreshold: config.rainThreshold,
        lightThreshold: config.lightThreshold,
        updateIntervalSec: config.updateIntervalSec,
        autoCloseOnRain: config.autoCloseOnRain,
        autoCloseOnDark: config.autoCloseOnDark,
        autoOpenWhenSafe: config.autoOpenWhenSafe,
    });
}

function updateUiState(now: number = Date.now()): void {
    const resolved = OperationalStateResolver.resolve({
        now,
        mqttConnected: mqttService.isConnected(),
        lastHeartbeatAt: sharedState.lastHeartbeatUpdate,
        lastTelemetryAt: sharedState.lastSensorUpdate,
    });

    const stream: UiStreamState =
        resolved.streamState === "WAITING_DATA"
            ? "NO_DATA"
            : resolved.streamState === "STREAMING"
                ? "STREAMING"
                : resolved.streamState === "STALE"
                    ? "STALE"
                    : "NO_DATA";

    const nextUiState: UiState = {
        connection: resolved.deviceState === "OFFLINE" ? "DISCONNECTED" : "CONNECTED",
        stream,
        deviceSync:
            sharedState.commandStatus === "pending"
                ? "WAITING_ACK"
                : sharedState.commandStatus === "success"
                    ? "SYNCED"
                    : "IDLE",
    };

    const prev = sharedState.uiState;
    if (
        prev.connection !== nextUiState.connection ||
        prev.stream !== nextUiState.stream ||
        prev.deviceSync !== nextUiState.deviceSync
    ) {
        sharedState.debug.lastTransition = `${prev.connection}/${prev.stream}/${prev.deviceSync} -> ${nextUiState.connection}/${nextUiState.stream}/${nextUiState.deviceSync}`;
        sharedState.debug.lastTransitionAt = now;
    }

    sharedState.uiState = nextUiState;
}

function updateConnectionStatus(
    patch: Partial<Omit<ConnectionSnapshot, "topic" | "source">>,
): void {
    sharedState.connection = {
        ...sharedState.connection,
        ...patch,
    };
    updateUiState();
}

function appendSerialLog(
    prefix: "SENSOR" | "STATUS" | "COMMAND" | "CONFIG" | "ALERT",
    message: string,
    timestampMs: number,
    level: "INFO" | "WARN" = "INFO",
): void {
    const timestamp = new Date(timestampMs).toISOString();
    const id = `${prefix}-${timestampMs}-${Math.random().toString(36).slice(2, 10)}`;
    sharedState.serialLogs = [
        {
            id,
            level,
            message: `[${prefix}] ${message}`,
            timestamp,
        },
        ...sharedState.serialLogs,
    ].slice(0, MAX_SERIAL_LOGS);
}

function appendLegacyEvent(event: EventLog): void {
    sharedState.events = [event, ...sharedState.events].slice(0, MAX_EVENT_ITEMS);
    notifyListeners();

    void EventLogService.logEvent(event).catch((error) => {
        console.error("[EventLog] Failed to save event:", error);
    });
}

function parseSensorPayload(raw: string, receivedAt: number): MqttSensorPayload | null {
    try {
        const data = JSON.parse(raw) as Record<string, unknown>;
        const normalized = TelemetryNormalizerService.normalize(data, receivedAt);
        if (!normalized.ok) {
            console.warn("[MQTT] Invalid sensor payload:", normalized.reason);
            return null;
        }
        if (normalized.duplicate) {
            return null;
        }

        return {
            deviceId: normalized.value.deviceId,
            temperature: normalized.value.temperature,
            humidity: normalized.value.humidity,
            light: normalized.value.light,
            rain: normalized.value.rain,
            timestamp: normalized.value.timestamp,
            heartbeat: normalized.value.heartbeat,
        };
    } catch {
        console.warn("[MQTT] Failed to parse sensor payload:", raw);
        return null;
    }
}

async function processPendingTelegramCommands(): Promise<void> {
    const pending = await TelegramOpsService.fetchPendingCommands(5);
    for (const commandJob of pending) {
        try {
            await TelegramOpsService.markCommandStatus(commandJob.id, "processing", "Processing by dashboard bridge");
            if (commandJob.command === "/open") {
                sendCommand("OPEN");
            } else if (commandJob.command === "/close") {
                sendCommand("CLOSE");
            } else if (commandJob.command === "/mode_auto") {
                sendCommand("AUTO");
            } else if (commandJob.command === "/mode_manual") {
                await TelegramOpsService.markCommandStatus(commandJob.id, "failed", "Manual mode requires operator mode policy");
                await TelegramOpsService.addAuditLog({
                    userId: commandJob.userId,
                    username: commandJob.username,
                    command: commandJob.command,
                    result: "failed",
                    detail: "Manual mode command is not mapped to low-level MQTT command",
                    source: "telegram-bridge",
                });
                continue;
            }

            await TelegramOpsService.markCommandStatus(commandJob.id, "done", "Command dispatched to MQTT");
            await TelegramOpsService.addAuditLog({
                userId: commandJob.userId,
                username: commandJob.username,
                command: commandJob.command,
                result: "success",
                detail: "Command dispatched from bridge",
                source: "telegram-bridge",
            });
            pushSystemEvent({
                type: "COMMAND",
                title: "Telegram command executed",
                description: `${commandJob.command} dispatched by operator ${commandJob.username ?? commandJob.userId}`,
                timestamp: Date.now(),
            });
        } catch (error) {
            await TelegramOpsService.markCommandStatus(commandJob.id, "failed", String(error));
            await TelegramOpsService.addAuditLog({
                userId: commandJob.userId,
                username: commandJob.username,
                command: commandJob.command,
                result: "failed",
                detail: String(error),
                source: "telegram-bridge",
            });
        }
    }
}

export function getActiveDeviceId(): string | null {
    if (typeof window === "undefined") {
        return null;
    }

    return localStorage.getItem(ACTIVE_DEVICE_STORAGE_KEY);
}

function shouldAcceptSensorPayload(payload: MqttSensorPayload): boolean {
    return shouldAcceptDevicePayload(payload.deviceId);
}

function shouldAcceptStatusPayload(payload: MqttDeviceStatusPayload): boolean {
    return shouldAcceptDevicePayload(payload.deviceId);
}

function shouldAcceptConfigAckPayload(payload: MqttConfigAckPayload): boolean {
    return shouldAcceptDevicePayload(payload.deviceId);
}

function shouldAcceptDevicePayload(payloadDeviceId?: string): boolean {
    const activeDeviceId = getActiveDeviceId();

    if (!activeDeviceId) {
        return true;
    }

    // Allow legacy payloads without deviceId so production streams are not blocked.
    if (!payloadDeviceId) {
        return true;
    }

    if (activeDeviceId === WOKWI_DEVICE_ID) {
        return payloadDeviceId === WOKWI_DEVICE_ID;
    }

    return payloadDeviceId === activeDeviceId;
}

function applyConfigAckPayload(payload: MqttConfigAckPayload, receivedAt: number): void {
    if (!shouldAcceptConfigAckPayload(payload)) {
        console.info("[MQTT][FILTERED CONFIG ACK]", {
            activeDeviceId: getActiveDeviceId(),
            payloadDeviceId: payload.deviceId ?? null,
        });
        return;
    }

    const ackTimestamp = payload.timestamp ?? receivedAt;

    sharedState.deviceConfig = {
        rainThreshold: payload.rainThreshold,
        lightThreshold: payload.lightThreshold,
        updateIntervalSec: payload.updateIntervalSec ?? sharedState.deviceConfig.updateIntervalSec,
        autoCloseOnRain: payload.autoCloseOnRain ?? sharedState.deviceConfig.autoCloseOnRain,
        autoCloseOnDark: payload.autoCloseOnDark ?? sharedState.deviceConfig.autoCloseOnDark,
        autoOpenWhenSafe: payload.autoOpenWhenSafe ?? sharedState.deviceConfig.autoOpenWhenSafe,
        syncState: "SYNCED",
        lastSyncAt: ackTimestamp,
        syncMessage: "Config synced with device",
    };
    sharedState.configSentAt = null;

    appendSerialLog(
        "CONFIG",
        `ACK rainThreshold=${payload.rainThreshold} lightThreshold=${payload.lightThreshold} updateIntervalSec=${payload.updateIntervalSec ?? sharedState.deviceConfig.updateIntervalSec}`,
        ackTimestamp,
    );
    pushSystemEvent({
        type: "CONFIG",
        title: "Config synced",
        description: `rainThreshold=${payload.rainThreshold}, lightThreshold=${payload.lightThreshold}, updateIntervalSec=${payload.updateIntervalSec ?? sharedState.deviceConfig.updateIntervalSec}`,
        timestamp: ackTimestamp,
    });
    appendLegacyEvent({
        type: "SYSTEM",
        action: "CONFIG_ACK",
        timestamp: ackTimestamp,
    });

    notifyListeners();
}


function parseStatusPacket(raw: string): StatusPacket | null {
    try {
        const data = JSON.parse(raw) as Partial<MqttDeviceStatusPayload & MqttConfigAckPayload>;
        if (data.type === "CONFIG_ACK") {
            if (
                typeof data.rainThreshold !== "number" ||
                typeof data.lightThreshold !== "number" ||
                (data.updateIntervalSec !== undefined && typeof data.updateIntervalSec !== "number") ||
                (data.autoCloseOnRain !== undefined && typeof data.autoCloseOnRain !== "boolean") ||
                (data.autoCloseOnDark !== undefined && typeof data.autoCloseOnDark !== "boolean") ||
                (data.autoOpenWhenSafe !== undefined && typeof data.autoOpenWhenSafe !== "boolean")
            ) {
                console.warn("[MQTT] Invalid config ack payload:", raw);
                return null;
            }

            return {
                kind: "configAck",
                payload: {
                    type: "CONFIG_ACK",
                    deviceId: typeof data.deviceId === "string" ? data.deviceId : undefined,
                    rainThreshold: data.rainThreshold,
                    lightThreshold: data.lightThreshold,
                    updateIntervalSec: data.updateIntervalSec,
                    autoCloseOnRain: data.autoCloseOnRain,
                    autoCloseOnDark: data.autoCloseOnDark,
                    autoOpenWhenSafe: data.autoOpenWhenSafe,
                    timestamp: typeof data.timestamp === "number" ? data.timestamp : undefined,
                },
            };
        }

        if (data.status === "RESTARTING" && data.lastCommand === "RESTART") {
            return {
                kind: "device",
                payload: {
                    deviceId: typeof data.deviceId === "string" ? data.deviceId : undefined,
                    status: "RESTARTING",
                    mode: sharedState.deviceState.mode ?? "MANUAL",
                    lastCommand: "RESTART",
                    timestamp: typeof data.timestamp === "number" ? data.timestamp : undefined,
                },
            };
        }

        if (
            (data.status !== "OPEN" && data.status !== "CLOSED") ||
            (data.mode !== "AUTO" && data.mode !== "MANUAL")
        ) {
            console.warn("[MQTT] Invalid status payload:", raw);
            return null;
        }

        return {
            kind: "device",
            payload: {
                deviceId: typeof data.deviceId === "string" ? data.deviceId : undefined,
                status: data.status,
                mode: data.mode,
                lastCommand:
                    data.lastCommand === "OPEN" || data.lastCommand === "CLOSE" || data.lastCommand === "AUTO"
                        ? data.lastCommand
                        : undefined,
                source: data.source === "DEVICE" ? data.source : undefined,
                timestamp: typeof data.timestamp === "number" ? data.timestamp : undefined,
            },
        };
    } catch {
        console.warn("[MQTT] Failed to parse status payload:", raw);
        return null;
    }
}

function mapToSensorData(message: MqttSensorPayload): SensorData {
    const timestamp = message.timestamp ?? Date.now();
    return new SensorData({
        temp: message.temperature,
        humidity: message.humidity,
        light: message.light,
        rain: message.rain ? 1 : 0,
        status: toInternalStatus(sharedState.deviceState.status),
        timestamp: new Date(timestamp).toISOString(),
    });
}

function cloneSnapshot(): SensorSnapshot {
    return {
        sensorData: sharedState.sensorData,
        deviceState: { ...sharedState.deviceState },
        deviceConfig: { ...sharedState.deviceConfig },
        uiState: { ...sharedState.uiState },
        loading: sharedState.loading,
        history: [...sharedState.history],
        serialLogs: [...sharedState.serialLogs],
        pendingCommand: sharedState.pendingCommand,
        commandStatus: sharedState.commandStatus,
        commandSentAt: sharedState.commandSentAt,
        configSentAt: sharedState.configSentAt,
        lastSensorUpdate: sharedState.lastSensorUpdate,
        lastHeartbeatUpdate: sharedState.lastHeartbeatUpdate,
        lastStatusUpdate: sharedState.lastStatusUpdate,
        lastMqttMessage: sharedState.lastMqttMessage
            ? { ...sharedState.lastMqttMessage }
            : null,
        debug: { ...sharedState.debug },
        events: [...sharedState.events],
        connection: { ...sharedState.connection },
        queueStats: { ...sharedState.queueStats },
    };
}

function notifyListeners(): void {
    updateUiState();
    // Update queue stats
    sharedState.queueStats = sensorDataQueue.getStats();
    useSensorStore.getState().setRealtimeState({
        lastSensorUpdate: sharedState.lastSensorUpdate,
        lastHeartbeatUpdate: sharedState.lastHeartbeatUpdate,
        lastStatusUpdate: sharedState.lastStatusUpdate,
        mqttConnected: mqttService.isConnected(),
        streamState: sharedState.uiState.stream,
    });
    const snapshot = cloneSnapshot();
    for (const listener of listeners) {
        listener(snapshot);
    }
}

function clearPendingCommandAsSuccess(): void {
    sharedState.commandStatus = "success";
    sharedState.pendingCommand = null;
    sharedState.commandSentAt = null;
    sharedState.debug.lastAckResult = "matched";
}

function matchesAcknowledgement(payload: MqttDeviceStatusPayload): boolean {
    const pending = sharedState.pendingCommand;
    if (!pending) {
        return false;
    }

    if (pending === "RESTART") {
        return payload.lastCommand === "RESTART" && payload.status === "RESTARTING";
    }

    if (pending === "AUTO") {
        return payload.mode === "AUTO" && payload.lastCommand === "AUTO";
    }

    const expectedStatus = pending === "OPEN" ? "OPEN" : "CLOSED";
    return payload.lastCommand === pending && payload.status === expectedStatus;
}

function pushAlertIfNeeded(title: string, description: string, key: string, timestamp: number): void {
    pushSystemEvent(
        {
            type: "ALERT",
            title,
            description,
            timestamp,
        },
        { alertKey: key },
    );
    appendSerialLog("ALERT", `${title} - ${description}`, timestamp, "WARN");
}

function detectRealtimeAlerts(sensor: SensorData | null, status: DeviceStatus | null, timestamp: number): void {
    if (!sensor) {
        return;
    }

    if (sensor.isRaining() && status === "OPEN") {
        pushAlertIfNeeded(
            "Rain detected while clothesline is OPEN",
            "Device remains OPEN while rain=true.",
            "alert-rain-open",
            timestamp,
        );
    }

    if (sensor.humidity < 50 && sensor.temperature > 30) {
        pushAlertIfNeeded(
            "Clothes are likely dry",
            "Humidity < 50% and temperature > 30C.",
            "alert-dry-clothes",
            timestamp,
        );
    }
}

function detectOfflineAlert(now: number): void {
    const lastFreshAt = Math.max(sharedState.lastSensorUpdate ?? 0, sharedState.lastStatusUpdate ?? 0);
    const isFresh = lastFreshAt > 0 && now - lastFreshAt < FRESHNESS_MS;
    if (isFresh) {
        offlineAlertRaised = false;
        return;
    }

    if (!mqttService.isConnected()) {
        return;
    }

    if (offlineAlertRaised) {
        return;
    }

    if (now - lastOfflineAlertAt < OFFLINE_ALERT_INTERVAL_MS) {
        return;
    }

    lastOfflineAlertAt = now;
    offlineAlertRaised = true;
    pushAlertIfNeeded(
        "Device offline",
        "No fresh MQTT data for more than 10 seconds.",
        "alert-device-offline",
        now,
    );
}

function startStreamIfNeeded(): void {
    if (streamStarted) {
        return;
    }

    streamStarted = true;
    updateConnectionStatus({
        state: "connecting",
        isOnline: false,
        lastError: null,
    });
    notifyListeners();

    mqttService.onConnectionStatus((connection) => {
        updateConnectionStatus({
            state: connection.state,
            isOnline: connection.isOnline,
            lastError: connection.lastError,
            lastMessageAt: connection.lastMessageAt,
        });
        notifyListeners();
    });

    if (!eventHydrated) {
        eventHydrated = true;
        void EventLogService.getRecentEvents(MAX_EVENT_ITEMS)
            .then((events) => {
                sharedState.events = events.slice(0, MAX_EVENT_ITEMS);
                notifyListeners();
            })
            .catch((error) => {
                console.error("[EventLog] Failed to fetch recent events:", error);
            });
    }

    mqttService.subscribe((topic, rawPayload) => {
        const receivedAt = Date.now();
        sharedState.lastMqttMessage = {
            topic,
            payload: rawPayload,
            receivedAt,
        };

        if (topic === SENSOR_TOPIC) {
            const payload = parseSensorPayload(rawPayload, receivedAt);
            if (!payload) {
                return;
            }

            if (!shouldAcceptSensorPayload(payload)) {
                console.info("[MQTT][FILTERED SENSOR]", {
                    activeDeviceId: getActiveDeviceId(),
                    payloadDeviceId: payload.deviceId ?? null,
                });
                return;
            }

            const sensorTimestamp = payload.timestamp ?? receivedAt;
            const heartbeatTimestamp = payload.heartbeat ?? sensorTimestamp;

            const data = mapToSensorData(payload);
            sharedState.sensorData = data;
            sharedState.loading = false;
            sharedState.lastSensorUpdate = receivedAt;
            sharedState.lastHeartbeatUpdate = heartbeatTimestamp;
            updateConnectionStatus({
                state: "online",
                isOnline: true,
                lastError: null,
                lastMessageAt: new Date(heartbeatTimestamp).toISOString(),
            });

            const payloadForStorage = {
                temperature: payload.temperature,
                humidity: payload.humidity,
                light: payload.light,
                rain: payload.rain,
                status: toInternalStatus(sharedState.deviceState.status),
            };
            // TODO: move to backend ingestion service
            void FirestoreService.saveSensorData(payloadForStorage).catch((error) => {
                console.error("[Firestore] Failed to save sensor data:", error);
            });

            const id = `${data.timestamp}-${Math.random().toString(36).slice(2, 10)}`;
            const historyStatus = toInternalStatus(sharedState.deviceState.status);
            sharedState.history = [
                {
                    id,
                    data,
                    status: historyStatus,
                    reason: DecisionEngine.getReason(data, {
                        lightThreshold: sharedState.deviceConfig.lightThreshold,
                        autoCloseOnRain: sharedState.deviceConfig.autoCloseOnRain,
                        autoCloseOnDark: sharedState.deviceConfig.autoCloseOnDark,
                    }),
                },
                ...sharedState.history,
            ].slice(0, MAX_HISTORY_ITEMS);

            appendSerialLog(
                "SENSOR",
                `temp=${payload.temperature.toFixed(1)}C hum=${payload.humidity.toFixed(1)}% light=${payload.light.toFixed(0)} rain=${payload.rain ? "yes" : "no"}`,
                sensorTimestamp,
                (sharedState.deviceConfig.autoCloseOnRain && payload.rain) ||
                    (sharedState.deviceConfig.autoCloseOnDark && data.isDark(sharedState.deviceConfig.lightThreshold))
                    ? "WARN"
                    : "INFO",
            );
            pushSystemEvent({
                type: "SENSOR",
                title: "Sensor update",
                description: `Temp ${payload.temperature.toFixed(1)}C, Hum ${payload.humidity.toFixed(1)}%, Light ${payload.light.toFixed(0)}, Rain ${payload.rain ? "yes" : "no"}`,
                timestamp: sensorTimestamp,
            });

            detectRealtimeAlerts(data, sharedState.deviceState.status, sensorTimestamp);

            console.info("[MQTT][STATE UPDATE]", {
                topic: SENSOR_TOPIC,
                sensor: {
                    temperature: payload.temperature,
                    humidity: payload.humidity,
                    light: payload.light,
                    rain: payload.rain,
                },
            });
            notifyListeners();
            return;
        }

        if (topic === CONFIG_ACK_TOPIC) {
            const packet = parseStatusPacket(rawPayload);
            if (packet?.kind === "configAck") {
                applyConfigAckPayload(packet.payload, receivedAt);
            }
            return;
        }

        if (topic !== STATUS_TOPIC) {
            notifyListeners();
            return;
        }

        const packet = parseStatusPacket(rawPayload);
        if (!packet) {
            return;
        }

        if (packet.kind === "configAck") {
            applyConfigAckPayload(packet.payload, receivedAt);
            return;
        }

        const payload = packet.payload;
        const statusTimestamp = payload.timestamp ?? receivedAt;
        if (!shouldAcceptStatusPayload(payload)) {
            console.info("[MQTT][FILTERED STATUS]", {
                activeDeviceId: getActiveDeviceId(),
                payloadDeviceId: payload.deviceId ?? null,
            });
            return;
        }
        const ackMatched = matchesAcknowledgement(payload);
        if (ackMatched) {
            clearPendingCommandAsSuccess();
            appendLegacyEvent({
                type: "DEVICE",
                action: "STATUS_ACK",
                status: payload.status,
                mode: payload.mode,
                timestamp: statusTimestamp,
            });
        } else if (sharedState.pendingCommand !== null) {
            sharedState.debug.lastAckResult = "mismatch";
            appendSerialLog(
                "STATUS",
                `ack mismatch pending=${sharedState.pendingCommand} incomingStatus=${payload.status} incomingLastCommand=${payload.lastCommand ?? "-"}`,
                statusTimestamp,
                "WARN",
            );
        }

        const isDuplicateStatus =
            sharedState.deviceState.status === payload.status &&
            sharedState.deviceState.mode === payload.mode &&
            sharedState.lastStatusUpdate !== null &&
            receivedAt - sharedState.lastStatusUpdate < STATUS_DEBOUNCE_MS;

        sharedState.lastStatusUpdate = receivedAt;
        sharedState.lastHeartbeatUpdate = statusTimestamp;
        sharedState.loading = false;
        updateConnectionStatus({
            state: "online",
            isOnline: true,
            lastError: null,
            lastMessageAt: new Date(statusTimestamp).toISOString(),
        });

        if (isDuplicateStatus) {
            sharedState.debug.dedupedStatusCount += 1;
            detectRealtimeAlerts(sharedState.sensorData, payload.status, statusTimestamp);
            notifyListeners();
            return;
        }

        const previousStatus = sharedState.deviceState.status;
        sharedState.deviceState = {
            status: payload.status,
            mode: payload.mode,
            lastCommand: payload.lastCommand ?? sharedState.deviceState.lastCommand,
            updatedAt: statusTimestamp,
        };

        appendSerialLog(
            "STATUS",
            `status=${payload.status} mode=${payload.mode}${payload.lastCommand ? ` lastCommand=${payload.lastCommand}` : ""}${ackMatched ? " (ACK)" : ""}`,
            statusTimestamp,
        );

        if (previousStatus !== payload.status || previousDeviceStatus !== payload.status) {
            pushSystemEvent({
                type: "STATUS",
                title: "Status changed",
                description: `${previousStatus ?? "--"} -> ${payload.status} (${payload.mode})`,
                timestamp: statusTimestamp,
            });
            previousDeviceStatus = payload.status;
        }

        detectRealtimeAlerts(sharedState.sensorData, payload.status, statusTimestamp);

        console.info("[MQTT][STATE UPDATE]", {
            topic: STATUS_TOPIC,
            status: payload.status,
            mode: payload.mode,
            lastCommand: payload.lastCommand ?? null,
        });
        notifyListeners();
    });
}

export function sendCommand(command: DeviceCommand) {
    const now = Date.now();
    updateUiState(now);
    const isDeviceOnline = sharedState.uiState.stream === "STREAMING";

    if (!isDeviceOnline) {
        console.warn("[CONTROL] Command blocked: device offline");
        pushSystemEvent({
            type: "ALERT",
            title: "Command blocked",
            description: "Device is offline, cannot send command",
            timestamp: now,
        });
        return;
    }

    if (sharedState.commandStatus === "pending") {
        return;
    }

    if (!mqttService.isConnected()) {
        console.warn("[CONTROL] Command blocked: MQTT disconnected");
        pushSystemEvent({
            type: "ALERT",
            title: "Command blocked",
            description: "MQTT disconnected, cannot send command",
            timestamp: now,
        });
        return;
    }

    // ===== RATE LIMITING CHECK =====
    const rateLimitCheck = commandRateLimiter.canSend(command);
    if (!rateLimitCheck.allowed) {
        console.warn("[CONTROL] Command rate limited:", {
            command,
            waitMs: rateLimitCheck.waitMs,
        });
        pushSystemEvent({
            type: "ALERT",
            title: "Command rate limited",
            description: `Please wait ${Math.ceil((rateLimitCheck.waitMs ?? 0) / 1000)}s before sending another command`,
            timestamp: now,
        });
        return;
    }

    if (command === "RESTART") {
        commandRateLimiter.recordSend(command);
        sharedState.pendingCommand = command;
        sharedState.commandStatus = "pending";
        sharedState.commandSentAt = now;
        notifyListeners();

        const activeDeviceId = getActiveDeviceId();
        const targetDeviceId = activeDeviceId && activeDeviceId !== WOKWI_DEVICE_ID ? activeDeviceId : null;
        const commandPayload = targetDeviceId ? { deviceId: targetDeviceId, command } : { command };
        const targetLabel = targetDeviceId ?? "legacy";

        appendSerialLog("COMMAND", `${command} -> publish ${COMMAND_TOPIC} target=${targetLabel}`, now);

        appendLegacyEvent({
            type: "USER",
            action: command,
            timestamp: now,
        });
        pushSystemEvent({
            type: "COMMAND",
            title: "Command sent",
            description: `USER -> ${command} (${targetLabel})`,
            timestamp: now,
        });

        mqttService.publish(COMMAND_TOPIC, commandPayload);
    }

    commandRateLimiter.recordSend(command);

    sharedState.pendingCommand = command;
    sharedState.commandStatus = "pending";
    sharedState.commandSentAt = now;
    notifyListeners();

    const activeDeviceId = getActiveDeviceId();
    const targetDeviceId = activeDeviceId && activeDeviceId !== WOKWI_DEVICE_ID ? activeDeviceId : null;
    const commandPayload = targetDeviceId ? { deviceId: targetDeviceId, command } : { command };
    const targetLabel = targetDeviceId ?? "legacy";

    appendSerialLog("COMMAND", `${command} -> publish ${COMMAND_TOPIC} target=${targetLabel}`, now);
    appendLegacyEvent({
        type: "USER",
        action: command,
        timestamp: now,
    });
    pushSystemEvent({
        type: "COMMAND",
        title: "Command sent",
        description: `USER -> ${command} (${targetLabel})`,
        timestamp: now,
    });

    mqttService.publish(COMMAND_TOPIC, commandPayload);
}

export function publishConfig(config: Omit<DeviceConfig, "syncState" | "lastSyncAt" | "syncMessage">): boolean {
    const now = Date.now();
    const configKey = getConfigPublishKey(config);

    if (configKey === lastConfigPublishKey) {
        sharedState.deviceConfig = {
            ...sharedState.deviceConfig,
            syncMessage: "Config unchanged; publish skipped",
        };
        notifyListeners();
        return false;
    }

    if (now - lastConfigPublishAt < CONFIG_PUBLISH_INTERVAL_MS) {
        const waitSeconds = Math.ceil((CONFIG_PUBLISH_INTERVAL_MS - (now - lastConfigPublishAt)) / 1000);
        sharedState.deviceConfig = {
            ...sharedState.deviceConfig,
            syncMessage: `Config publish skipped; wait ${waitSeconds}s before saving again`,
        };
        notifyListeners();
        return false;
    }

    if (!mqttService.isConnected()) {
        sharedState.deviceConfig = {
            ...sharedState.deviceConfig,
            syncState: "FAILED",
            syncMessage: "Sync failed: MQTT disconnected",
        };
        appendSerialLog("CONFIG", "FAILED mqtt disconnected", now, "WARN");
        pushSystemEvent({
            type: "CONFIG",
            title: "Config sync failed",
            description: "MQTT disconnected",
            timestamp: now,
        });
        appendLegacyEvent({
            type: "SYSTEM",
            action: "CONFIG_FAILED",
            timestamp: now,
        });
        notifyListeners();
        return false;
    }

    sharedState.deviceConfig = {
        ...sharedState.deviceConfig,
        syncState: "PENDING",
        syncMessage: "Syncing config to device...",
    };
    sharedState.configSentAt = now;
    notifyListeners();
    lastConfigPublishAt = now;
    lastConfigPublishKey = configKey;

    const activeDeviceId = getActiveDeviceId();
    const targetDeviceId = activeDeviceId && activeDeviceId !== WOKWI_DEVICE_ID ? activeDeviceId : null;

    appendSerialLog(
        "CONFIG",
        `PUBLISH rainThreshold=${config.rainThreshold} lightThreshold=${config.lightThreshold} updateIntervalSec=${config.updateIntervalSec} autoCloseOnRain=${config.autoCloseOnRain} autoCloseOnDark=${config.autoCloseOnDark} autoOpenWhenSafe=${config.autoOpenWhenSafe}`,
        now,
    );
    pushSystemEvent({
        type: "CONFIG",
        title: "Config publish",
        description: `rain=${config.rainThreshold}, light=${config.lightThreshold}, interval=${config.updateIntervalSec}s`,
        timestamp: now,
    });
    appendLegacyEvent({
        type: "SYSTEM",
        action: "CONFIG_PUBLISH",
        timestamp: now,
    });
    mqttService.publish(CONFIG_TOPIC, {
        ...(targetDeviceId ? { deviceId: targetDeviceId } : {}),
        rainThreshold: config.rainThreshold,
        lightThreshold: config.lightThreshold,
        updateIntervalSec: config.updateIntervalSec,
        autoCloseOnRain: config.autoCloseOnRain,
        autoCloseOnDark: config.autoCloseOnDark,
        autoOpenWhenSafe: config.autoOpenWhenSafe,
    });
    return true;
}

export function useSensor() {
    const [snapshot, setSnapshot] = useState<SensorSnapshot>(() => cloneSnapshot());
    const [now, setNow] = useState(() => Date.now());
    const [schedules, setSchedules] = useState<StoredScheduleItem[]>([]);

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

    useEffect(() => {
        let active = true;
        const refreshSchedules = async () => {
            const result = await ScheduleService.loadSchedules();
            if (!active) {
                return;
            }
            setSchedules(result.schedules);
        };

        void ScheduleService.migrateLegacyLocalSchedulesOnce().then(() => {
            void refreshSchedules();
        });

        const onScheduleUpdated = () => {
            void refreshSchedules();
        };
        window.addEventListener("schedule-updated", onScheduleUpdated);

        const scheduleRefreshTimer = window.setInterval(() => {
            void refreshSchedules();
        }, 5000);

        const timer = window.setInterval(() => {
            const nextNow = Date.now();
            setNow(nextNow);
            updateUiState(nextNow);
            detectOfflineAlert(nextNow);
            notifyListeners();
        }, 1000);

        // ===== FIRESTORE QUEUE SYNC =====
        const queueSyncTimer = window.setInterval(async () => {
            const stats = sensorDataQueue.getStats();
            if (stats.total > 0 && mqttService.isConnected()) {
                console.info("[Queue] Attempting to sync queued sensor data:", stats);
                try {
                    const synced = await FirestoreService.syncQueuedSensorData();
                    if (synced > 0) {
                        console.info("[Queue] Synced", synced, "items to Firestore");
                        pushSystemEvent({
                            type: "CONFIG",
                            title: "Queue synced",
                            description: `${synced} queued sensor readings uploaded to Firestore`,
                            timestamp: Date.now(),
                        });
                    }
                } catch (error) {
                    console.error("[Queue] Sync failed:", error);
                }
            }
        }, 10000); // Every 10 seconds

        const telegramBridgeTimer = window.setInterval(() => {
            void processPendingTelegramCommands();
        }, 4000);

        void refreshSchedules();

        return () => {
            active = false;
            window.clearInterval(timer);
            window.clearInterval(scheduleRefreshTimer);
            window.clearInterval(queueSyncTimer);
            window.clearInterval(telegramBridgeTimer);
            window.removeEventListener("schedule-updated", onScheduleUpdated);
        };
    }, []);

    useEffect(() => {
        if (snapshot.commandStatus !== "pending" || snapshot.commandSentAt === null) {
            return;
        }

        if (now - snapshot.commandSentAt >= ACK_TIMEOUT_MS) {
            sharedState.commandStatus = "timeout";
            sharedState.pendingCommand = null;
            sharedState.commandSentAt = null;
            sharedState.debug.lastAckResult = "timeout";
            appendSerialLog("COMMAND", "ACK timeout > 5s", now, "WARN");
            notifyListeners();
        }
    }, [now, snapshot.commandSentAt, snapshot.commandStatus]);

    useEffect(() => {
        if (snapshot.deviceConfig.syncState !== "PENDING" || snapshot.configSentAt === null) {
            return;
        }

        if (now - snapshot.configSentAt >= CONFIG_ACK_TIMEOUT_MS) {
            sharedState.deviceConfig = {
                ...sharedState.deviceConfig,
                syncState: "FAILED",
                syncMessage: "Sync failed (timeout)",
            };
            appendSerialLog("CONFIG", "FAILED ack timeout > 5s", now, "WARN");
            pushSystemEvent({
                type: "CONFIG",
                title: "Config sync failed",
                description: "ACK timeout > 5s",
                timestamp: now,
            });
            appendLegacyEvent({
                type: "SYSTEM",
                action: "CONFIG_FAILED",
                timestamp: now,
            });
            sharedState.configSentAt = null;
            notifyListeners();
        }
    }, [now, snapshot.configSentAt, snapshot.deviceConfig.syncState]);

    useEffect(() => {
        if (snapshot.commandStatus !== "success" && snapshot.commandStatus !== "timeout") {
            return;
        }

        const timer = window.setTimeout(() => {
            if (sharedState.commandStatus === "pending") {
                return;
            }
            sharedState.commandStatus = "idle";
            notifyListeners();
        }, 2000);

        return () => {
            window.clearTimeout(timer);
        };
    }, [snapshot.commandStatus]);

    const lastUpdate = useMemo(
        () => Math.max(snapshot.lastSensorUpdate ?? 0, snapshot.lastStatusUpdate ?? 0, snapshot.lastHeartbeatUpdate ?? 0) || null,
        [snapshot.lastHeartbeatUpdate, snapshot.lastSensorUpdate, snapshot.lastStatusUpdate],
    );
    const drift =
        snapshot.lastSensorUpdate !== null && snapshot.lastStatusUpdate !== null
            ? Math.abs(snapshot.lastSensorUpdate - snapshot.lastStatusUpdate)
            : null;
    const mqttConnected = mqttService.isConnected();
    const isOnline =
        snapshot.uiState.connection === "CONNECTED" &&
        snapshot.uiState.stream === "STREAMING";
    const isStreaming = isOnline;
    const decision = getFinalState({
        sensor: snapshot.sensorData,
        schedules,
        pendingManual: snapshot.pendingCommand === "CLOSE" ? "CLOSED" : snapshot.pendingCommand,
        currentHour: new Date(now).getHours(),
        safetyConfig: {
            lightThreshold: snapshot.deviceConfig.lightThreshold,
            autoCloseOnRain: snapshot.deviceConfig.autoCloseOnRain,
            autoCloseOnDark: snapshot.deviceConfig.autoCloseOnDark,
        },
    });

    // Calculate device health and smart alerts
    const deviceHealth = DeviceHealthService.calculateHealth(
        snapshot.connection,
        snapshot.history,
        {
            commandStatus: snapshot.commandStatus,
            lastCommandAt: snapshot.commandSentAt,
        },
    );
    const operationalHealth = DeviceHealthService.calculateOperationalHealth({
        mqttConnected,
        streamState: snapshot.uiState.stream,
        commandStatus: snapshot.commandStatus,
        lastSensorUpdate: snapshot.lastSensorUpdate,
        lastStatusUpdate: snapshot.lastStatusUpdate,
        queueBacklog: snapshot.queueStats.total,
        now,
    });

    const smartAlerts = SmartAlertsService.generateAllAlerts(
        snapshot.sensorData ? [snapshot.sensorData] : [],
        deviceHealth,
    );

    return {
        sensor: snapshot.sensorData,
        sensorData: snapshot.sensorData,
        deviceState: snapshot.deviceState,
        deviceConfig: snapshot.deviceConfig,
        status: snapshot.deviceState.status,
        mode: snapshot.deviceState.mode,
        lastCommand: snapshot.deviceState.lastCommand,
        loading: snapshot.loading,
        history: snapshot.history,
        serialLogs: snapshot.serialLogs,
        pendingCommand: snapshot.pendingCommand,
        commandStatus: snapshot.commandStatus,
        commandSentAt: snapshot.commandSentAt,
        configSentAt: snapshot.configSentAt,
        lastUpdate,
        lastSensorUpdate: snapshot.lastSensorUpdate,
        lastHeartbeatUpdate: snapshot.lastHeartbeatUpdate,
        lastStatusUpdate: snapshot.lastStatusUpdate,
        lastMqttMessage: snapshot.lastMqttMessage,
        debug: snapshot.debug,
        mqttConnected,
        isOnline,
        isStreaming,
        events: snapshot.events,
        uiState: snapshot.uiState,
        drift,
        schedules,
        decision,
        connection: {
            ...snapshot.connection,
        },
        queueStats: snapshot.queueStats,
        deviceHealth,
        operationalHealth,
        smartAlerts,
        sendCommand,
        publishConfig,
    };
}

export type UseSensorDecision = ScheduleDecision;
