import { TelemetryHeartbeatService } from "@/services/TelemetryHeartbeatService";

export type OperationalDeviceState = "ONLINE" | "DELAYED" | "OFFLINE";
export type OperationalStreamState = "STREAMING" | "WAITING_DATA" | "IDLE" | "STALE";

export type ResolvedOperationalState = {
  deviceState: OperationalDeviceState;
  streamState: OperationalStreamState;
  heartbeatAgeMs: number | null;
  telemetryAgeMs: number | null;
};

export type OperationalState =
  | "SAFE_EXTENDED"
  | "RETRACTED"
  | "MOVING"
  | "RAIN_RETRACTING"
  | "OFFLINE"
  | "STALE"
  | "FAULT"
  | "UNKNOWN";

export type OperationalStateInput = {
  mqttConnected: boolean;
  lastTelemetryAt?: number | null;
  now?: number;
  rain?: boolean | null;
  status?: string | null;
  mode?: string | null;
  commandInFlight?: boolean;
  commandStartedAt?: number | null;
  ackTimeoutMs?: number;
  staleThresholdMs?: number;
  offlineThresholdMs?: number;
  fault?: boolean;
};

export type OperationalStateResult = {
  state: OperationalState;
  severity: "normal" | "info" | "warning" | "critical";
  canSendCommand: boolean;
  disabledCommands: string[];
  reason: string;
};

const DEFAULT_STALE_THRESHOLD_MS = 15_000;
const DEFAULT_OFFLINE_THRESHOLD_MS = 45_000;
const DEFAULT_ACK_TIMEOUT_MS = 5_000;

export class OperationalStateResolver {
  static resolveOperationalState(input: OperationalStateInput): OperationalStateResult {
    const now = input.now ?? Date.now();
    const staleThresholdMs = input.staleThresholdMs ?? DEFAULT_STALE_THRESHOLD_MS;
    const offlineThresholdMs = input.offlineThresholdMs ?? DEFAULT_OFFLINE_THRESHOLD_MS;
    const ackTimeoutMs = input.ackTimeoutMs ?? DEFAULT_ACK_TIMEOUT_MS;
    const status = String(input.status ?? "").toUpperCase();
    const isRetracted = status === "CLOSED" || status === "RETRACTED";
    const isExtended = status === "OPEN" || status === "EXTENDED";
    const isMovingStatus = status === "MOVING" || status === "RESTARTING";
    const telemetryAgeMs =
      typeof input.lastTelemetryAt === "number" ? now - input.lastTelemetryAt : Number.POSITIVE_INFINITY;
    const inFlight = Boolean(input.commandInFlight);
    const commandAgeMs =
      typeof input.commandStartedAt === "number" ? now - input.commandStartedAt : null;
    const commandLikelyMoving = inFlight || (commandAgeMs !== null && commandAgeMs <= ackTimeoutMs);

    let state: OperationalState = "UNKNOWN";
    let reason = "No matching runtime state rule.";
    let severity: OperationalStateResult["severity"] = "info";

    if (input.fault) {
      state = "FAULT";
      severity = "critical";
      reason = "Fault flag is active.";
    } else if (!input.mqttConnected || telemetryAgeMs > offlineThresholdMs) {
      state = "OFFLINE";
      severity = "critical";
      reason = "MQTT disconnected or telemetry exceeded offline threshold.";
    } else if (telemetryAgeMs > staleThresholdMs) {
      state = "STALE";
      severity = "warning";
      reason = "Telemetry exceeded stale threshold.";
    } else if (input.rain === true && !isRetracted) {
      state = "RAIN_RETRACTING";
      severity = "warning";
      reason = "Rain detected while clothesline is not retracted.";
    } else if (isMovingStatus || commandLikelyMoving) {
      state = "MOVING";
      severity = "info";
      reason = "Device movement is in progress.";
    } else if (isRetracted) {
      state = "RETRACTED";
      severity = "normal";
      reason = "Clothesline is retracted.";
    } else if (isExtended && input.rain === false) {
      state = "SAFE_EXTENDED";
      severity = "normal";
      reason = "Clothesline is extended and rain is not detected.";
    }

    const disabledCommands = new Set<string>();
    if (input.rain === true) {
      disabledCommands.add("OPEN");
    }
    if (state === "MOVING") {
      disabledCommands.add("OPEN");
      disabledCommands.add("CLOSE");
      disabledCommands.add("AUTO");
      disabledCommands.add("MANUAL");
      disabledCommands.add("RESTART");
    }
    if (state === "OFFLINE" || state === "STALE" || state === "FAULT") {
      disabledCommands.add("OPEN");
      disabledCommands.add("CLOSE");
      disabledCommands.add("AUTO");
      disabledCommands.add("RESTART");
    }

    return {
      state,
      severity,
      canSendCommand: disabledCommands.size < 5,
      disabledCommands: Array.from(disabledCommands),
      reason,
    };
  }

  static resolve(input: {
    now: number;
    mqttConnected: boolean;
    mqttState?: "connecting" | "online" | "reconnecting" | "offline" | "error";
    lastHeartbeatAt: number | null;
    lastTelemetryAt: number | null;
  }): ResolvedOperationalState {
    const mqttState = input.mqttState ?? (input.mqttConnected ? "online" : "offline");
    const heartbeat = TelemetryHeartbeatService.resolve({
      now: input.now,
      mqttState,
      lastHeartbeatAt: input.lastHeartbeatAt,
      lastTelemetryAt: input.lastTelemetryAt,
    });

    const deviceState: OperationalDeviceState =
      heartbeat.status === "DISCONNECTED" || heartbeat.status === "OFFLINE"
        ? "OFFLINE"
        : heartbeat.status === "STALE"
          ? "DELAYED"
          : "ONLINE";

    let streamState: OperationalStreamState = "IDLE";
    if (!input.mqttConnected) {
      streamState = "IDLE";
    } else if (heartbeat.telemetryAgeMs === null) {
      streamState = "WAITING_DATA";
    } else if (heartbeat.status === "ONLINE") {
      streamState = "STREAMING";
    } else {
      streamState = "STALE";
    }

    return {
      deviceState,
      streamState,
      heartbeatAgeMs: heartbeat.heartbeatAgeMs,
      telemetryAgeMs: heartbeat.telemetryAgeMs,
    };
  }
}

