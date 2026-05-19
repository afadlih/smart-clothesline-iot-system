import { useEffect, useMemo, useState } from "react";
import { DecisionEngine } from "@/features/dashboard/DecisionEngine";
import {
    getFinalState,
    isWithinSchedule,
    type ScheduleDecision,
    type StoredScheduleItem,
} from "@/features/system/ScheduleEngine";
import { SensorData } from "@/models/SensorData";
import type { EventLog } from "@/models/EventLog";
import { EventLogService } from "@/services/EventLogService";
import { FirestoreService, sensorDataQueue } from "@/services/FirestoreService";
import {
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
import { MqttDiagnosticsService, type DeviceStateSource } from "@/services/MqttDiagnosticsService";
import { useSensorStore } from "@/stores/sensorStore";
import { useAuthStore } from "@/stores/authStore";
import { evaluateScheduleTransition } from "@/services/ScheduleRuntimeService";
import { logger } from "@/lib/logger";
import {
    WOKWI_DEFAULT_DEVICE_ID,
    getCommandPublishTopics,
    getDeviceStatusTopics,
    getDeviceTelemetryTopics,
    getDeviceConfigTopic,
    getDeviceConfigAckTopic,
} from "@/services/mqttTopics";

type ConnectionState = "connecting" | "online" | "reconnecting" | "offline" | "error";
type DeviceStatus = "OPEN" | "CLOSED" | "MOVING" | "FAULT" | "RESTARTING" | "UNKNOWN";
type DeviceMode = "AUTO" | "MANUAL";
type DeviceCommand = "OPEN" | "CLOSE" | "AUTO" | "MANUAL" | "RESTART";
type UiConnectionState = "DISCONNECTED" | "CONNECTED";
type UiStreamState = "NO_DATA" | "STREAMING" | "STALE";
type UiDeviceSyncState = "IDLE" | "WAITING_ACK" | "SYNCED";
type ConfigSyncState = "IDLE" | "PENDING" | "SYNCED" | "FAILED";

type MqttSensorPayload = {
    deviceId?: string;
    temperature: number;
    humidity: number;
    light: number;
    lightRaw?: number;
    lightThreshold?: number;
    rainVal?: number;
    rainRaw?: number;
    rain: boolean;
    timestamp?: number;
    heartbeat?: number;
    mode?: DeviceMode;
    status?: DeviceStatus;
    lastCommand?: DeviceCommand;
    receivedAt: number;
    deviceTimestamp?: number;
    deviceUptimeMs?: number;
    heartbeatAt?: number;
    duplicate: boolean;
    incomplete: boolean;
    stale: boolean;
};

const DEVICE_CONFIG_STORAGE_KEY = "smart-clothesline-device-config-v1";

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
    reconnectCount: number;
    connectedSinceAt: string | null;
    uptimeMs: number;
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
};

const MAX_HISTORY_ITEMS = 20;
const MAX_SERIAL_LOGS = 40;
const MAX_EVENT_ITEMS = 10;
const ACK_TIMEOUT_MS = 5_000;
const CONFIG_ACK_TIMEOUT_MS = 5_000;
const CONFIG_PUBLISH_INTERVAL_MS = 5_000;
const FRESHNESS_MS = 15_000;
const STATUS_DEBOUNCE_MS = 1_000;
const OFFLINE_ALERT_INTERVAL_MS = 10_000;
const TELEGRAM_ALERT_COOLDOWN_MS = 30_000;
const SENSOR_SAMPLE_INTERVAL_MS = 5 * 60 * 1000;
const ACTIVE_DEVICE_STORAGE_KEY = "smart-clothesline-active-device-id-v1";

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
};

const listeners = new Set<(snapshot: SensorSnapshot) => void>();
let streamStarted = false;
let eventHydrated = false;
let lastOfflineAlertAt = 0;
let previousDeviceStatus: DeviceStatus | null = null;
let offlineAlertRaised = false;
let lastConfigPublishAt = 0;
let lastConfigPublishKey: string | null = null;
const lastTelegramAlertAtByKey: Record<string, number> = {};
const alertConditionState: Record<string, boolean> = {};
let lastSensorStoredAt = 0;
let lastStatusPayloadAt = 0;

let lastPublishedScheduleState: "ACTIVE" | "INACTIVE" | null = null;
let sharedSchedules: StoredScheduleItem[] = [];

function loadCacheDeviceConfig(): Partial<DeviceConfig> | null {
    if (typeof window === "undefined") return null;

    try {
        const raw = localStorage.getItem(DEVICE_CONFIG_STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

function normalizePacketTimestamp(input: number | undefined, fallback: number): number {
    if (typeof input !== "number" || !Number.isFinite(input)) {
        return fallback;
    }
    let value = input;
    if (value > 0 && value < 1_000_000_000_000) {
        value *= 1000;
    }
    if (value < 1_577_836_800_000 || value > Date.now() + 5 * 60 * 1000) {
        return fallback;
    }
    return Math.floor(value);
}

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
        mqttState: sharedState.connection.state,
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

    sharedState.commandGuard = OperationalStateResolver.resolveOperationalState({
        now,
        mqttConnected: mqttService.isConnected(),
        lastTelemetryAt: sharedState.lastSensorUpdate,
        rain: sharedState.sensorData?.isRaining() ?? null,
        status: sharedState.deviceState.status,
        mode: sharedState.deviceState.mode,
        commandInFlight: sharedState.commandStatus === "pending",
        commandStartedAt: sharedState.commandSentAt,
        fault: sharedState.connection.state === "error",
    });
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
        logger.error("firestore", "Failed to save event log", error);
    });
}

function parseSensorPayload(raw: string, receivedAt: number): MqttSensorPayload | null {
    try {
        const data = JSON.parse(raw) as Record<string, unknown>;
        const normalized = TelemetryNormalizerService.normalize(data, receivedAt);
        if (!normalized.ok) {
            logger.warn("mqtt", "Invalid sensor payload", normalized.reason);
            MqttDiagnosticsService.recordRejected(normalized.reason);
            return null;
        }
        return {
            deviceId: normalized.value.deviceId,
            temperature: normalized.value.temperature,
            humidity: normalized.value.humidity,
            light: normalized.value.light,
            lightRaw: normalized.value.lightRaw,
            lightThreshold: normalized.value.lightThreshold,
            rainVal: normalized.value.rainVal,
            rainRaw: normalized.value.rainRaw,
            rain: normalized.value.rain,
            timestamp: normalized.value.timestamp,
            heartbeat: normalized.value.heartbeat,
            mode: normalized.value.mode,
            status: normalized.value.deviceState,
            lastCommand: normalized.value.lastCommand,
            receivedAt: normalized.value.receivedAt,
            deviceTimestamp: normalized.value.deviceTimestamp,
            deviceUptimeMs: normalized.value.deviceUptimeMs,
            heartbeatAt: normalized.value.heartbeatAt,
            duplicate: normalized.duplicate,
            incomplete: normalized.value.incomplete,
            stale: normalized.value.stale,
        };
    } catch {
        logger.warn("mqtt", "Failed to parse sensor payload", raw);
        MqttDiagnosticsService.recordRejected("Failed to parse sensor payload");
        return null;
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

    if (!activeDeviceId) return false;

    if (!payloadDeviceId) {
        const accepted = activeDeviceId !== WOKWI_DEFAULT_DEVICE_ID;
        if (!accepted) {
            logger.info("mqtt", "Filtered payload for another device", {
                activeDeviceId,
                payloadDeviceId: null,
            });
        }
        return accepted;
    }

    const accepted = payloadDeviceId === activeDeviceId;
    if (!accepted) {
        logger.info("mqtt", "Filtered payload for another device", {
            activeDeviceId,
            payloadDeviceId: payloadDeviceId ?? null,
        });
    }
    return accepted;
}

function applyConfigAckPayload(payload: MqttConfigAckPayload, receivedAt: number): void {
    if (!shouldAcceptConfigAckPayload(payload)) {
        logger.info("mqtt", "Filtered config ack payload", {
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

    if (typeof window !== "undefined") {
        localStorage.setItem(
            DEVICE_CONFIG_STORAGE_KEY,
            JSON.stringify(sharedState.deviceConfig)
        )
    }

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
                logger.warn("mqtt", "Invalid config ack payload", raw);
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

        let statusInput = typeof data.status === "string" ? data.status.toUpperCase() : "";
        if (statusInput === "OPENING" || statusInput === "CLOSING") {
            statusInput = "MOVING";
        }

        if (statusInput === "RESTARTING") {
            return {
                kind: "device",
                payload: {
                    deviceId: typeof data.deviceId === "string" ? data.deviceId : undefined,
                    status: "RESTARTING",
                    mode: (data.mode === "AUTO" || data.mode === "MANUAL") ? data.mode : (sharedState.deviceState.mode ?? "MANUAL"),
                    lastCommand: data.lastCommand === "RESTART" ? "RESTART" : undefined,
                    timestamp: typeof data.timestamp === "number" ? data.timestamp : undefined,
                },
            };
        }

        if (
            (statusInput !== "OPEN" && statusInput !== "CLOSED" && statusInput !== "MOVING") ||
            (data.mode !== "AUTO" && data.mode !== "MANUAL")
        ) {
            logger.warn("mqtt", "Invalid status payload", raw);
            return null;
        }

        return {
            kind: "device",
            payload: {
                deviceId: typeof data.deviceId === "string" ? data.deviceId : undefined,
                status: statusInput as DeviceStatus,
                mode: data.mode,
                lastCommand:
                    data.lastCommand === "OPEN" || data.lastCommand === "CLOSE" || data.lastCommand === "AUTO" || data.lastCommand === "MANUAL" || data.lastCommand === "RESTART"
                        ? data.lastCommand
                        : undefined,
                source: data.source === "DEVICE" ? data.source : undefined,
                timestamp: typeof data.timestamp === "number" ? data.timestamp : undefined,
            },
        };
    } catch {
        logger.warn("mqtt", "Failed to parse status payload", raw);
        return null;
    }
}

function mapToSensorData(message: MqttSensorPayload): SensorData {
    const timestamp = normalizePacketTimestamp(message.timestamp, Date.now());
    const statusFromState = toInternalStatus(sharedState.deviceState.status);
    const statusFromSensor =
        message.status === "OPEN" || message.status === "CLOSED"
            ? message.status
            : statusFromState;
    return new SensorData({
        temp: message.temperature,
        humidity: message.humidity,
        light: message.light,
        lightRaw: message.lightRaw,
        lightThreshold: message.lightThreshold,
        rainVal: message.rainVal,
        rainRaw: message.rainRaw,
        rain: message.rain ? 1 : 0,
        status: statusFromSensor,
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
        debug: {
            ...sharedState.debug,
            mqttDiagnostics: { ...sharedState.debug.mqttDiagnostics },
            scheduleRuntime: { ...sharedState.debug.scheduleRuntime },
        },
        events: [...sharedState.events],
        connection: { ...sharedState.connection },
        queueStats: { ...sharedState.queueStats },
        commandGuard: {
            ...sharedState.commandGuard,
            disabledCommands: [...sharedState.commandGuard.disabledCommands],
        },
    };
}

function notifyListeners(): void {
    updateUiState();
    MqttDiagnosticsService.setFreshness(Date.now(), sharedState.lastSensorUpdate, sharedState.lastHeartbeatUpdate);
    sharedState.debug.mqttDiagnostics = MqttDiagnosticsService.snapshot();
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
    if (pending === "MANUAL") {
        return payload.mode === "MANUAL" && payload.lastCommand === "MANUAL";
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
    void sendTelegramAlert(title, description, key, timestamp);
}

async function sendTelegramAlert(title: string, description: string, alertKey: string, timestamp: number): Promise<void> {
    const now = Date.now();
    const lastSentAt = lastTelegramAlertAtByKey[alertKey] ?? 0;
    if (now - lastSentAt < TELEGRAM_ALERT_COOLDOWN_MS) {
        return;
    }

    lastTelegramAlertAtByKey[alertKey] = now;
    try {
        await fetch("/api/telegram/notify", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                title,
                description,
                severity: "warning",
                alertKey,
                timestamp,
            }),
        });
    } catch (error) {
        logger.warn("telegram", "Failed to send alert notification", error);
    }
}

function detectRealtimeAlerts(sensor: SensorData | null, status: DeviceStatus | null, timestamp: number): void {
    if (!sensor) {
        return;
    }

    const rainOpen = sensor.isRaining() && status === "OPEN";
    const dryLikely = sensor.humidity < 50 && sensor.temperature > 30;

    if (rainOpen && !alertConditionState["alert-rain-open"]) {
        pushAlertIfNeeded(
            "Rain detected while clothesline is OPEN",
            `Device remains OPEN while rain=true. Temp=${sensor.temperature.toFixed(1)}C Hum=${sensor.humidity.toFixed(1)}% Light=${sensor.light.toFixed(0)}.`,
            "alert-rain-open",
            timestamp,
        );
    }
    alertConditionState["alert-rain-open"] = rainOpen;

    if (dryLikely && !alertConditionState["alert-dry-clothes"]) {
        pushAlertIfNeeded(
            "Clothes are likely dry",
            `Humidity=${sensor.humidity.toFixed(1)}% and temperature=${sensor.temperature.toFixed(1)}C.`,
            "alert-dry-clothes",
            timestamp,
        );
    }
    alertConditionState["alert-dry-clothes"] = dryLikely;
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
        "No fresh telemetry (stale)",
        "No MQTT data for more than 15 seconds. Device may be delayed or unreachable.",
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
                logger.error("firestore", "Failed to fetch recent events", error);
            });
    }

    const activeDeviceId = getActiveDeviceId();
    if (!activeDeviceId) {
        appendSerialLog("ALERT", "No active device selected; MQTT telemetry subscription skipped", Date.now(), "WARN");
        sharedState.loading = false;
        notifyListeners();
        return;
    }

    const sensorTopics = getDeviceTelemetryTopics(activeDeviceId);
    const statusTopics = getDeviceStatusTopics(activeDeviceId);
    const configAckTopic = getDeviceConfigAckTopic(activeDeviceId);

    logger.info("mqtt", "Subscribing active device topics", {
        activeDeviceId,
        sensorTopics,
        statusTopics,
        configAckTopic,
    });

    const sensorTopicSet = new Set(sensorTopics);
    const statusTopicSet = new Set(statusTopics);

    const handleTopicMessage = (rawPayload: string, topic: string) => {
        const receivedAt = Date.now();
        sharedState.lastMqttMessage = {
            topic,
            payload: rawPayload,
            receivedAt,
        };

        if (sensorTopicSet.has(topic)) {
            MqttDiagnosticsService.recordSensorPayload(rawPayload, receivedAt);
            const payload = parseSensorPayload(rawPayload, receivedAt);
            if (!payload) {
                return;
            }

            if (!shouldAcceptSensorPayload(payload)) {
                logger.info("mqtt", "Filtered sensor payload", {
                    activeDeviceId: getActiveDeviceId(),
                    payloadDeviceId: payload.deviceId ?? null,
                });
                MqttDiagnosticsService.recordFilteredDevice();
                return;
            }

            if (payload.duplicate) {
                sharedState.debug.dedupedStatusCount += 1;
                MqttDiagnosticsService.recordDuplicate();
            }

            const sensorTimestamp = normalizePacketTimestamp(payload.timestamp, receivedAt);
            const heartbeatTimestamp = normalizePacketTimestamp(payload.heartbeat, sensorTimestamp);

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

            const statusTopicFresh = lastStatusPayloadAt > 0 && receivedAt - lastStatusPayloadAt <= 30_000;
            if (!statusTopicFresh && payload.status && payload.mode) {
                sharedState.deviceState = {
                    status: payload.status,
                    mode: payload.mode,
                    lastCommand: payload.lastCommand ?? sharedState.deviceState.lastCommand,
                    updatedAt: sensorTimestamp,
                };
                sharedState.debug.deviceStateSource = "SENSOR_FALLBACK";
                MqttDiagnosticsService.setDeviceStateSource("SENSOR_FALLBACK");
            }

            const shouldStore =
                !payload.duplicate ||
                Date.now() - lastSensorStoredAt >= SENSOR_SAMPLE_INTERVAL_MS;
            if (shouldStore) {
                lastSensorStoredAt = Date.now();
                const payloadForStorage = {
                    deviceId: payload.deviceId,
                    temperature: payload.temperature,
                    humidity: payload.humidity,
                    light: payload.light,
                    lightRaw: payload.lightRaw,
                    lightThreshold: payload.lightThreshold,
                    rainVal: payload.rainVal,
                    rainRaw: payload.rainRaw,
                    rain: payload.rain,
                    status: toInternalStatus(sharedState.deviceState.status),
                    mode: sharedState.deviceState.mode ?? undefined,
                    source: sharedState.debug.deviceStateSource,
                    receivedAt,
                    deviceTimestamp: payload.deviceTimestamp,
                    deviceUptimeMs: payload.deviceUptimeMs,
                } as const;
                void FirestoreService.saveSensorData(payloadForStorage).catch((error) => {
                    logger.error("firestore", "Failed to save sensor data", error);
                });
            }

            if (!payload.duplicate) {
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
            }

            appendSerialLog(
                "SENSOR",
                `temp=${payload.temperature.toFixed(1)}C hum=${payload.humidity.toFixed(1)}% light=${payload.light.toFixed(0)} rain=${payload.rain ? "yes" : "no"}`,
                sensorTimestamp,
                (sharedState.deviceConfig.autoCloseOnRain && payload.rain) ||
                    (sharedState.deviceConfig.autoCloseOnDark && data.isDark(sharedState.deviceConfig.lightThreshold))
                    ? "WARN"
                    : "INFO",
            );
            if (!payload.duplicate) {
                pushSystemEvent({
                    type: "SENSOR",
                    title: "Sensor update",
                    description: `Temp ${payload.temperature.toFixed(1)}C, Hum ${payload.humidity.toFixed(1)}%, Light ${payload.light.toFixed(0)}, Rain ${payload.rain ? "yes" : "no"}`,
                    timestamp: sensorTimestamp,
                });
            }

            detectRealtimeAlerts(data, sharedState.deviceState.status, sensorTimestamp);

            logger.info("mqtt", "Sensor state update", {
                topic,
                sensor: {
                    temperature: payload.temperature,
                    humidity: payload.humidity,
                    light: payload.light,
                    rainVal: payload.rainVal,
                    rain: payload.rain,
                },
            });
            notifyListeners();
            return;
        }

        if (topic === configAckTopic) {
            MqttDiagnosticsService.recordConfigAckPayload(rawPayload, receivedAt);
            const packet = parseStatusPacket(rawPayload);
            if (packet?.kind === "configAck") {
                applyConfigAckPayload(packet.payload, receivedAt);
            }
            return;
        }

        if (!statusTopicSet.has(topic)) {
            notifyListeners();
            return;
        }
        MqttDiagnosticsService.recordStatusPayload(rawPayload, receivedAt);
        lastStatusPayloadAt = receivedAt;

        const packet = parseStatusPacket(rawPayload);
        if (!packet) {
            MqttDiagnosticsService.recordRejected("Invalid status payload");
            return;
        }

        if (packet.kind === "configAck") {
            applyConfigAckPayload(packet.payload, receivedAt);
            return;
        }

        const payload = packet.payload;
        const statusTimestamp = normalizePacketTimestamp(payload.timestamp, receivedAt);
        if (!shouldAcceptStatusPayload(payload)) {
            logger.info("mqtt", "Filtered status payload", {
                activeDeviceId: getActiveDeviceId(),
                payloadDeviceId: payload.deviceId ?? null,
            });
            MqttDiagnosticsService.recordFilteredDevice();
            return;
        }
        const ackMatched = matchesAcknowledgement(payload);
        if (ackMatched) {
            clearPendingCommandAsSuccess();
            appendLegacyEvent({
                type: "DEVICE",
                action: "STATUS_ACK",
                status: toInternalStatus(payload.status),
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
        sharedState.debug.deviceStateSource = "STATUS_TOPIC";
        MqttDiagnosticsService.setDeviceStateSource("STATUS_TOPIC");
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
        sharedState.debug.deviceStateSource = "STATUS_TOPIC";
        MqttDiagnosticsService.setDeviceStateSource("STATUS_TOPIC");

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

        logger.info("mqtt", "Status state update", {
            topic,
            status: payload.status,
            mode: payload.mode,
            lastCommand: payload.lastCommand ?? null,
        });
        notifyListeners();
    };

    for (const sensorTopic of sensorTopics) {
        mqttService.subscribeTopic(sensorTopic, handleTopicMessage);
    }
    for (const statusTopic of statusTopics) {
        mqttService.subscribeTopic(statusTopic, handleTopicMessage);
    }
    mqttService.subscribeTopic(configAckTopic, handleTopicMessage);
}

export function sendCommand(command: DeviceCommand): boolean {
    const now = Date.now();
    updateUiState(now);
    const guard = sharedState.commandGuard;
    if (guard.disabledCommands.includes(command) || !guard.canSendCommand) {
        logger.warn("mqtt", "Command blocked by operational guard", {
            command,
            state: guard.state,
            reason: guard.reason,
        });
        pushSystemEvent({
            type: "ALERT",
            title: "Command blocked",
            description: guard.reason,
            timestamp: now,
        });
        return false;
    }
    const isDeviceOnline = sharedState.uiState.connection === "CONNECTED";

    if (!isDeviceOnline) {
        logger.warn("mqtt", "Command blocked because device is offline");
        pushSystemEvent({
            type: "ALERT",
            title: "Command blocked",
            description: "Device is offline, cannot send command",
            timestamp: now,
        });
        return false;
    }

    if (sharedState.commandStatus === "pending") {
        return false;
    }

    if (!mqttService.isConnected()) {
        logger.warn("mqtt", "Command blocked because MQTT is disconnected");
        pushSystemEvent({
            type: "ALERT",
            title: "Command blocked",
            description: "MQTT disconnected, cannot send command",
            timestamp: now,
        });
        return false;
    }

    // ===== RATE LIMITING CHECK =====
    const rateLimitCheck = commandRateLimiter.canSend(command);
    if (!rateLimitCheck.allowed) {
        logger.warn("mqtt", "Command rate limited", {
            command,
            waitMs: rateLimitCheck.waitMs,
        });
        pushSystemEvent({
            type: "ALERT",
            title: "Command rate limited",
            description: `Please wait ${Math.ceil((rateLimitCheck.waitMs ?? 0) / 1000)}s before sending another command`,
            timestamp: now,
        });
        return false;
    }

    const activeDeviceId = getActiveDeviceId();

    if (!activeDeviceId) {
        logger.warn("mqtt", "Command blocked because no active device is selected");
        pushSystemEvent({
            type: "ALERT",
            title: "Command blocked",
            description: "No active device selected",
            timestamp: now,
        });
        return false;
    }

    const commandPayload = {
        deviceId: activeDeviceId,
        command,
    };

    commandRateLimiter.recordSend(command);

    sharedState.pendingCommand = command;
    sharedState.commandStatus = "pending";
    sharedState.commandSentAt = now;
    notifyListeners();

    const commandTopics = getCommandPublishTopics(activeDeviceId);

    appendSerialLog(
        "COMMAND",
        `${command} -> publish ${commandTopics.join(", ")} target=${activeDeviceId}`,
        now,
    );

    appendLegacyEvent({
        type: "USER",
        action: command,
        timestamp: now,
    });

    pushSystemEvent({
        type: "COMMAND",
        title: "Command sent",
        description: `USER -> ${command} (${activeDeviceId})`,
        timestamp: now,
    });

    MqttDiagnosticsService.recordCommandPayload(JSON.stringify(commandPayload), now);

    const published = commandTopics
        .map((topic) => mqttService.publish(topic, commandPayload))
        .some(Boolean);

    if (!published) {
        sharedState.pendingCommand = null;
        sharedState.commandStatus = "idle";
        sharedState.commandSentAt = null;
        notifyListeners();
    }
    return published;
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

    const activeDeviceId = getActiveDeviceId();

    if (!activeDeviceId) {
        sharedState.deviceConfig = {
            ...sharedState.deviceConfig,
            syncState: "FAILED",
            syncMessage: "Sync failed: no active device selected",
        };
        appendSerialLog("CONFIG", "FAILED no active device selected", now, "WARN");
        pushSystemEvent({
            type: "CONFIG",
            title: "Config sync failed",
            description: "No active device selected",
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

    const configTopic = getDeviceConfigTopic(activeDeviceId);

    appendSerialLog(
        "CONFIG",
        `PUBLISH ${configTopic} rainThreshold=${config.rainThreshold} lightThreshold=${config.lightThreshold} updateIntervalSec=${config.updateIntervalSec} autoCloseOnRain=${config.autoCloseOnRain} autoCloseOnDark=${config.autoCloseOnDark} autoOpenWhenSafe=${config.autoOpenWhenSafe}`,
        now,
    );
    pushSystemEvent({
        type: "CONFIG",
        title: "Config publish",
        description: `target=${activeDeviceId}, rain=${config.rainThreshold}, light=${config.lightThreshold}, interval=${config.updateIntervalSec}s`,
        timestamp: now,
    });
    appendLegacyEvent({
        type: "SYSTEM",
        action: "CONFIG_PUBLISH",
        timestamp: now,
    });
    mqttService.publish(configTopic, {
        deviceId: activeDeviceId,
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

    const cached = loadCacheDeviceConfig();
    if (cached) {
        sharedState.deviceConfig = {
            ...sharedState.deviceConfig,
            ...cached,
            syncState: "IDLE",
            syncMessage: "Using last known device config: waiting for device confirmation"
        }
    }

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
            const activeDeviceId = getActiveDeviceId();
            const currentUser = useAuthStore.getState().user;
            let result;
            let source: "firestore" | "cache" | "none" = "none";
            if (currentUser && activeDeviceId) {
                result = await ScheduleService.loadDeviceSchedules({
                    uid: currentUser.uid,
                    deviceId: activeDeviceId
                });
                source = result.fromCache ? "cache" : "firestore";
            } else {
                result = await ScheduleService.loadSchedules();
                source = result.fromCache ? "cache" : "firestore";
            }
            if (!active) {
                return;
            }
            sharedSchedules = result.schedules;
            setSchedules(result.schedules);
            sharedState.debug.scheduleRuntime = {
                ...sharedState.debug.scheduleRuntime,
                loaded: true,
                source,
            };
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

        void refreshSchedules();

        const timer = window.setInterval(() => {
            const nextNow = Date.now();
            setNow(nextNow);
            updateUiState(nextNow);
            detectOfflineAlert(nextNow);

            // ===== SCHEDULE ENGINE EXECUTION =====
            const activeDeviceId = getActiveDeviceId();
            const isMqttConnected = mqttService.isConnected();
            const isTelemetryStreaming = sharedState.uiState.stream === "STREAMING";
            
            // Determine active schedule for diagnostics
            const dateObj = new Date(nextNow);
            const currentHourFloat = dateObj.getHours() + dateObj.getMinutes() / 60 + dateObj.getSeconds() / 3600;
            const currentActiveSchedule = sharedSchedules.find((s) => isWithinSchedule(s, currentHourFloat)) ?? null;
            
            sharedState.debug.scheduleRuntime = {
                ...sharedState.debug.scheduleRuntime,
                deviceId: activeDeviceId,
                activeScheduleId: currentActiveSchedule ? currentActiveSchedule.id : null,
                isActiveNow: currentActiveSchedule !== null,
            };

            const shouldRunSchedule = activeDeviceId && isMqttConnected && isTelemetryStreaming;
            if (shouldRunSchedule) {
                const rain = sharedState.sensorData?.isRaining() ?? false;
                const isDark = sharedState.sensorData?.isDark(sharedState.deviceConfig.lightThreshold) ?? false;
                
                const decision = evaluateScheduleTransition({
                    now: nextNow,
                    currentStatus: sharedState.deviceState.status,
                    mode: sharedState.deviceState.mode,
                    schedules: sharedSchedules,
                    sensorRain: rain,
                    isDark,
                    lastPublishedScheduleState,
                });
                
                if (decision.shouldPublish && decision.command) {
                    lastPublishedScheduleState = currentActiveSchedule !== null ? "ACTIVE" : "INACTIVE";
                    
                    sharedState.debug.scheduleRuntime.lastCommand = decision.command;
                    sharedState.debug.scheduleRuntime.lastCommandAt = nextNow;
                    sharedState.debug.scheduleRuntime.lastReason = decision.reason;
                    
                    const topics = getCommandPublishTopics(activeDeviceId);
                    const payload = {
                        deviceId: activeDeviceId,
                        command: decision.command,
                        source: "schedule",
                        reason: decision.reason,
                        timestamp: nextNow,
                    };
                    
                    appendSerialLog(
                        "COMMAND",
                        `[Schedule] ${decision.command} -> publish ${topics.join(", ")} reason: ${decision.reason}`,
                        nextNow,
                    );
                    
                    pushSystemEvent({
                        type: "COMMAND",
                        title: "Schedule Command",
                        description: decision.reason,
                        timestamp: nextNow,
                    });
                    
                    appendLegacyEvent({
                        type: "SYSTEM",
                        action: decision.command,
                        timestamp: nextNow,
                    });
                    
                    topics.forEach((topic) => {
                        mqttService.publish(topic, payload);
                    });
                }
            } else {
                let blockReason = "Waiting for transition.";
                if (!activeDeviceId) blockReason = "Blocked: No active device selected.";
                else if (!isMqttConnected) blockReason = "Blocked: MQTT is disconnected.";
                else if (!isTelemetryStreaming) blockReason = "Blocked: Telemetry not streaming.";
                
                sharedState.debug.scheduleRuntime.lastReason = blockReason;
            }

            notifyListeners();
        }, 1000);

        // ===== FIRESTORE QUEUE SYNC =====
        const queueSyncTimer = window.setInterval(async () => {
            const stats = sensorDataQueue.getStats();
            if (stats.total > 0 && mqttService.isConnected()) {
                logger.info("firestore", "Attempting queued sensor data sync", stats);
                try {
                    const synced = await FirestoreService.syncQueuedSensorData();
                    if (synced > 0) {
                        logger.info("firestore", "Queued sensor data synced", { synced });
                        pushSystemEvent({
                            type: "CONFIG",
                            title: "Queue synced",
                            description: `${synced} queued sensor readings uploaded to Firestore`,
                            timestamp: Date.now(),
                        });
                    }
                } catch (error) {
                    logger.error("firestore", "Queued sensor data sync failed", error);
                }
            }
        }, 10000); // Every 10 seconds

        return () => {
            active = false;
            window.clearInterval(timer);
            window.clearInterval(scheduleRefreshTimer);
            window.clearInterval(queueSyncTimer);
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
        pendingManual:
            snapshot.pendingCommand === "CLOSE"
                ? "CLOSED"
                : snapshot.pendingCommand === "MANUAL"
                    ? null
                    : snapshot.pendingCommand,
        currentHour: new Date(now).getHours(),
        safetyConfig: {
            lightThreshold: snapshot.deviceConfig.lightThreshold,
            rainThreshold: snapshot.deviceConfig.rainThreshold,
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
        connectionState: snapshot.connection.state,
        reconnectCount: snapshot.connection.reconnectCount,
        connectionUptimeMs: snapshot.connection.uptimeMs,
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
        scheduleRuntime: snapshot.debug.scheduleRuntime,
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
        commandGuard: snapshot.commandGuard,
        deviceHealth,
        operationalHealth,
        smartAlerts,
        sendCommand,
        publishConfig,
    };
}

export type UseSensorDecision = ScheduleDecision;

