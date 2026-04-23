import { SensorData } from "@/models/SensorData";
import type { DailyStats } from "@/services/SensorAnalytics";

export class DataExportService {
  /**
   * Export sensor data to CSV format
   */
  static exportToCSV(data: SensorData[], filename: string = "sensor-data.csv"): void {
    if (data.length === 0) {
      console.warn("[Export] No data to export");
      return;
    }

    // CSV headers
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

    // CSV rows
    const rows = data.map((item) => {
      const date = new Date(item.timestamp);
      return [
        item.timestamp,
        date.toLocaleDateString("id-ID"),
        date.toLocaleTimeString("id-ID"),
        item.temperature.toFixed(1),
        item.humidity.toFixed(1),
        item.light.toFixed(0),
        item.isRaining() ? "Yes" : "No",
        item.status,
      ];
    });

    // Build CSV content
    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    // Add BOM for Excel UTF-8 compatibility
    const bom = "\uFEFF";
    const blob = new Blob([bom + csvContent], { type: "text/csv;charset=utf-8;" });

    // Trigger download
    this.downloadFile(blob, filename);
  }

  /**
   * Export sensor data to JSON format
   */
  static exportToJSON(
    data: SensorData[],
    filename: string = "sensor-data.json",
  ): void {
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

  /**
   * Generate daily report as text
   */
  static generateDailyReport(data: SensorData[]): string {
    if (data.length === 0) {
      return "No data available for report.";
    }

    const date = new Date(data[0].timestamp);
    const temps = data.map((d) => d.temperature);
    const hums = data.map((d) => d.humidity);
    const lights = data.map((d) => d.light);

    const report = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SMART CLOTHESLINE - DAILY REPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Date: ${date.toLocaleDateString("id-ID")}
Data Points: ${data.length}

TEMPERATURE (°C)
  Min:    ${Math.min(...temps).toFixed(1)}
  Max:    ${Math.max(...temps).toFixed(1)}
  Avg:    ${(temps.reduce((a, b) => a + b) / temps.length).toFixed(1)}

HUMIDITY (%)
  Min:    ${Math.min(...hums).toFixed(1)}
  Max:    ${Math.max(...hums).toFixed(1)}
  Avg:    ${(hums.reduce((a, b) => a + b) / hums.length).toFixed(1)}

LIGHT (lux)
  Min:    ${Math.min(...lights).toFixed(0)}
  Max:    ${Math.max(...lights).toFixed(0)}
  Avg:    ${(lights.reduce((a, b) => a + b) / lights.length).toFixed(0)}

RAIN EVENTS: ${data.filter((d) => d.isRaining()).length}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

    return report;
  }

  /**
   * Generate weekly report
   */
  static generateWeeklyReport(dailyStats: DailyStats[]): string {
    if (dailyStats.length === 0) {
      return "No data available for report.";
    }

    const avgTemp =
      dailyStats.reduce((sum, s) => sum + s.temperature.avg, 0) / dailyStats.length;
    const avgHum =
      dailyStats.reduce((sum, s) => sum + s.humidity.avg, 0) / dailyStats.length;
    const totalRainDays = dailyStats.filter((s) => s.rainEvents > 0).length;

    const report = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SMART CLOTHESLINE - WEEKLY REPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Days Monitored: ${dailyStats.length}

AVERAGE TEMPERATURE: ${avgTemp.toFixed(1)}°C
AVERAGE HUMIDITY: ${avgHum.toFixed(1)}%
RAINY DAYS: ${totalRainDays}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

    return report;
  }

  /**
   * Private helper to trigger file download
   */
  private static downloadFile(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);

    console.info(`[Export] File downloaded: ${filename}`);
  }

  /**
   * Copy data to clipboard as JSON
   */
  static async copyToClipboard(data: SensorData[]): Promise<boolean> {
    try {
      const json = JSON.stringify(data, null, 2);
      await navigator.clipboard.writeText(json);
      console.info("[Export] Data copied to clipboard");
      return true;
    } catch (error) {
      console.error("[Export] Failed to copy to clipboard:", error);
      return false;
    }
  }

  /**
   * Export data from the last N days
   */
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
    if (format === "csv") {
      this.exportToCSV(filtered, filename);
    } else {
      this.exportToJSON(filtered, filename);
    }
  }

  /**
   * Calculate localStorage size in bytes for all stored data
   */
  static calculateCacheSize(): number {
    let totalSize = 0;

    try {
      for (const key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          const item = localStorage.getItem(key);
          if (item) {
            totalSize += item.length + key.length;
          }
        }
      }
    } catch (error) {
      console.error("[Export] Failed to calculate cache size:", error);
      return 0;
    }

    return totalSize;
  }

  /**
   * Get detailed cache statistics
   */
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
      // Count sensor history items
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;

        if (key.includes("sensor") || key.includes("history")) {
          try {
            const item = localStorage.getItem(key);
            if (item) {
              const parsed = JSON.parse(item);
              if (Array.isArray(parsed)) {
                historyCount += parsed.length;
              } else {
                historyCount += 1;
              }
            }
          } catch {
            historyCount += 1;
          }
        } else if (key.includes("queue")) {
          try {
            const item = localStorage.getItem(key);
            if (item) {
              const parsed = JSON.parse(item);
              if (Array.isArray(parsed)) {
                queueCount += parsed.length;
              } else {
                queueCount += 1;
              }
            }
          } catch {
            queueCount += 1;
          }
        } else if (key.includes("event")) {
          try {
            const item = localStorage.getItem(key);
            if (item) {
              const parsed = JSON.parse(item);
              if (Array.isArray(parsed)) {
                eventsCount += parsed.length;
              } else {
                eventsCount += 1;
              }
            }
          } catch {
            eventsCount += 1;
          }
        }
      }
    } catch (error) {
      console.error("[Export] Failed to get cache stats:", error);
    }

    const totalSize = this.calculateCacheSize();
    const totalKB = Math.round(totalSize / 1024);

    return {
      history: historyCount,
      queue: queueCount,
      events: eventsCount,
      total: historyCount + queueCount + eventsCount,
      totalKB,
    };
  }
}
