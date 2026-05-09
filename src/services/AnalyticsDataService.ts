import { Timestamp, collection, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { SensorData } from "@/models/SensorData";
import { logger } from "@/lib/logger";

export type TimeRange = "1h" | "6h" | "24h" | "7d" | "30d";

export interface AnalyticsResult {
  data: SensorData[];
  stats: {
    avgTemp: number | null;
    avgHumidity: number | null;
    avgLight: number | null;
    rainCount: number;
    openPercentage: number | null;
    dataPoints: number;
  };
  source: "firestore";
  recordCount: number;
  rangeStart: number;
  rangeEnd: number;
  dataSufficiency: "empty" | "minimal" | "usable" | "strong";
}

export class AnalyticsDataService {
  private static COLLECTION = "sensor_data";
  private static RANGE_LIMITS: Record<TimeRange, number> = {
    "1h": 300,
    "6h": 700,
    "24h": 1500,
    "7d": 3000,
    "30d": 5000,
  };

  private static normalizeTimestamp(value: unknown): number | null {
    if (value && typeof value === "object" && "toMillis" in value && typeof (value as { toMillis?: unknown }).toMillis === "function") {
      const ms = (value as { toMillis: () => number }).toMillis();
      return Number.isFinite(ms) && ms > 0 ? ms : null;
    }
    if (value instanceof Date) {
      const ms = value.getTime();
      return Number.isFinite(ms) && ms > 0 ? ms : null;
    }
    if (typeof value === "number" && Number.isFinite(value) && value > 0) {
      return value < 1_000_000_000_000 ? value * 1000 : value;
    }
    if (typeof value === "string") {
      const ms = Date.parse(value);
      return Number.isFinite(ms) && ms > 0 ? ms : null;
    }
    return null;
  }

  private static toFiniteNumber(value: unknown): number | null {
    if (typeof value !== "number" || !Number.isFinite(value)) return null;
    return value;
  }

  static async getHistoricalData(range: TimeRange): Promise<AnalyticsResult> {
    try {
      const now = Date.now();
      let startTime = now - 60 * 60 * 1000; // default 1h

      if (range === "6h") startTime = now - 6 * 60 * 60 * 1000;
      else if (range === "24h") startTime = now - 24 * 60 * 60 * 1000;
      else if (range === "7d") startTime = now - 7 * 24 * 60 * 60 * 1000;
      else if (range === "30d") startTime = now - 30 * 24 * 60 * 60 * 1000;
      const rangeLimit = this.RANGE_LIMITS[range];
      const startTimestamp = Timestamp.fromMillis(startTime);

      const q = query(
        collection(db, this.COLLECTION),
        where("createdAt", ">=", startTimestamp),
        orderBy("createdAt", "asc"),
        limit(rangeLimit),
      );

      const snapshot = await getDocs(q);
      const data: SensorData[] = [];
      const dedupeKeys = new Set<string>();
      
      let sumTemp = 0;
      let sumHum = 0;
      let sumLight = 0;
      let rainCount = 0;
      let openCount = 0;

      snapshot.docs.forEach((doc) => {
        const raw = doc.data() as Record<string, unknown>;
        const createdAtMs = this.normalizeTimestamp(raw.createdAt);
        const temperature = this.toFiniteNumber(raw.temperature);
        const humidity = this.toFiniteNumber(raw.humidity);
        const light = this.toFiniteNumber(raw.light);
        const rain = typeof raw.rain === "boolean" ? raw.rain : null;
        const status = raw.status === "OPEN" || raw.status === "CLOSED" ? raw.status : raw.status == null ? "CLOSED" : null;

        if (createdAtMs === null || temperature === null || humidity === null || light === null || rain === null || status === null) {
          return;
        }

        const createdAtDate = new Date(createdAtMs);
        if (!Number.isFinite(createdAtDate.getTime())) {
          return;
        }
        const createdAtIso = createdAtDate.toISOString();
        const dedupeKey = `${createdAtMs}|${temperature}|${humidity}|${light}|${rain}|${status}`;
        if (dedupeKeys.has(dedupeKey)) {
          return;
        }
        dedupeKeys.add(dedupeKey);

        const sensor = new SensorData({
          temp: temperature,
          humidity,
          light,
          rain: rain ? 1 : 0,
          status,
          timestamp: createdAtIso,
        });
        
        data.push(sensor);
        
        sumTemp += sensor.temperature;
        sumHum += sensor.humidity;
        sumLight += sensor.light;
        if (sensor.isRaining()) rainCount++;
        if (sensor.status === "OPEN") openCount++;
      });

      data.sort((a, b) => {
        const aMs = this.normalizeTimestamp(a.timestamp) ?? 0;
        const bMs = this.normalizeTimestamp(b.timestamp) ?? 0;
        return aMs - bMs;
      });

      const count = data.length;
      const avgTemp = count > 0 ? sumTemp / count : null;
      const avgHumidity = count > 0 ? sumHum / count : null;
      const avgLight = count > 0 ? sumLight / count : null;
      const openPercentage = count > 0 ? (openCount / count) * 100 : null;
      const dataSufficiency: AnalyticsResult["dataSufficiency"] =
        count === 0 ? "empty" : count < 5 ? "minimal" : count < 100 ? "usable" : "strong";
      return {
        data,
        stats: {
          avgTemp: avgTemp !== null && Number.isFinite(avgTemp) ? avgTemp : null,
          avgHumidity: avgHumidity !== null && Number.isFinite(avgHumidity) ? avgHumidity : null,
          avgLight: avgLight !== null && Number.isFinite(avgLight) ? avgLight : null,
          rainCount,
          openPercentage: openPercentage !== null && Number.isFinite(openPercentage) ? openPercentage : null,
          dataPoints: count,
        },
        source: "firestore",
        recordCount: count,
        rangeStart: startTime,
        rangeEnd: now,
        dataSufficiency,
      };
    } catch (error) {
      logger.error("firestore", "Failed to fetch analytics data", error);
      throw error;
    }
  }
}
