export type RawTelemetryPayload = {
  deviceId?: unknown;
  temperature?: unknown;
  humidity?: unknown;
  light?: unknown;
  rain?: unknown;
  timestamp?: unknown;
  heartbeat?: unknown;
  mode?: unknown;
  status?: unknown;
  lastCommand?: unknown;
};

export type ValidTelemetryPayload = {
  deviceId?: string;
  temperature: number;
  humidity: number;
  light: number;
  rain: boolean;
  timestamp: number;
  heartbeat: number;
  deviceTimestamp?: number;
  deviceUptimeMs?: number;
  heartbeatAt: number;
  mode?: "AUTO" | "MANUAL";
  deviceState?: "OPEN" | "CLOSED" | "RESTARTING";
  lastCommand?: "OPEN" | "CLOSE" | "AUTO" | "MANUAL" | "RESTART";
};

type ValidationResult =
  | { ok: true; value: ValidTelemetryPayload; incomplete: boolean }
  | { ok: false; reason: string };

function toFiniteNumber(input: unknown): number | null {
  if (typeof input === "number" && Number.isFinite(input)) return input;
  if (typeof input === "string" && input.trim()) {
    const parsed = Number(input);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function toSafeTimestamp(input: unknown, fallback: number): number {
  const parsed = toFiniteNumber(input);
  if (parsed === null) return fallback;
  if (parsed < 946684800000 || parsed > Date.now() + 5 * 60 * 1000) return fallback;
  return parsed;
}

function toTelemetryTime(
  input: unknown,
  fallback: number,
): { effectiveAt: number; deviceTimestamp?: number; deviceUptimeMs?: number } {
  const parsed = toFiniteNumber(input);
  if (parsed === null || parsed <= 0) {
    return { effectiveAt: fallback };
  }

  // Epoch seconds
  if (parsed >= 946684800 && parsed < 1_000_000_000_000) {
    const ms = parsed * 1000;
    return { effectiveAt: ms, deviceTimestamp: ms };
  }

  // Epoch milliseconds
  if (parsed >= 946684800000 && parsed <= Date.now() + 5 * 60 * 1000) {
    return { effectiveAt: parsed, deviceTimestamp: parsed };
  }

  // Device uptime millis (e.g. millis() from firmware)
  if (parsed > 0 && parsed < 946684800000) {
    return { effectiveAt: fallback, deviceUptimeMs: parsed };
  }

  return { effectiveAt: fallback };
}

export class SensorValidationLayer {
  static validate(raw: RawTelemetryPayload, receivedAt: number): ValidationResult {
    const temperature = toFiniteNumber(raw.temperature);
    const humidity = toFiniteNumber(raw.humidity);
    const light = toFiniteNumber(raw.light);
    const rawRain = raw.rain;

    if (temperature === null || humidity === null || light === null) {
      return { ok: false, reason: "Missing required numeric telemetry fields" };
    }

    if (typeof rawRain !== "boolean") {
      return { ok: false, reason: "Invalid rain flag" };
    }

    const sanitizedTemperature = Math.max(-50, Math.min(100, temperature));
    const sanitizedHumidity = Math.max(0, Math.min(100, humidity));
    const sanitizedLight = Math.max(0, Math.min(10000, light));
    const timestampInfo = toTelemetryTime(raw.timestamp, receivedAt);
    const heartbeatInfo = toTelemetryTime(raw.heartbeat, timestampInfo.effectiveAt);
    const timestamp = toSafeTimestamp(timestampInfo.effectiveAt, receivedAt);
    const heartbeat = toSafeTimestamp(heartbeatInfo.effectiveAt, timestamp);

    const mode = raw.mode === "AUTO" || raw.mode === "MANUAL" ? raw.mode : undefined;
    const deviceState =
      raw.status === "OPEN" || raw.status === "CLOSED" || raw.status === "RESTARTING"
        ? raw.status
        : undefined;

    const lastCommand =
      raw.lastCommand === "OPEN" ||
      raw.lastCommand === "CLOSE" ||
      raw.lastCommand === "AUTO" ||
      raw.lastCommand === "MANUAL" ||
      raw.lastCommand === "RESTART"
        ? raw.lastCommand
        : undefined;

    const value: ValidTelemetryPayload = {
      deviceId: typeof raw.deviceId === "string" ? raw.deviceId : undefined,
      temperature: sanitizedTemperature,
      humidity: sanitizedHumidity,
      light: sanitizedLight,
      rain: rawRain,
      timestamp,
      heartbeat,
      deviceTimestamp: timestampInfo.deviceTimestamp,
      deviceUptimeMs: timestampInfo.deviceUptimeMs,
      heartbeatAt: heartbeat,
      mode,
      deviceState,
      lastCommand,
    };

    const incomplete = mode === undefined || deviceState === undefined;
    return { ok: true, value, incomplete };
  }
}

