import { useEffect } from "react";
import { useMainStore } from "@/stores/useMainStore";
import { mqttService } from "@/services/MQTTService";
import { logger } from "@/lib/logger";
import {
    getDeviceTelemetryTopics,
    getDeviceStatusTopics,
    getDeviceConfigAckTopic,
} from "@/services/mqttTopics";

// Module-level variables to track active subscriptions
let activeUnsubscribers: (() => void)[] = [];
let currentSubscribedDeviceId: string | null = null;

const ACTIVE_DEVICE_STORAGE_KEY = "smart-clothesline-active-device-id-v1";

function getActiveDeviceId(): string | null {
    if (typeof window === "undefined") {
        return null;
    }
    return localStorage.getItem(ACTIVE_DEVICE_STORAGE_KEY);
}

export function useMqttConnection(handleTopicMessage: (rawPayload: string, topic: string) => void) {
    useEffect(() => {
        // Sync MQTT connection status to Zustand store dynamically
        const unsubConnection = mqttService.onConnectionStatus((snapshot) => {
            useMainStore.getState().updateState((draft) => {
                draft.connection = {
                    ...draft.connection,
                    state: snapshot.state,
                    isOnline: snapshot.isOnline,
                    lastError: snapshot.lastError,
                    lastMessageAt: snapshot.lastMessageAt,
                };
            });
        });

        // 1-second interval to check for changes in active device (e.g. from pairing settings)
        const interval = window.setInterval(() => {
            const activeDeviceId = getActiveDeviceId();
            
            if (currentSubscribedDeviceId === activeDeviceId) {
                return;
            }

            // Unsubscribe from old topics
            for (const unsub of activeUnsubscribers) {
                try {
                    unsub();
                } catch (e) {
                    logger.warn("mqtt", "Failed to unsubscribe", e);
                }
            }
            activeUnsubscribers = [];
            currentSubscribedDeviceId = activeDeviceId;

            if (!activeDeviceId) {
                logger.info("mqtt", "No active device selected; MQTT telemetry subscription skipped");
                useMainStore.getState().updateState((df) => {
                    df.loading = false;
                });
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

            for (const sensorTopic of sensorTopics) {
                const unsub = mqttService.subscribeTopic(sensorTopic, handleTopicMessage);
                activeUnsubscribers.push(unsub);
            }
            for (const statusTopic of statusTopics) {
                const unsub = mqttService.subscribeTopic(statusTopic, handleTopicMessage);
                activeUnsubscribers.push(unsub);
            }
            const unsub = mqttService.subscribeTopic(configAckTopic, handleTopicMessage);
            activeUnsubscribers.push(unsub);

        }, 1000);

        return () => {
            window.clearInterval(interval);
            unsubConnection();
            
            // Cleanup all subscriptions on unmount
            for (const unsub of activeUnsubscribers) {
                try {
                    unsub();
                } catch (e) {
                    logger.warn("mqtt", "Failed to unsubscribe", e);
                }
            }
            activeUnsubscribers = [];
            currentSubscribedDeviceId = null;
        };
    }, [handleTopicMessage]);
}
