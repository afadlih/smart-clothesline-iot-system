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
    lastHeartbeatAt: number | null;
    lastTelemetryAt: number | null;
  }): ResolvedOperationalState {
    const heartbeatAgeMs =
      input.lastHeartbeatAt === null ? null : Math.max(0, input.now - input.lastHeartbeatAt);
    const telemetryAgeMs =
      input.lastTelemetryAt === null ? null : Math.max(0, input.now - input.lastTelemetryAt);

    const deviceState: OperationalDeviceState =
      heartbeatAgeMs === null || heartbeatAgeMs > 30_000
        ? "OFFLINE"
        : heartbeatAgeMs > 15_000
          ? "DELAYED"
          : "ONLINE";

    let streamState: OperationalStreamState = "IDLE";
    if (!input.mqttConnected) {
      streamState = "IDLE";
    } else if (telemetryAgeMs === null) {
      streamState = "WAITING_DATA";
    } else if (telemetryAgeMs <= 10_000) {
      streamState = "STREAMING";
    } else {
      streamState = "STALE";
    }

    return { deviceState, streamState, heartbeatAgeMs, telemetryAgeMs };
  }
}

