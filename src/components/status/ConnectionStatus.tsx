"use client";

import { useSensor } from "@/hooks/useSensor";
import ErrorAlert from "@/components/alerts/ErrorAlert";

export default function ConnectionStatus() {
  const { connection, queueStats, uiState, deviceConfig } = useSensor();

  // Determine what to show
  const hasQueuedData = queueStats.total > 0;
  const isSyncing = queueStats.readyToSync > 0;
  const hasFailed = queueStats.failed > 0;

  return (
    <div className="space-y-2">
      {/* MQTT Connection Status */}
      {connection.state === "offline" && (
        <ErrorAlert
          type="warning"
          message="MQTT offline - attempting to reconnect..."
          dismissible={false}
        />
      )}

      {connection.state === "error" && (
        <ErrorAlert
          type="error"
          message={`MQTT error: ${connection.lastError || "Unknown error"}`}
          dismissible={false}
        />
      )}

      {connection.state === "reconnecting" && (
        <ErrorAlert
          type="info"
          message="MQTT reconnecting with exponential backoff..."
          dismissible={false}
        />
      )}

      {connection.state === "online" && uiState.stream !== "STREAMING" && (
        <ErrorAlert
          type="warning"
          message="MQTT connected but no data received (stale stream)"
          dismissible={false}
        />
      )}

      {/* Sensor Data Queue Status */}
      {hasQueuedData && (
        <ErrorAlert
          type={hasFailed ? "error" : isSyncing ? "info" : "warning"}
          message={
            hasFailed
              ? `${queueStats.failed} sensor readings failed to sync (max retries exceeded)`
              : isSyncing
                ? `Syncing ${queueStats.readyToSync} queued sensor readings...`
                : `${queueStats.total} sensor readings queued offline`
          }
          dismissible={true}
          autoClose={hasFailed ? 0 : 5000}
        />
      )}

      {/* Device Config Sync Status */}
      {deviceConfig.syncState === "PENDING" && (
        <ErrorAlert
          type="info"
          message="Syncing device config..."
          dismissible={false}
        />
      )}

      {deviceConfig.syncState === "FAILED" && (
        <ErrorAlert
          type="error"
          message={`Config sync failed: ${deviceConfig.syncMessage}`}
          dismissible={true}
        />
      )}

      {deviceConfig.syncState === "SYNCED" && uiState.deviceSync === "SYNCED" && (
        <ErrorAlert
          type="success"
          message="Device config synced successfully"
          dismissible={true}
          autoClose={3000}
        />
      )}
    </div>
  );
}
