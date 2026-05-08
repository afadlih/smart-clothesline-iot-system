export type HeartbeatStatus = "ONLINE" | "OFFLINE" | "STALE" | "DISCONNECTED" | "RECONNECTING";

export type HeartbeatSnapshot = {
  status: HeartbeatStatus;
  lastSeenAt: number | null;
  telemetryAgeMs: number | null;
  heartbeatAgeMs: number | null;
  uptimeMs: number;
  reconnectCount: number;
};

export class TelemetryHeartbeatService {
  static readonly OFFLINE_TIMEOUT_MS = 15_000;
  static readonly STALE_TIMEOUT_MS = 10_000;

  static resolve(input: {
    now: number;
    mqttState: "connecting" | "online" | "reconnecting" | "offline" | "error";
    lastHeartbeatAt: number | null;
    lastTelemetryAt: number | null;
    connectedSinceAt?: number | null;
    reconnectCount?: number;
  }): HeartbeatSnapshot {
    const heartbeatAgeMs =
      input.lastHeartbeatAt === null ? null : Math.max(0, input.now - input.lastHeartbeatAt);
    const telemetryAgeMs =
      input.lastTelemetryAt === null ? null : Math.max(0, input.now - input.lastTelemetryAt);
    const lastSeenAt = Math.max(input.lastHeartbeatAt ?? 0, input.lastTelemetryAt ?? 0) || null;

    let status: HeartbeatStatus;
    if (input.mqttState === "reconnecting" || input.mqttState === "connecting") {
      status = "RECONNECTING";
    } else if (input.mqttState === "offline" || input.mqttState === "error") {
      status = "DISCONNECTED";
    } else if (heartbeatAgeMs !== null && heartbeatAgeMs > this.OFFLINE_TIMEOUT_MS) {
      status = "OFFLINE";
    } else if (telemetryAgeMs !== null && telemetryAgeMs > this.STALE_TIMEOUT_MS) {
      status = "STALE";
    } else {
      status = "ONLINE";
    }

    const uptimeMs =
      input.connectedSinceAt && input.mqttState === "online"
        ? Math.max(0, input.now - input.connectedSinceAt)
        : 0;

    return {
      status,
      lastSeenAt,
      telemetryAgeMs,
      heartbeatAgeMs,
      uptimeMs,
      reconnectCount: input.reconnectCount ?? 0,
    };
  }
}

