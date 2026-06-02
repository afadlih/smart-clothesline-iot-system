import { useEffect, useState } from "react";
import { useMainStore } from "@/stores/useMainStore";
import { mqttService } from "@/services/MQTTService";
import { EventLogService } from "@/services/EventLogService";
import { pushSystemEvent } from "@/hooks/useNotificationEngine";
import { logger } from "@/lib/logger";
import {
    isWithinSchedule,
    type StoredScheduleItem
} from "@/features/system/ScheduleEngine";
import {
    type FirebaseScheduleItem
} from "@/services/ScheduleService";
import {
    getCommandPublishTopics,
} from "@/services/mqttTopics";
import { evaluateScheduleTransition } from "@/services/ScheduleRuntimeService";
import { EventLog } from "../types";

const ACTIVE_DEVICE_STORAGE_KEY = "smart-clothesline-active-device-id-v1";
const ACK_TIMEOUT_MS = 5_000;
const CONFIG_ACK_TIMEOUT_MS = 5_000;

let lastPublishedScheduleState: "ACTIVE" | "INACTIVE" | null = null;

function getActiveDeviceId(): string | null {
    if (typeof window === "undefined") {
        return null;
    }
    return localStorage.getItem(ACTIVE_DEVICE_STORAGE_KEY);
}

export function useScheduleRunner(schedules: StoredScheduleItem[]) {
    const snapshot = useMainStore();
    const [now, setNow] = useState(() => Date.now());

    // Local logger/event helpers mirroring useSensor.ts but decoupled to store
    const appendSerialLog = (
        prefix: "SENSOR" | "STATUS" | "COMMAND" | "CONFIG" | "ALERT",
        message: string,
        timestampMs: number,
        level: "INFO" | "WARN" = "INFO",
    ) => {
        const timestamp = new Date(timestampMs).toISOString();
        const id = `${prefix}-${timestampMs}-${Math.random().toString(36).slice(2, 10)}`;
        useMainStore.getState().updateState((draft) => {
            draft.serialLogs = [
                {
                    id,
                    level,
                    message: `[${prefix}] ${message}`,
                    timestamp,
                },
                ...draft.serialLogs,
            ].slice(0, 40);
        });
    };

    const appendLegacyEvent = (event: EventLog) => {
        useMainStore.getState().updateState((draft) => {
            draft.events = [event, ...draft.events].slice(0, 10);
        });
        void EventLogService.logEvent(event).catch((error) => {
            logger.error("firestore", "Failed to save event log", error);
        });
    };

    // 1. One-second interval to update 'now' and run the automated schedule evaluations
    useEffect(() => {
        const timer = window.setInterval(() => {
            const nextNow = Date.now();
            setNow(nextNow);

            // ===== SCHEDULE ENGINE EXECUTION =====
            const activeDeviceId = getActiveDeviceId();
            const isMqttConnected = mqttService.isConnected();
            const isTelemetryStreaming = useMainStore.getState().uiState.stream === "STREAMING";

            // Determine active schedule for diagnostics
            const dateObj = new Date(nextNow);
            const currentHourFloat = dateObj.getHours() + dateObj.getMinutes() / 60 + dateObj.getSeconds() / 3600;
            const currentActiveSchedule = schedules.find((s) => isWithinSchedule(s, currentHourFloat)) ?? null;

            useMainStore.getState().updateState((df) => {
                df.debug.scheduleRuntime = {
                    ...df.debug.scheduleRuntime,
                    deviceId: activeDeviceId,
                    activeScheduleId: currentActiveSchedule ? currentActiveSchedule.id : null,
                    isActiveNow: currentActiveSchedule !== null,
                };
            });

            if (activeDeviceId) {
                const { sensorData, deviceState } = useMainStore.getState();
                const rain = sensorData ? sensorData.isRaining() : null;

                const decision = evaluateScheduleTransition({
                    now: nextNow,
                    schedules: schedules as FirebaseScheduleItem[],
                    lastRuntimeState: lastPublishedScheduleState,
                    currentStatus: deviceState.status as "OPEN" | "CLOSED" | "MOVING" | "FAULT" | "RESTARTING" | "UNKNOWN" | null,
                    mode: deviceState.mode as "AUTO" | "MANUAL" | "SCHEDULE" | "UNKNOWN" | null,
                    rain,
                    mqttConnected: isMqttConnected,
                    telemetryFresh: isTelemetryStreaming,
                });

                useMainStore.getState().updateState((df) => {
                    df.debug.scheduleRuntime.lastReason = decision.reason;
                });

                if (decision.shouldPublish && decision.command) {
                    lastPublishedScheduleState = decision.nextState;

                    useMainStore.getState().updateState((df) => {
                        df.debug.scheduleRuntime = {
                            ...df.debug.scheduleRuntime,
                            lastCommand: decision.command,
                            lastCommandAt: nextNow,
                            lastReason: decision.reason,
                        };
                    });

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

                    console.info(`SCHEDULE ${decision.command} -> publish ${topics.join(", ")} target=${activeDeviceId}`);
                }
            } else {
                useMainStore.getState().updateState((df) => {
                    df.debug.scheduleRuntime.lastReason = "Blocked: No active device selected.";
                });
            }

        }, 1000);

        return () => {
            window.clearInterval(timer);
        };
    }, [schedules]);

    // 2. useEffect to check for manual command ACK timeout
    useEffect(() => {
        if (snapshot.commandStatus !== "pending" || snapshot.commandSentAt === null) {
            return;
        }
        if (now - snapshot.commandSentAt >= ACK_TIMEOUT_MS) {
            useMainStore.getState().updateState((df) => {
                df.commandStatus = "timeout";
                df.pendingCommand = null;
                df.commandSentAt = null;
                df.debug.lastAckResult = "timeout";
            });
            appendSerialLog("COMMAND", "ACK timeout > 5s", now, "WARN");
        }
    }, [now, snapshot.commandSentAt, snapshot.commandStatus]);

    // 3. useEffect to check for device config acknowledgment sync timeout
    useEffect(() => {
        if (snapshot.deviceConfig.syncState !== "PENDING" || snapshot.configSentAt === null) {
            return;
        }

        if (now - snapshot.configSentAt >= CONFIG_ACK_TIMEOUT_MS) {
            useMainStore.getState().updateState((df) => {
                df.deviceConfig = {
                    ...df.deviceConfig,
                    syncState: "FAILED",
                    syncMessage: "Sync failed (timeout)",
                };
            });
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
            useMainStore.getState().updateState((df) => {
                df.configSentAt = null;
            });
        }
    }, [now, snapshot.configSentAt, snapshot.deviceConfig.syncState]);

    // 4. useEffect to debounce commandStatus from 'success'/'timeout' back to 'idle'
    useEffect(() => {
        if (snapshot.commandStatus !== "success" && snapshot.commandStatus !== "timeout") {
            return;
        }

        const timer = window.setTimeout(() => {
            const currentStatus = useMainStore.getState().commandStatus;
            if (currentStatus === "pending") {
                return;
            }
            useMainStore.getState().updateState((df) => {
                df.commandStatus = "idle";
            });
        }, 2000);

        return () => {
            window.clearTimeout(timer);
        };
    }, [snapshot.commandStatus]);
}
