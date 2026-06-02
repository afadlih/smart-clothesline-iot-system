import { useEffect } from "react";
import { mqttService } from "@/services/MQTTService";
import { FirestoreService, sensorDataQueue } from "@/services/FirestoreService";
import { pushSystemEvent } from "@/hooks/useNotificationEngine";
import { logger } from "@/lib/logger";

export function useFirestoreSync() {
    useEffect(() => {
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
            window.clearInterval(queueSyncTimer);
        };
    }, []);
}
