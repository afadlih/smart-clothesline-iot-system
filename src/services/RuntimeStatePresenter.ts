import { SensorData } from "@/models/SensorData";

export type DeviceStatus = "OPEN" | "CLOSED" | "RESTARTING" | "UNKNOWN";
export type DeviceMode = "AUTO" | "MANUAL" | "UNKNOWN";
export type DecisionSource = "DEVICE" | "MANUAL" | "SAFETY" | "SCHEDULE" | "AUTO" | "UNKNOWN";
export type ConnectivityState = "ONLINE" | "DELAYED" | "OFFLINE" | "UNKNOWN";
export type StreamState = "STREAMING" | "STALE" | "WAITING_DATA" | "IDLE";

export interface RuntimeSnapshot {
  // A. Actual IoT Device State
  actualDeviceStatus: DeviceStatus;
  actualDeviceMode: DeviceMode;
  lastDeviceCommand: string | null;
  commandStatus: "idle" | "pending" | "success" | "timeout" | "UNKNOWN";
  lastStatusUpdate: number | null;
  lastSensorUpdate: number | null;

  // B. Connectivity State
  deviceConnectivity: ConnectivityState;
  streamState: StreamState;
  mqttConnected: boolean;
  freshnessSeconds: number | null;

  // C. System Decision / Recommendation
  decisionSource: DecisionSource;
  recommendedStatus: DeviceStatus;
  decisionReason: string;
  safetyLabel: string;
  scheduleActive: boolean;
}

export class RuntimeStatePresenter {
  static buildRuntimeSnapshot(input: {
    deviceState: {
      status: string | null;
      mode: string | null;
      lastCommand: string | null;
      updatedAt: number | null;
    };
    commandStatus: string;
    sensorData: SensorData | null;
    decision: {
      decisionSource: string;
      recommendedStatus: string;
      reason: string;
      scheduleActive: boolean;
    };
    uiState: {
      connection: string;
      stream: string;
    };
    mqttConnected: boolean;
    lastUpdate: number | null;
    lastSensorUpdate: number | null;
    lastStatusUpdate: number | null;
  }): RuntimeSnapshot {
    const { deviceState, decision, uiState, mqttConnected, lastUpdate, lastSensorUpdate, lastStatusUpdate } = input;

    const commandStatus = (input.commandStatus as RuntimeSnapshot["commandStatus"]) || "UNKNOWN";

    const now = Date.now();
    const freshnessSeconds = lastUpdate ? Math.max(0, Math.floor((now - lastUpdate) / 1000)) : null;

    // A. Actual IoT Device State
    const actualDeviceStatus = (deviceState.status as DeviceStatus) || "UNKNOWN";
    const actualDeviceMode = (deviceState.mode as DeviceMode) || "UNKNOWN";

    // B. Connectivity State
    let deviceConnectivity: ConnectivityState = "OFFLINE";
    if (uiState.connection === "CONNECTED") {
      if (freshnessSeconds !== null && freshnessSeconds > 15) {
        deviceConnectivity = "DELAYED";
      } else {
        deviceConnectivity = "ONLINE";
      }
    }

    const streamState = (uiState.stream as StreamState) || "IDLE";

    // C. System Decision / Recommendation
    const decisionSource = (decision.decisionSource as DecisionSource) || "UNKNOWN";
    const recommendedStatus = (decision.recommendedStatus as DeviceStatus) || "UNKNOWN";
    
    let safetyLabel = "SAFE";
    if (decisionSource === "SAFETY") {
      const reason = decision.reason.toLowerCase();
      if (reason.includes("rain")) {
        safetyLabel = "RAIN DETECTED";
      } else if (reason.includes("light") || reason.includes("dark")) {
        safetyLabel = "LOW LIGHT";
      } else {
        safetyLabel = "OVERRIDE";
      }
    }

    return {
      actualDeviceStatus,
      actualDeviceMode,
      lastDeviceCommand: deviceState.lastCommand,
      commandStatus,
      lastStatusUpdate,
      lastSensorUpdate,
      deviceConnectivity,
      streamState,
      mqttConnected,
      freshnessSeconds,
      decisionSource,
      recommendedStatus,
      decisionReason: decision.reason,
      safetyLabel,
      scheduleActive: decision.scheduleActive,
    };
  }
}
