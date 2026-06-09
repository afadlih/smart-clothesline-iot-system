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
import { FirestoreService } from "@/services/FirestoreService";
import {
    mqttService,
} from "@/services/MQTTService";
import { pushSystemEvent } from "@/hooks/useNotificationEngine";
import { commandRateLimiter } from "@/utils/rateLimiter";
import { DeviceHealthService } from "@/services/DeviceHealthService";
import { SmartAlertsService } from "@/services/SmartAlertsService";
import { ScheduleService } from "@/services/ScheduleService";
import { TelemetryNormalizerService } from "@/services/TelemetryNormalizerService";
import { OperationalStateResolver } from "@/services/OperationalStateResolver";
import { MqttDiagnosticsService } from "@/services/MqttDiagnosticsService";
import { useAuthStore } from "@/stores/authStore";
import { logger } from "@/lib/logger";
import {
    WOKWI_DEFAULT_DEVICE_ID,
    getCommandPublishTopics,
    getDeviceStatusTopics,
    getDeviceTelemetryTopics,
    getDeviceConfigTopic,
    getDeviceConfigAckTopic,
} from "@/services/mqttTopics";
import { useMainStore } from "@/stores/useMainStore";
import { useMqttConnection, useFirestoreSync, useScheduleRunner } from "@/features/sensor";

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

const MAX_HISTORY_ITEMS = 20;
const MAX_SERIAL_LOGS = 40;
const MAX_EVENT_ITEMS = 10;
const CONFIG_PUBLISH_INTERVAL_MS = 5_000;
const FRESHNESS_MS = 15_000;
const STATUS_DEBOUNCE_MS = 1_000;
const OFFLINE_ALERT_INTERVAL_MS = 10_000;
const TELEGRAM_ALERT_COOLDOWN_MS = 30_000;
const SENSOR_SAMPLE_INTERVAL_MS = 5 * 60 * 1000;
const ACTIVE_DEVICE_STORAGE_KEY = "smart-clothesline-active-device-id-v1";

let lastOfflineAlertAt = 0;
let previousDeviceStatus: DeviceStatus | null = null;
let offlineAlertRaised = false;
let hookMountedAt = 0;
let lastConfigPublishAt = 0;
let lastConfigPublishKey: string | null = null;
const lastTelegramAlertAtByKey: Record<string, number> = {};
const alertConditionState: Record<string, boolean> = {};
let lastSensorStoredAt = 0;

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
        mqttState: useMainStore.getState().connection.state,
        lastHeartbeatAt: useMainStore.getState().lastHeartbeatUpdate,
        lastTelemetryAt: useMainStore.getState().lastSensorUpdate,
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
            useMainStore.getState().commandStatus === "pending"
                ? "WAITING_ACK"
                : useMainStore.getState().commandStatus === "success"
                    ? "SYNCED"
                    : "IDLE",
    };

    const prev = useMainStore.getState().uiState;
    if (
        prev.connection !== nextUiState.connection ||
        prev.stream !== nextUiState.stream ||
        prev.deviceSync !== nextUiState.deviceSync
    ) {
        useMainStore.getState().updateState((df) => {
            df.debug.lastTransition = `${prev.connection}/${prev.stream}/${prev.deviceSync} -> ${nextUiState.connection}/${nextUiState.stream}/${nextUiState.deviceSync}`;
            df.debug.lastTransitionAt = now;
        })
    }
    useMainStore.getState().updateState((draft) => {
        draft.uiState = nextUiState;
    });

    useMainStore.getState().updateState((draft) => {
        draft.commandGuard = OperationalStateResolver.resolveOperationalState({
            now,
            mqttConnected: mqttService.isConnected(),
            lastTelemetryAt: draft.lastSensorUpdate,
            rain: draft.sensorData?.isRaining() ?? null,
            status: draft.deviceState.status,
            mode: draft.deviceState.mode,
            commandInFlight: draft.commandStatus === "pending",
            commandStartedAt: draft.commandSentAt,
            fault: draft.connection.state === "error",
        });
        ;
    });
}

export function updateConnectionStatus(
    patch: Partial<Omit<ConnectionSnapshot, "topic" | "source">>,
): void {
    useMainStore.getState().updateState((draft) => {
        draft.connection = {
            ...draft.connection,
            ...patch
        };
    });
    updateUiState();
}

export function appendSerialLog(
    prefix: "SENSOR" | "STATUS" | "COMMAND" | "CONFIG" | "ALERT",
    message: string,
    timestampMs: number,
    level: "INFO" | "WARN" = "INFO",
): void {
    const timestamp = new Date(timestampMs).toISOString();
    const id = `${prefix}-${timestampMs}-${Math.random().toString(36).slice(2, 10)}`;

    useMainStore.getState().updateState((draft) => {
        draft.serialLogs = [
            {
                id,
                level,
                message: `[${prefix}] ${message}`,
                timestamp
            }
        ].slice(0, MAX_SERIAL_LOGS);
    })
}

function appendLegacyEvent(event: EventLog): void {
    useMainStore.getState().updateState((draft) => {
        draft.events = [event, ...draft.events].slice(0, MAX_EVENT_ITEMS);
    });

    void EventLogService.logEvent(event).catch((error) => {
        logger.error("firestore", "Failed to save event log", error);
    });
}

export function parseSensorPayload(raw: string, receivedAt: number): MqttSensorPayload | null {
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
    useMainStore.getState().updateState((draft) => {
        draft.deviceConfig = {
            rainThreshold: payload.rainThreshold,
            lightThreshold: payload.lightThreshold,
            updateIntervalSec: payload.updateIntervalSec ?? useMainStore.getState().deviceConfig.updateIntervalSec,
            autoCloseOnRain: payload.autoCloseOnRain ?? useMainStore.getState().deviceConfig.autoCloseOnRain,
            autoCloseOnDark: payload.autoCloseOnDark ?? useMainStore.getState().deviceConfig.autoCloseOnDark,
            autoOpenWhenSafe: payload.autoOpenWhenSafe ?? useMainStore.getState().deviceConfig.autoOpenWhenSafe,
            syncState: "SYNCED",
            lastSyncAt: ackTimestamp,
            syncMessage: "Config synced with device",
        };;
    });
    useMainStore.getState().updateState((draft) => {
        draft.configSentAt = null;
    });

    if (typeof window !== "undefined") {
        localStorage.setItem(
            DEVICE_CONFIG_STORAGE_KEY,
            JSON.stringify(useMainStore.getState().deviceConfig)
        )
    }

    appendSerialLog(
        "CONFIG",
        `ACK rainThreshold=${payload.rainThreshold} lightThreshold=${payload.lightThreshold} updateIntervalSec=${payload.updateIntervalSec ?? useMainStore.getState().deviceConfig.updateIntervalSec}`,
        ackTimestamp,
    );
    pushSystemEvent({
        type: "CONFIG",
        title: "Config synced",
        description: `rainThreshold=${payload.rainThreshold}, lightThreshold=${payload.lightThreshold}, updateIntervalSec=${payload.updateIntervalSec ?? useMainStore.getState().deviceConfig.updateIntervalSec}`,
        timestamp: ackTimestamp,
    });
    appendLegacyEvent({
        type: "SYSTEM",
        action: "CONFIG_ACK",
        timestamp: ackTimestamp,
    });
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
                    mode: (data.mode === "AUTO" || data.mode === "MANUAL") ? data.mode : (useMainStore.getState().deviceState.mode ?? "MANUAL"),
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
    const statusFromState = toInternalStatus(useMainStore.getState().deviceState.status);
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

function clearPendingCommandAsSuccess(): void {
    useMainStore.getState().updateState((draft) => {
        draft.commandStatus = "success";
        draft.pendingCommand = null;
        draft.commandSentAt = null;
        draft.debug.lastAckResult = "matched";
    });
}

function matchesAcknowledgement(payload: MqttDeviceStatusPayload): boolean {
    const pending = useMainStore.getState().pendingCommand;
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

    let notificationType = "custom";
    if (alertKey === "alert-rain-open") notificationType = "rain_detected";
    if (alertKey === "alert-dry-clothes") notificationType = "dry_candidate";
    if (alertKey === "alert-device-offline") notificationType = "device_offline";
    if (alertKey === "alert-device-online") notificationType = "device_online";

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
                type: notificationType,
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
    if (hookMountedAt > 0 && now - hookMountedAt < 15_000) {
        return;
    }
    const lastFreshAt = Math.max(useMainStore.getState().lastSensorUpdate ?? 0, useMainStore.getState().lastStatusUpdate ?? 0);
    const isFresh = lastFreshAt > 0 && now - lastFreshAt < FRESHNESS_MS;
    if (isFresh) {
        if (offlineAlertRaised) {
            offlineAlertRaised = false;
            pushAlertIfNeeded(
                "Device is online",
                "Device has reconnected and telemetry sync is restored.",
                "alert-device-online",
                now,
            );
        }
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

function handleTopicMessage(rawPayload: string, topic: string): void {
    const receivedAt = Date.now();
    useMainStore.getState().updateState((df) => {
        df.lastMqttMessage = {
            topic,
            payload: rawPayload,
            receivedAt
        };
    });

    const activeDeviceId = getActiveDeviceId();
    if (!activeDeviceId) return;

    const sensorTopicSet = new Set(getDeviceTelemetryTopics(activeDeviceId));
    const statusTopicSet = new Set(getDeviceStatusTopics(activeDeviceId));
    const configAckTopic = getDeviceConfigAckTopic(activeDeviceId);

    if (sensorTopicSet.has(topic)) {
        MqttDiagnosticsService.recordSensorPayload(rawPayload, receivedAt);
        const payload = parseSensorPayload(rawPayload, receivedAt);
        if (!payload) {
            return;
        }

        if (!shouldAcceptSensorPayload(payload)) {
            logger.info("mqtt", "Filtered sensor payload", {
                activeDeviceId,
                payloadDeviceId: payload.deviceId ?? null,
            });
            MqttDiagnosticsService.recordFilteredDevice();
            return;
        }

        const data = mapToSensorData(payload);
        const sensorTimestamp = normalizePacketTimestamp(payload.timestamp, receivedAt);

        const isDuplicateSensor =
            useMainStore.getState().sensorData?.temperature === payload.temperature &&
            useMainStore.getState().sensorData?.humidity === payload.humidity &&
            useMainStore.getState().sensorData?.light === payload.light &&
            useMainStore.getState().sensorData?.rain === (payload.rain ? 1 : 0) &&
            useMainStore.getState().sensorData?.status === data.status;

        useMainStore.getState().updateState((df) => {
            df.sensorData = data;
            df.lastSensorUpdate = receivedAt;
            df.lastHeartbeatUpdate = sensorTimestamp;
            df.loading = false;
        })
        updateConnectionStatus({
            state: "online",
            isOnline: true,
            lastError: null,
            lastMessageAt: new Date(sensorTimestamp).toISOString(),
        });

        if (isDuplicateSensor && !payload.duplicate) {
            useMainStore.getState().updateState((df) => {
                df.debug.dedupedStatusCount += 1;
            })
            detectRealtimeAlerts(data, useMainStore.getState().deviceState.status, sensorTimestamp);
            return;
        }

        const previousStatus = useMainStore.getState().deviceState.status;
        const newStatusFromSensor = payload.status === "OPEN" || payload.status === "CLOSED" ? payload.status : null;
        if (newStatusFromSensor && newStatusFromSensor !== previousStatus) {
            useMainStore.getState().updateState((df) => {
                df.deviceState.status = newStatusFromSensor;
                df.deviceState.updatedAt = sensorTimestamp;
            });
            MqttDiagnosticsService.setDeviceStateSource("SENSOR_FALLBACK");
            if (previousStatus !== newStatusFromSensor || previousDeviceStatus !== newStatusFromSensor) {
                pushSystemEvent({
                    type: "STATUS",
                    title: "Status changed (sensor)",
                    description: `${previousStatus ?? "--"} -> ${newStatusFromSensor} (fallback)`,
                    timestamp: sensorTimestamp,
                });
                previousDeviceStatus = newStatusFromSensor;
            }
            useMainStore.getState().updateState((draft) => {
                draft.debug.deviceStateSource = "SENSOR_FALLBACK"
            })
            MqttDiagnosticsService.setDeviceStateSource("SENSOR_FALLBACK");
        }

        const prevData = useMainStore.getState().sensorData;

        const TEMP_TREHS = 1;
        const LIGHT_TRESH = 150;
        const HUMIDITY_THRESHOLD = 1.3;


        const shouldStore =
            !prevData ||
            Math.abs(prevData.temperature - payload.temperature) >= TEMP_TREHS ||
            Math.abs(prevData.light - payload.light) >= LIGHT_TRESH ||
            Math.abs(prevData.humidity - payload.humidity) >= HUMIDITY_THRESHOLD ||
            Math.abs(prevData.light - payload.light) >= LIGHT_TRESH ||
            prevData.rain !== (payload.rain ? 1 : 0) ||
            prevData.status !== data.status ||
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
                status: toInternalStatus(useMainStore.getState().deviceState.status),
                mode: useMainStore.getState().deviceState.mode ?? undefined,
                source: useMainStore.getState().debug.deviceStateSource,
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
            const historyStatus = toInternalStatus(useMainStore.getState().deviceState.status);
            useMainStore.getState().updateState((draft) => {
                draft.history = [
                    {
                        id,
                        data,
                        status: historyStatus,
                        reason: DecisionEngine.getReason(data, {
                            lightThreshold: draft.deviceConfig.lightThreshold,
                            autoCloseOnRain: draft.deviceConfig.autoCloseOnRain,
                            autoCloseOnDark: draft.deviceConfig.autoCloseOnDark,
                        }),
                    },
                    ...draft.history,
                ].slice(0, MAX_HISTORY_ITEMS);;
            })
        }

        appendSerialLog(
            "SENSOR",
            `temp=${payload.temperature.toFixed(1)}C hum=${payload.humidity.toFixed(1)}% light=${payload.light.toFixed(0)} rain=${payload.rain ? "yes" : "no"}`,
            sensorTimestamp,
            (useMainStore.getState().deviceConfig.autoCloseOnRain && payload.rain) ||
                (useMainStore.getState().deviceConfig.autoCloseOnDark && data.isDark(useMainStore.getState().deviceConfig.lightThreshold))
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

        detectRealtimeAlerts(data, useMainStore.getState().deviceState.status, sensorTimestamp);

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
        return;
    }
    MqttDiagnosticsService.recordStatusPayload(rawPayload, receivedAt);

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
    } else if (useMainStore.getState().pendingCommand !== null) {
        useMainStore.getState().updateState((draft) => {
            draft.debug.lastAckResult = "mismatch";
        })
        appendSerialLog(
            "STATUS",
            `ack mismatch pending=${useMainStore.getState().pendingCommand} incomingStatus=${payload.status} incomingLastCommand=${payload.lastCommand ?? "-"}`,
            statusTimestamp,
            "WARN",
        );
    }

    const { lastStatusUpdate } = useMainStore.getState();

    const isDuplicateStatus =
        useMainStore.getState().deviceState.status === payload.status &&
        useMainStore.getState().deviceState.mode === payload.mode &&
        lastStatusUpdate !== null &&
        receivedAt - lastStatusUpdate < STATUS_DEBOUNCE_MS;

    useMainStore.getState().updateState((df) => {
        df.lastStatusUpdate = receivedAt;
        df.lastHeartbeatUpdate = statusTimestamp;
        df.loading = false;
        df.debug.deviceStateSource = "STATUS_TOPIC";
    })
    MqttDiagnosticsService.setDeviceStateSource("STATUS_TOPIC");
    updateConnectionStatus({
        state: "online",
        isOnline: true,
        lastError: null,
        lastMessageAt: new Date(statusTimestamp).toISOString(),
    });

    if (isDuplicateStatus) {
        useMainStore.getState().updateState((df) => {
            df.debug.dedupedStatusCount += 1;
        })
        detectRealtimeAlerts(useMainStore.getState().sensorData, payload.status, statusTimestamp);
        return;
    }

    const previousStatus = useMainStore.getState().deviceState.status;
    useMainStore.getState().updateState((df) => {
        df.deviceState = {
            status: payload.status,
            mode: payload.mode,
            lastCommand: payload.lastCommand ?? df.deviceState.lastCommand,
            updatedAt: statusTimestamp,
        };
        df.debug.deviceStateSource = "STATUS_TOPIC";
    })
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

    detectRealtimeAlerts(useMainStore.getState().sensorData, payload.status, statusTimestamp);

    logger.info("mqtt", "Status state update", {
        topic,
        status: payload.status,
        mode: payload.mode,
        lastCommand: payload.lastCommand ?? null,
    });
}

export function sendCommand(command: DeviceCommand): boolean {
    const now = Date.now();
    updateUiState(now);
    const guard = useMainStore.getState().commandGuard;
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
    const isDeviceOnline = useMainStore.getState().uiState.connection === "CONNECTED";

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

    if (useMainStore.getState().commandStatus === "pending") {
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

    useMainStore.getState().updateState((df) => {
        df.pendingCommand = command;
        df.commandStatus = "pending";
        df.commandSentAt = now;
    });

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
        useMainStore.getState().updateState((df) => {
            df.pendingCommand = null;
            df.commandStatus = "idle";
            df.commandSentAt = null;
        })
    }
    return published;
}

export function publishConfig(config: Omit<DeviceConfig, "syncState" | "lastSyncAt" | "syncMessage">): boolean {
    const now = Date.now();
    const configKey = getConfigPublishKey(config);

    if (configKey === lastConfigPublishKey) {
        useMainStore.getState().updateState((df) => {
            df.deviceConfig.syncMessage = "Config unchanged; publish skipped";
        });
        return false;
    }

    if (now - lastConfigPublishAt < CONFIG_PUBLISH_INTERVAL_MS) {
        const waitSeconds = Math.ceil((CONFIG_PUBLISH_INTERVAL_MS - (now - lastConfigPublishAt)) / 1000);
        useMainStore.getState().updateState((df) => {
            df.deviceConfig.syncMessage = `Config publish skipped; wait ${waitSeconds}s before saving again`;
        });
        return false;
    }

    if (!mqttService.isConnected()) {
        useMainStore.getState().updateState((df) => {
            df.deviceConfig.syncState = "FAILED";
            df.deviceConfig.syncMessage = "Sync failed: MQTT disconnected"
        });
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
        return false;
    }

    const activeDeviceId = getActiveDeviceId();

    if (!activeDeviceId) {
        useMainStore.getState().updateState((df) => {
            df.deviceConfig.syncState = "FAILED";
            df.deviceConfig.syncMessage = "Sync failed: no active device selected"
        });
        appendSerialLog("CONFIG", "FAILED no active device selected", now, "WARN");
        pushSystemEvent({
            type: "CONFIG",
            title: "Config sync failed",
            description: "No active device selected",
            timestamp: now,
        });
        return false;
    }
    useMainStore.getState().updateState((df) => {
        df.deviceConfig.syncState = "PENDING";
        df.deviceConfig.syncMessage = "Syncing config to device..."
    });
    useMainStore.getState().updateState((df) => {
        df.configSentAt = now;
    });
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
    // const [snapshot, setSnapshot] = useState<SensorSnapshot>(() => cloneSnapshot());
    const snapshot = useMainStore();

    const [now, setNow] = useState(() => Date.now());
    const [schedules, setSchedules] = useState<StoredScheduleItem[]>([]);

    useMqttConnection(handleTopicMessage);
    useFirestoreSync();
    useScheduleRunner(schedules);

    useEffect(() => {
        const cached = loadCacheDeviceConfig();
        if (cached) {
            useMainStore.getState().updateState((df) => {
                // df.deviceConfig = {
                //     ...df.deviceConfig,
                //     ...cached,
                //     syncState: "IDLE",
                //     syncMessage: "Using last known device config: waiting for device confirmation"
                // }
                df.deviceConfig.syncState = "IDLE";
                df.deviceConfig.syncMessage = "Using last known device config: waiting for device confirmation";
            });
        }
    }, []);


    useEffect(() => {
        hookMountedAt = Date.now();
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
            setSchedules(result.schedules);
            useMainStore.getState().updateState((df) => {
                df.debug.scheduleRuntime.loaded = true;
                df.debug.scheduleRuntime.source = source;
            });
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


        }, 1000);

        return () => {
            active = false;
            window.clearInterval(timer);
            window.clearInterval(scheduleRefreshTimer);
            window.removeEventListener("schedule-updated", onScheduleUpdated);
        };
    }, []);



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
        currentHour: (() => {
            const d = new Date(now);
            return d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
        })(),
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

