import {
  SensorValidationLayer,
  type RawTelemetryPayload,
  type ValidTelemetryPayload,
} from "@/services/SensorValidationLayer";
import { TelemetryHeartbeatService } from "@/services/TelemetryHeartbeatService";

export type NormalizedTelemetry = ValidTelemetryPayload & {
  receivedAt: number;
  incomplete: boolean;
  stale: boolean;
  source: string;
};

export type NormalizeResult =
  | { ok: true; value: NormalizedTelemetry; duplicate: boolean }
  | { ok: false; reason: string };

function isNearEqual(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.0001;
}

export class TelemetryNormalizerService {
  private static previous: NormalizedTelemetry | null = null;

  private static aliasToRawTelemetry(raw: RawTelemetryPayload): RawTelemetryPayload {
    const input = raw as Record<string, unknown>;
    const rainCandidate = input.rain ?? input.rainDetected ?? input.isRaining ?? input.rainVal;
    const statusCandidate = input.status ?? input.state ?? input.clotheslineStatus;
    const modeCandidate = input.mode ?? input.operationMode;

    const normalizedRain =
      typeof rainCandidate === "boolean"
        ? rainCandidate
        : typeof rainCandidate === "number"
          ? rainCandidate > 0
          : typeof rainCandidate === "string"
            ? ["1", "true", "yes", "rain"].includes(rainCandidate.trim().toLowerCase())
            : false;

    return {
      deviceId: input.deviceId ?? input.device_id ?? input.device,
      temperature: input.temperature ?? input.temp,
      humidity: input.humidity ?? input.hum,
      light: input.light ?? input.lightValue ?? input.ldr ?? input.lightRaw,
      lightRaw: input.lightRaw ?? input.ldr,
      lightThreshold: input.lightThreshold,
      rain: normalizedRain,
      rainVal: input.rainVal ?? input.rainDetected ?? input.isRaining,
      rainRaw: input.rainRaw ?? input.rainVal,
      timestamp: input.timestamp ?? input.receivedAt ?? input.createdAt,
      heartbeat: input.heartbeat ?? input.timestamp ?? input.receivedAt,
      mode: typeof modeCandidate === "string" ? modeCandidate.toUpperCase() : modeCandidate,
      status: typeof statusCandidate === "string" ? statusCandidate.toUpperCase() : statusCandidate,
      lastCommand: input.lastCommand,
    };
  }

  static normalize(raw: RawTelemetryPayload, receivedAt: number): NormalizeResult {
    const sourceRaw = raw as Record<string, unknown>;
    const source = String(sourceRaw.source ?? sourceRaw.stateSource ?? sourceRaw.state_source ?? "mqtt");
    const validation = SensorValidationLayer.validate(this.aliasToRawTelemetry(raw), receivedAt);
    if (!validation.ok) {
      return validation;
    }

    const normalized: NormalizedTelemetry = {
      ...validation.value,
      receivedAt,
      incomplete: validation.incomplete,
      stale: receivedAt - validation.value.heartbeat > TelemetryHeartbeatService.OFFLINE_TIMEOUT_MS,
      source,
    };

    const prev = TelemetryNormalizerService.previous;
    const duplicate =
      prev !== null &&
      prev.deviceId === normalized.deviceId &&
      isNearEqual(prev.temperature, normalized.temperature) &&
      isNearEqual(prev.humidity, normalized.humidity) &&
      isNearEqual(prev.light, normalized.light) &&
      prev.rain === normalized.rain &&
      prev.mode === normalized.mode &&
      prev.deviceState === normalized.deviceState &&
      prev.lastCommand === normalized.lastCommand;

    if (!duplicate) {
      TelemetryNormalizerService.previous = normalized;
    }

    return { ok: true, value: normalized, duplicate };
  }
}

