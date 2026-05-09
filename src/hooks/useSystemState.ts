import { useMemo } from "react";
import { useSensor } from "@/hooks/useSensor";
import { RuntimeStatePresenter } from "@/services/RuntimeStatePresenter";

export function useSystemState() {
  const state = useSensor();

  const runtime = useMemo(() => {
    return RuntimeStatePresenter.buildRuntimeSnapshot({
      deviceState: state.deviceState,
      commandStatus: state.commandStatus,
      sensorData: state.sensorData,
      decision: state.decision,
      uiState: state.uiState,
      mqttConnected: state.mqttConnected,
      lastUpdate: state.lastUpdate,
      lastSensorUpdate: state.lastSensorUpdate,
      lastStatusUpdate: state.lastStatusUpdate,
    });
  }, [
    state.deviceState,
    state.commandStatus,
    state.sensorData,
    state.decision,
    state.uiState,
    state.mqttConnected,
    state.lastUpdate,
    state.lastSensorUpdate,
    state.lastStatusUpdate,
  ]);

  return useMemo(
    () => ({
      ...state,
      runtime,
      // For backward compatibility while we refactor components
      mode: state.mode,
      status: state.status,
    }),
    [state, runtime],
  );
}
