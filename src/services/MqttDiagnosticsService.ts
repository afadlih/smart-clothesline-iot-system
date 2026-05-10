export type DeviceStateSource = "STATUS_TOPIC" | "SENSOR_FALLBACK" | "UNKNOWN";

export type MqttDiagnosticsSnapshot = {
  lastSensorPayload: string | null;
  lastStatusPayload: string | null;
  lastConfigAckPayload: string | null;
  lastCommandPayload: string | null;
  lastSensorAt: number | null;
  lastStatusAt: number | null;
  lastConfigAckAt: number | null;
  lastCommandAt: number | null;
  sensorCount: number;
  statusCount: number;
  duplicateCount: number;
  rejectedCount: number;
  filteredDeviceCount: number;
  lastRejectReason: string | null;
  deviceStateSource: DeviceStateSource;
  freshnessSeconds: number | null;
  heartbeatAgeSeconds: number | null;
};

const state: MqttDiagnosticsSnapshot = {
  lastSensorPayload: null,
  lastStatusPayload: null,
  lastConfigAckPayload: null,
  lastCommandPayload: null,
  lastSensorAt: null,
  lastStatusAt: null,
  lastConfigAckAt: null,
  lastCommandAt: null,
  sensorCount: 0,
  statusCount: 0,
  duplicateCount: 0,
  rejectedCount: 0,
  filteredDeviceCount: 0,
  lastRejectReason: null,
  deviceStateSource: "UNKNOWN",
  freshnessSeconds: null,
  heartbeatAgeSeconds: null,
};

export class MqttDiagnosticsService {
  static snapshot(): MqttDiagnosticsSnapshot {
    return { ...state };
  }

  static recordSensorPayload(raw: string, at: number): void {
    state.lastSensorPayload = raw;
    state.lastSensorAt = at;
    state.sensorCount += 1;
  }

  static recordStatusPayload(raw: string, at: number): void {
    state.lastStatusPayload = raw;
    state.lastStatusAt = at;
    state.statusCount += 1;
  }

  static recordConfigAckPayload(raw: string, at: number): void {
    state.lastConfigAckPayload = raw;
    state.lastConfigAckAt = at;
  }

  static recordCommandPayload(raw: string, at: number): void {
    state.lastCommandPayload = raw;
    state.lastCommandAt = at;
  }

  static recordDuplicate(): void {
    state.duplicateCount += 1;
  }

  static recordRejected(reason: string): void {
    state.rejectedCount += 1;
    state.lastRejectReason = reason;
  }

  static recordFilteredDevice(): void {
    state.filteredDeviceCount += 1;
  }

  static setDeviceStateSource(source: DeviceStateSource): void {
    state.deviceStateSource = source;
  }

  static setFreshness(now: number, lastSensorAt: number | null, lastHeartbeatAt: number | null): void {
    const freshest = Math.max(lastSensorAt ?? 0, lastHeartbeatAt ?? 0);
    state.freshnessSeconds = freshest > 0 ? Math.max(0, Math.floor((now - freshest) / 1000)) : null;
    state.heartbeatAgeSeconds = lastHeartbeatAt ? Math.max(0, Math.floor((now - lastHeartbeatAt) / 1000)) : null;
  }
}
