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
};

export type ValidTelemetryPayload = {
  deviceId?: string;
  temperature: number;
  humidity: number;
  light: number;
  rain: boolean;
  timestamp: number;
  heartbeat: number;
  mode?: "AUTO" | "MANUAL";
  deviceState?: "OPEN" | "CLOSED" | "RESTARTING";
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
    const timestamp = toSafeTimestamp(raw.timestamp, receivedAt);
    const heartbeat = toSafeTimestamp(raw.heartbeat, timestamp);

    const mode = raw.mode === "AUTO" || raw.mode === "MANUAL" ? raw.mode : undefined;
    const deviceState =
      raw.status === "OPEN" || raw.status === "CLOSED" || raw.status === "RESTARTING"
        ? raw.status
        : undefined;

    const value: ValidTelemetryPayload = {
      deviceId: typeof raw.deviceId === "string" ? raw.deviceId : undefined,
      temperature: sanitizedTemperature,
      humidity: sanitizedHumidity,
      light: sanitizedLight,
      rain: rawRain,
      timestamp,
      heartbeat,
      mode,
      deviceState,
    };

    const incomplete = mode === undefined || deviceState === undefined;
    return { ok: true, value, incomplete };
  }
}

