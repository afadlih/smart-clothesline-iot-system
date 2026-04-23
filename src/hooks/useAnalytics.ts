import { useMemo } from "react";
import { SensorAnalytics, DailyStats, HourlyBreakdown, Trend } from "@/services/SensorAnalytics";
import { DeviceHealthService, type DeviceHealth, type DeviceHealthOptions } from "@/services/DeviceHealthService";
import { SmartAlertsService, type SmartAlert } from "@/services/SmartAlertsService";
import type { SensorHistoryItem } from "@/hooks/useSensor";
import type { ConnectionSnapshot } from "@/hooks/useSensor";

export type AnalyticsSnapshot = {
  dailyStats: DailyStats;
  hourlyBreakdown: HourlyBreakdown[];
  temperatureTrend: Trend;
  humidityTrend: Trend;
  clothesDryEstimate: boolean;
  deviceHealth: DeviceHealth;
  smartAlerts: SmartAlert[];
  loading: boolean;
};

export function useAnalytics(
  historyData: SensorHistoryItem[],
  connection: ConnectionSnapshot,
  healthOptions?: DeviceHealthOptions,
) {
  const snapshot = useMemo<AnalyticsSnapshot>(() => {
    if (!historyData || historyData.length === 0) {
      return {
        dailyStats: {
          date: new Date().toISOString().split("T")[0],
          temperature: { min: 0, max: 0, avg: 0, median: 0 },
          humidity: { min: 0, max: 0, avg: 0, median: 0 },
          light: { min: 0, max: 0, avg: 0, median: 0 },
          rainEvents: 0,
          operationHours: 0,
          clothesDryEstimate: false,
          dataPoints: 0,
        },
        hourlyBreakdown: [],
        temperatureTrend: "stable",
        humidityTrend: "stable",
        clothesDryEstimate: false,
        deviceHealth: {
          uptime: { totalDays: 0, consecutiveDays: 0, percentage: 0 },
          reliability: {
            commandSuccessRate: 0,
            averageResponseTimeMs: 0,
            lastFailureAt: null,
            totalCommands: 0,
            failedCommands: 0,
          },
          connectionQuality: {
            lastSeenAgo: Infinity,
            reconnectionCount: 0,
            lastDisruptionAt: null,
            isOnline: false,
          },
          anomalies: [],
          healthScore: 0,
          status: "critical",
        },
        smartAlerts: [],
        loading: true,
      };
    }

    // Extract sensor data from history
    const sensorData = historyData.map((item) => item.data);

    // Calculate analytics
    const dailyStats = SensorAnalytics.calculateDailyStats(sensorData);
    const hourlyBreakdown = SensorAnalytics.getHourlyBreakdown(sensorData);
    const temperatureTrend = SensorAnalytics.getTrendAnalysis(sensorData, "temperature");
    const humidityTrend = SensorAnalytics.getTrendAnalysis(sensorData, "humidity");
    const clothesDryEstimate = SensorAnalytics.detectClothesDryState(sensorData);

    // Calculate device health
    const deviceHealth = DeviceHealthService.calculateHealth(
      connection,
      historyData,
      healthOptions,
    );

    // Generate smart alerts
    const smartAlerts = SmartAlertsService.generateAllAlerts(sensorData, deviceHealth);

    return {
      dailyStats,
      hourlyBreakdown,
      temperatureTrend,
      humidityTrend,
      clothesDryEstimate,
      deviceHealth,
      smartAlerts,
      loading: false,
    };
  }, [historyData, connection, healthOptions]);

  return snapshot;
}
