import { collection, getDocs, orderBy, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { SensorData } from "@/models/SensorData";
import { logger } from "@/lib/logger";

export type TimeRange = "1h" | "6h" | "24h" | "7d" | "30d";

export interface AnalyticsResult {
  data: SensorData[];
  stats: {
    avgTemp: number;
    avgHumidity: number;
    avgLight: number;
    rainCount: number;
    openPercentage: number;
    dataPoints: number;
  };
}

export class AnalyticsDataService {
  private static COLLECTION = "sensor_data";

  static async getHistoricalData(range: TimeRange): Promise<AnalyticsResult> {
    try {
      const now = Date.now();
      let startTime = now - 60 * 60 * 1000; // default 1h

      if (range === "6h") startTime = now - 6 * 60 * 60 * 1000;
      else if (range === "24h") startTime = now - 24 * 60 * 60 * 1000;
      else if (range === "7d") startTime = now - 7 * 24 * 60 * 60 * 1000;
      else if (range === "30d") startTime = now - 30 * 24 * 60 * 60 * 1000;

      // Firestore query
      // Note: We might need a composite index for createdAt + status or other fields if we add filters
      const q = query(
        collection(db, this.COLLECTION),
        where("createdAt", ">=", startTime),
        orderBy("createdAt", "asc")
      );

      const snapshot = await getDocs(q);
      const data: SensorData[] = [];
      
      let sumTemp = 0;
      let sumHum = 0;
      let sumLight = 0;
      let rainCount = 0;
      let openCount = 0;

      snapshot.docs.forEach((doc) => {
        const raw = doc.data();
        const sensor = new SensorData({
          temp: raw.temperature,
          humidity: raw.humidity,
          light: raw.light,
          rain: raw.rain ? 1 : 0,
          status: raw.status,
          timestamp: new Date(raw.createdAt).toISOString(),
        });
        
        data.push(sensor);
        
        sumTemp += sensor.temperature;
        sumHum += sensor.humidity;
        sumLight += sensor.light;
        if (sensor.isRaining()) rainCount++;
        if (sensor.status === "OPEN") openCount++;
      });

      const count = data.length;
      return {
        data,
        stats: {
          avgTemp: count > 0 ? sumTemp / count : 0,
          avgHumidity: count > 0 ? sumHum / count : 0,
          avgLight: count > 0 ? sumLight / count : 0,
          rainCount,
          openPercentage: count > 0 ? (openCount / count) * 100 : 0,
          dataPoints: count,
        }
      };
    } catch (error) {
      logger.error("firestore", "Failed to fetch analytics data", error);
      throw error;
    }
  }
}
