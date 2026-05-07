import { create } from "zustand";

type SensorRealtimeState = {
  lastSensorUpdate: number | null;
  lastHeartbeatUpdate: number | null;
  lastStatusUpdate: number | null;
  mqttConnected: boolean;
  streamState: "NO_DATA" | "STREAMING" | "STALE";
  setRealtimeState: (patch: Partial<Omit<SensorRealtimeState, "setRealtimeState">>) => void;
};

export const useSensorStore = create<SensorRealtimeState>((set) => ({
  lastSensorUpdate: null,
  lastHeartbeatUpdate: null,
  lastStatusUpdate: null,
  mqttConnected: false,
  streamState: "NO_DATA",
  setRealtimeState: (patch) => set((state) => ({ ...state, ...patch })),
}));

