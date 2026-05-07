import {
  SensorValidationLayer,
  type RawTelemetryPayload,
  type ValidTelemetryPayload,
} from "@/services/SensorValidationLayer";

export type NormalizedTelemetry = ValidTelemetryPayload & {
  receivedAt: number;
  incomplete: boolean;
  stale: boolean;
};

type NormalizeResult =
  | { ok: true; value: NormalizedTelemetry; duplicate: boolean }
  | { ok: false; reason: string };

function isNearEqual(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.0001;
}

export class TelemetryNormalizerService {
  private static previous: NormalizedTelemetry | null = null;

  static normalize(raw: RawTelemetryPayload, receivedAt: number): NormalizeResult {
    const validation = SensorValidationLayer.validate(raw, receivedAt);
    if (!validation.ok) {
      return validation;
    }

    const normalized: NormalizedTelemetry = {
      ...validation.value,
      receivedAt,
      incomplete: validation.incomplete,
      stale: receivedAt - validation.value.timestamp > 30_000,
    };

    const prev = TelemetryNormalizerService.previous;
    const duplicate =
      prev !== null &&
      prev.deviceId === normalized.deviceId &&
      isNearEqual(prev.temperature, normalized.temperature) &&
      isNearEqual(prev.humidity, normalized.humidity) &&
      isNearEqual(prev.light, normalized.light) &&
      prev.rain === normalized.rain &&
      Math.abs(prev.timestamp - normalized.timestamp) < 1000;

    if (!duplicate) {
      TelemetryNormalizerService.previous = normalized;
    }

    return { ok: true, value: normalized, duplicate };
  }
}

