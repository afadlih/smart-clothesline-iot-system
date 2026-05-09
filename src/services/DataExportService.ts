import { SensorData } from "@/models/SensorData";
import type { DailyStats } from "@/services/SensorAnalytics";

export class DataExportService {
  static exportToCSV(data: SensorData[], filename = "sensor-data.csv"): void {
    if (data.length === 0) {
      console.warn("[Export] No data to export");
      return;
    }

    const headers = [
      "Timestamp",
      "Date",
      "Time",
      "Temperature (°C)",
      "Humidity (%)",
      "Light (lux)",
      "Rain",
      "Status",
    ];

    const rows = data.map((item) => {
      const date = new Date(item.timestamp);
      return [
        item.timestamp,
        date.toLocaleDateString("en-US"),
        date.toLocaleTimeString("en-US"),
        item.temperature.toFixed(1),
        item.humidity.toFixed(1),
        item.light.toFixed(0),
        item.isRaining() ? "Yes" : "No",
        item.status,
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const bom = "\uFEFF";
    const blob = new Blob([bom + csvContent], { type: "text/csv;charset=utf-8;" });
    this.downloadFile(blob, filename);
  }

  static exportToJSON(data: SensorData[], filename = "sensor-data.json"): void {
    if (data.length === 0) {
      console.warn("[Export] No data to export");
      return;
    }

    const jsonData = {
      metadata: {
        exportedAt: new Date().toISOString(),
        totalRecords: data.length,
        dateRange: {
          from: data[0].timestamp,
          to: data[data.length - 1].timestamp,
        },
        device: "Smart Clothesline System",
      },
      data: data.map((item) => ({
        timestamp: item.timestamp,
        temperature: item.temperature,
        humidity: item.humidity,
        light: item.light,
        rain: item.isRaining(),
        status: item.status,
      })),
    };

    const blob = new Blob([JSON.stringify(jsonData, null, 2)], {
      type: "application/json;charset=utf-8;",
    });
    this.downloadFile(blob, filename);
  }

  static generateDailyReport(data: SensorData[]): string {
    if (data.length === 0) return "No data available for report.";

    const date = new Date(data[0].timestamp);
    const temps = data.map((d) => d.temperature);
    const hums = data.map((d) => d.humidity);
    const lights = data.map((d) => d.light);
    const line = "------------------------------------------------------------";

    return `
${line}
SMART CLOTHESLINE - DAILY REPORT
${line}

Date: ${date.toLocaleDateString("en-US")}
Data Points: ${data.length}

TEMPERATURE (°C)
  Min: ${Math.min(...temps).toFixed(1)}
  Max: ${Math.max(...temps).toFixed(1)}
  Avg: ${(temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1)}

HUMIDITY (%)
  Min: ${Math.min(...hums).toFixed(1)}
  Max: ${Math.max(...hums).toFixed(1)}
  Avg: ${(hums.reduce((a, b) => a + b, 0) / hums.length).toFixed(1)}

LIGHT (lux)
  Min: ${Math.min(...lights).toFixed(0)}
  Max: ${Math.max(...lights).toFixed(0)}
  Avg: ${(lights.reduce((a, b) => a + b, 0) / lights.length).toFixed(0)}

RAIN EVENTS: ${data.filter((d) => d.isRaining()).length}

${line}
`.trim();
  }

  static generateWeeklyReport(dailyStats: DailyStats[]): string {
    if (dailyStats.length === 0) return "No data available for report.";

    const avgTemp = dailyStats.reduce((sum, s) => sum + s.temperature.avg, 0) / dailyStats.length;
    const avgHum = dailyStats.reduce((sum, s) => sum + s.humidity.avg, 0) / dailyStats.length;
    const totalRainDays = dailyStats.filter((s) => s.rainEvents > 0).length;
    const line = "------------------------------------------------------------";

    return `
${line}
SMART CLOTHESLINE - WEEKLY REPORT
${line}

Days Monitored: ${dailyStats.length}
AVERAGE TEMPERATURE: ${avgTemp.toFixed(1)}°C
AVERAGE HUMIDITY: ${avgHum.toFixed(1)}%
RAINY DAYS: ${totalRainDays}

${line}
`.trim();
  }

  private static downloadFile(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    console.info(`[Export] File downloaded: ${filename}`);
  }

  static async copyToClipboard(data: SensorData[]): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      console.info("[Export] Data copied to clipboard");
      return true;
    } catch (error) {
      console.error("[Export] Failed to copy to clipboard:", error);
      return false;
    }
  }

  static exportLastNDays(data: SensorData[], days: number, format: "csv" | "json" = "csv"): void {
    const now = Date.now();
    const nDaysAgo = now - days * 24 * 60 * 60 * 1000;
    const filtered = data.filter((d) => {
      const timestamp = new Date(d.timestamp).getTime();
      return Number.isFinite(timestamp) && timestamp >= nDaysAgo;
    });

    if (filtered.length === 0) {
      console.warn(`[Export] No data found for the last ${days} days`);
      return;
    }

    const filename = `clothesline-${days}days-${new Date().toISOString().split("T")[0]}.${format}`;
    if (format === "csv") this.exportToCSV(filtered, filename);
    else this.exportToJSON(filtered, filename);
  }

  static calculateCacheSize(): number {
    let totalSize = 0;
    try {
      for (const key in localStorage) {
        if (Object.prototype.hasOwnProperty.call(localStorage, key)) {
          const item = localStorage.getItem(key);
          if (item) totalSize += item.length + key.length;
        }
      }
    } catch (error) {
      console.error("[Export] Failed to calculate cache size:", error);
      return 0;
    }
    return totalSize;
  }

  static getCacheStats(): {
    history: number;
    queue: number;
    events: number;
    total: number;
    totalKB: number;
  } {
    let historyCount = 0;
    let queueCount = 0;
    let eventsCount = 0;

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;
        const item = localStorage.getItem(key);
        if (!item) continue;

        const counter = () => {
          try {
            const parsed = JSON.parse(item);
            return Array.isArray(parsed) ? parsed.length : 1;
          } catch {
            return 1;
          }
        };

        if (key.includes("sensor") || key.includes("history")) historyCount += counter();
        else if (key.includes("queue")) queueCount += counter();
        else if (key.includes("event")) eventsCount += counter();
      }
    } catch (error) {
      console.error("[Export] Failed to get cache stats:", error);
    }

    const totalSize = this.calculateCacheSize();
    return {
      history: historyCount,
      queue: queueCount,
      events: eventsCount,
      total: historyCount + queueCount + eventsCount,
      totalKB: Math.round(totalSize / 1024),
    };
  }
}
