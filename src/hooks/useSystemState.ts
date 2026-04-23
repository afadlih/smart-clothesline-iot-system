import { useMemo } from "react";
import { useSensor } from "@/hooks/useSensor";

export function useSystemState() {
  const state = useSensor();

  return useMemo(
    () => ({
      sensor: state.sensorData,
      device: state.deviceState,
      deviceConfig: state.deviceConfig,
      decision: state.decision,
      connection: state.connection,
      uiState: state.uiState,
      mqttConnected: state.mqttConnected,
      isOnline: state.isOnline,
      isStreaming: state.isStreaming,
      lastUpdate: state.lastUpdate,
      lastSensorUpdate: state.lastSensorUpdate,
      lastStatusUpdate: state.lastStatusUpdate,
      drift: state.drift,
      debug: state.debug,
      pendingCommand: state.pendingCommand,
      commandStatus: state.commandStatus,
      events: state.events,
      history: state.history,
      serialLogs: state.serialLogs,
      sendCommand: state.sendCommand,
      publishConfig: state.publishConfig,
      mode: state.mode,
      status: state.status,
      lastCommand: state.lastCommand,
      deviceHealth: state.deviceHealth,
      operationalHealth: state.operationalHealth,
      smartAlerts: state.smartAlerts,
    }),
    [state],
  );
}
