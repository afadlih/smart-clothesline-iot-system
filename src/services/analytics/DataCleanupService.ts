import type { SensorData } from "@/models/SensorData";

type CleanupOptions = {
  maxItems?: number;
  maxAgeMs?: number;
  now?: number;
};

export class DataCleanupService {
  static normalize(records: SensorData[]): SensorData[] {
    return records.filter((record) => {
      const timestamp = new Date(record.timestamp).getTime();
      return (
        Number.isFinite(record.temperature) &&
        Number.isFinite(record.humidity) &&
        Number.isFinite(record.light) &&
        Number.isFinite(timestamp)
      );
    });
  }

  static dedupeConsecutive(records: SensorData[]): SensorData[] {
    const output: SensorData[] = [];
    for (const item of records) {
      const prev = output[output.length - 1];
      if (
        prev &&
        prev.temperature === item.temperature &&
        prev.humidity === item.humidity &&
        prev.light === item.light &&
        prev.rain === item.rain &&
        prev.status === item.status
      ) {
        continue;
      }
      output.push(item);
    }
    return output;
  }

  static trim(records: SensorData[], options: CleanupOptions = {}): SensorData[] {
    const now = options.now ?? Date.now();
    const maxItems = options.maxItems ?? 5000;
    const maxAgeMs = options.maxAgeMs ?? 1000 * 60 * 60 * 24 * 30;
    const minTs = now - maxAgeMs;

    const recent = records.filter((record) => new Date(record.timestamp).getTime() >= minTs);
    if (recent.length <= maxItems) return recent;
    return recent.slice(recent.length - maxItems);
  }

  static markFreshness(lastUpdateAt: number | null, now: number = Date.now()): "fresh" | "stale" | "offline" {
    if (!lastUpdateAt) return "offline";
    const age = now - lastUpdateAt;
    if (age <= 10_000) return "fresh";
    if (age <= 30_000) return "stale";
    return "offline";
  }
}

