import { useEffect, useMemo } from "react";
import { SensorAnalytics, DailyStats, HourlyBreakdown, Trend } from "@/services/SensorAnalytics";
import { DeviceHealthService, type DeviceHealth, type DeviceHealthOptions } from "@/services/DeviceHealthService";
import { SmartAlertsService, type SmartAlert } from "@/services/SmartAlertsService";
import type { SensorHistoryItem } from "@/hooks/useSensor";
import type { ConnectionSnapshot } from "@/hooks/useSensor";
import { useAnalyticsStore } from "@/stores/analyticsStore";

export type AnalyticsSnapshot = {
  dailyStats: DailyStats;
  hourlyBreakdown: HourlyBreakdown[];
  temperatureTrend: Trend;
  humidityTrend: Trend;
  clothesDryEstimate: boolean;
  deviceHealth: DeviceHealth;
  smartAlerts: SmartAlert[];
  dataSufficiency: {
    hasMinimumTelemetry: boolean;
    hasOperationalPattern: boolean;
    canEstimateDryingEfficiency: boolean;
  };
  loading: boolean;
};

export function useAnalytics(
  historyData: SensorHistoryItem[],
  connection: ConnectionSnapshot,
  healthOptions?: DeviceHealthOptions,
) {
  const setLoading = useAnalyticsStore((state) => state.setLoading);
  const setSufficiency = useAnalyticsStore((state) => state.setSufficiency);
  const setComputedAt = useAnalyticsStore((state) => state.setComputedAt);

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
        dataSufficiency: {
          hasMinimumTelemetry: false,
          hasOperationalPattern: false,
          canEstimateDryingEfficiency: false,
        },
        loading: true,
      };
    }

    // Extract sensor data from history
    const sensorData = historyData.map((item) => item.data);

    // Calculate analytics
    const validSensorData = sensorData.filter(
      (item) =>
        Number.isFinite(item.temperature) &&
        Number.isFinite(item.humidity) &&
        Number.isFinite(item.light) &&
        Number.isFinite(new Date(item.timestamp).getTime()),
    );
    const hasMinimumTelemetry = validSensorData.length >= 2;
    const hasOperationalPattern = validSensorData.length >= 24;
    const canEstimateDryingEfficiency = validSensorData.length >= 48;

    const dailyStats = SensorAnalytics.calculateDailyStats(validSensorData);
    const hourlyBreakdown = SensorAnalytics.getHourlyBreakdown(validSensorData);
    const temperatureTrend = hasMinimumTelemetry
      ? SensorAnalytics.getTrendAnalysis(validSensorData, "temperature")
      : "stable";
    const humidityTrend = hasMinimumTelemetry
      ? SensorAnalytics.getTrendAnalysis(validSensorData, "humidity")
      : "stable";
    const clothesDryEstimate = canEstimateDryingEfficiency
      ? SensorAnalytics.detectClothesDryState(validSensorData)
      : false;

    // Calculate device health
    const deviceHealth = DeviceHealthService.calculateHealth(
      connection,
      historyData,
      healthOptions,
    );

    // Generate smart alerts
    const smartAlerts = SmartAlertsService.generateAllAlerts(validSensorData, deviceHealth);

    return {
      dailyStats,
      hourlyBreakdown,
      temperatureTrend,
      humidityTrend,
      clothesDryEstimate,
      deviceHealth,
      smartAlerts,
      dataSufficiency: {
        hasMinimumTelemetry,
        hasOperationalPattern,
        canEstimateDryingEfficiency,
      },
      loading: false,
    };
  }, [historyData, connection, healthOptions]);

  useEffect(() => {
    setLoading(snapshot.loading);
    setSufficiency(snapshot.dataSufficiency.hasMinimumTelemetry);
    if (!snapshot.loading) {
      setComputedAt(Date.now());
    }
  }, [setComputedAt, setLoading, setSufficiency, snapshot.dataSufficiency.hasMinimumTelemetry, snapshot.loading]);

  return snapshot;
}
