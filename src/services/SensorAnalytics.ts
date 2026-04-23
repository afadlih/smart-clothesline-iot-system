import { SensorData } from "@/models/SensorData";

export type DailyStats = {
  date: string;
  temperature: { min: number; max: number; avg: number; median: number };
  humidity: { min: number; max: number; avg: number; median: number };
  light: { min: number; max: number; avg: number; median: number };
  rainEvents: number;
  operationHours: number;
  clothesDryEstimate: boolean;
  dataPoints: number;
};

export type HourlyBreakdown = {
  hour: number;
  temperature: number;
  humidity: number;
  light: number;
  rainCount: number;
  dataPoints: number;
};

export type Trend = "increasing" | "decreasing" | "stable";

export class SensorAnalytics {
  /**
   * Calculate daily statistics from sensor data
   */
  static calculateDailyStats(data: SensorData[]): DailyStats {
    if (data.length === 0) {
      const emptyStats: DailyStats = {
        date: new Date().toISOString().split("T")[0],
        temperature: { min: 0, max: 0, avg: 0, median: 0 },
        humidity: { min: 0, max: 0, avg: 0, median: 0 },
        light: { min: 0, max: 0, avg: 0, median: 0 },
        rainEvents: 0,
        operationHours: 0,
        clothesDryEstimate: false,
        dataPoints: 0,
      };
      return emptyStats;
    }

    const temperatures = data.map((d) => d.temperature);
    const humidities = data.map((d) => d.humidity);
    const lights = data.map((d) => d.light);
    const rainCount = data.filter((d) => d.isRaining()).length;

    const getStats = (values: number[]) => ({
      min: Math.min(...values),
      max: Math.max(...values),
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      median: this.getMedian(values),
    });

    // Clothes dry: humidity < 40% AND temperature > 25°C
    const clothesDry = data.some((d) => d.humidity < 40 && d.temperature > 25);

    // Operation hours: approximate based on data spread
    const firstTime = new Date(data[0].timestamp).getTime();
    const lastTime = new Date(data[data.length - 1].timestamp).getTime();
    const operationHours = (lastTime - firstTime) / (1000 * 60 * 60);

    return {
      date: new Date(data[0].timestamp).toISOString().split("T")[0],
      temperature: getStats(temperatures),
      humidity: getStats(humidities),
      light: getStats(lights),
      rainEvents: rainCount,
      operationHours: Math.min(24, Math.round(operationHours * 10) / 10),
      clothesDryEstimate: clothesDry,
      dataPoints: data.length,
    };
  }

  /**
   * Get hourly breakdown of sensor data
   */
  static getHourlyBreakdown(data: SensorData[]): HourlyBreakdown[] {
    if (data.length === 0) return [];

    const hourlyMap = new Map<number, SensorData[]>();

    // Group by hour
    data.forEach((d) => {
      const hour = new Date(d.timestamp).getHours();
      if (!hourlyMap.has(hour)) {
        hourlyMap.set(hour, []);
      }
      hourlyMap.get(hour)!.push(d);
    });

    // Calculate averages for each hour
    const breakdown: HourlyBreakdown[] = [];
    for (let h = 0; h < 24; h++) {
      const hourData = hourlyMap.get(h) || [];
      if (hourData.length === 0) continue;

      const avgTemp = hourData.reduce((sum, d) => sum + d.temperature, 0) / hourData.length;
      const avgHum = hourData.reduce((sum, d) => sum + d.humidity, 0) / hourData.length;
      const avgLight = hourData.reduce((sum, d) => sum + d.light, 0) / hourData.length;
      const rainCount = hourData.filter((d) => d.isRaining()).length;

      breakdown.push({
        hour: h,
        temperature: Math.round(avgTemp * 10) / 10,
        humidity: Math.round(avgHum * 10) / 10,
        light: Math.round(avgLight),
        rainCount,
        dataPoints: hourData.length,
      });
    }

    return breakdown;
  }

  /**
   * Detect trend (increasing, decreasing, stable)
   */
  static getTrendAnalysis(data: SensorData[], metric: "temperature" | "humidity"): Trend {
    if (data.length < 2) return "stable";

    const values = data.map((d) => (metric === "temperature" ? d.temperature : d.humidity));

    // Split into first and second half
    const mid = Math.floor(values.length / 2);
    const firstHalf = values.slice(0, mid);
    const secondHalf = values.slice(mid);

    const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    const difference = avgSecond - avgFirst;
    const threshold = 2; // 2 degree/percent threshold

    if (difference > threshold) return "increasing";
    if (difference < -threshold) return "decreasing";
    return "stable";
  }

  /**
   * Detect if clothes are likely dry
   * Criteria: humidity < 40% AND temperature > 25°C
   */
  static detectClothesDryState(data: SensorData[]): boolean {
    if (data.length === 0) return false;

    // Check last 20 minutes of data
    const now = Date.now();
    const twentyMinutesAgo = now - 20 * 60 * 1000;
    const recentData = data.filter((d) => new Date(d.timestamp).getTime() > twentyMinutesAgo);

    if (recentData.length === 0) return false;

    // All recent data must have humidity < 40 AND temperature > 25
    return recentData.every((d) => d.humidity < 40 && d.temperature > 25);
  }

  /**
   * Get total operation hours
   */
  static getOperationHours(data: SensorData[]): number {
    if (data.length < 2) return 0;

    const firstTime = new Date(data[0].timestamp).getTime();
    const lastTime = new Date(data[data.length - 1].timestamp).getTime();
    const hoursDiff = (lastTime - firstTime) / (1000 * 60 * 60);

    return Math.min(24, Math.round(hoursDiff * 10) / 10);
  }

  /**
   * Get median value from array
   */
  private static getMedian(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }

  /**
   * Detect anomalies in sensor data
   */
  static detectAnomalies(data: SensorData[]): string[] {
    if (data.length < 3) return [];

    const anomalies: string[] = [];

    // Check for unrealistic values
    data.forEach((d) => {
      if (d.temperature < -10 || d.temperature > 60) {
        anomalies.push(`Anomaly: Unrealistic temperature ${d.temperature}°C`);
      }
      if (d.humidity < 0 || d.humidity > 100) {
        anomalies.push(`Anomaly: Invalid humidity ${d.humidity}%`);
      }
      if (d.light < 0 || d.light > 10000) {
        anomalies.push(`Anomaly: Invalid light level ${d.light}`);
      }
    });

    // Check for sudden spikes
    for (let i = 1; i < data.length; i++) {
      const prev = data[i - 1];
      const curr = data[i];

      const tempDiff = Math.abs(curr.temperature - prev.temperature);
      if (tempDiff > 15) {
        anomalies.push(`Sudden temperature change: ${tempDiff}°C`);
      }

      const humDiff = Math.abs(curr.humidity - prev.humidity);
      if (humDiff > 40) {
        anomalies.push(`Sudden humidity change: ${humDiff}%`);
      }
    }

    return [...new Set(anomalies)]; // Remove duplicates
  }
}
