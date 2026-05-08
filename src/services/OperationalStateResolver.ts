import { TelemetryHeartbeatService } from "@/services/TelemetryHeartbeatService";

export type OperationalDeviceState = "ONLINE" | "DELAYED" | "OFFLINE";
export type OperationalStreamState = "STREAMING" | "WAITING_DATA" | "IDLE" | "STALE";

export type ResolvedOperationalState = {
  deviceState: OperationalDeviceState;
  streamState: OperationalStreamState;
  heartbeatAgeMs: number | null;
  telemetryAgeMs: number | null;
};

export class OperationalStateResolver {
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

