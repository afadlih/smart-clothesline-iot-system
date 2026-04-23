import { SensorData } from "@/models/SensorData";
import { DeviceHealth } from "./DeviceHealthService";

export type SmartAlert = {
  id: string;
  type: "CLOTHES_DRY" | "WEATHER_ANOMALY" | "DEVICE_HEALTH" | "COMMAND_FAILURE";
  title: string;
  description: string;
  severity: "info" | "warning" | "critical";
  timestamp: number;
  actionable: boolean;
  suggestedAction?: string;
};

export class SmartAlertsService {
  /**
   * Check if clothes are ready/dry
   */
  static checkClothesReady(data: SensorData[]): SmartAlert | null {
    if (data.length === 0) return null;

    // Criteria: humidity < 40% AND temperature > 25°C for 20+ minutes
    const now = Date.now();
    const twentyMinutesAgo = now - 20 * 60 * 1000;
    const recentData = data.filter(
      (d) => new Date(d.timestamp).getTime() > twentyMinutesAgo,
    );

    if (recentData.length < 2) return null;

    const allDry = recentData.every((d) => d.humidity < 40 && d.temperature > 25);

    if (allDry) {
      return {
        id: `dry-${Date.now()}`,
        type: "CLOTHES_DRY",
        title: "Clothes Ready",
        description: `Clothes appear to be dry. Humidity: ${Math.round(recentData[recentData.length - 1].humidity)}%, Temp: ${Math.round(recentData[recentData.length - 1].temperature)}°C`,
        severity: "info",
        timestamp: Date.now(),
        actionable: true,
        suggestedAction: "Close clothesline",
      };
    }

    return null;
  }

  /**
   * Check for weather anomalies
   */
  static checkWeatherStability(data: SensorData[]): SmartAlert | null {
    if (data.length < 2) return null;

    const recent = data.slice(-5); // Last 5 readings
    const oldest = data[data.length - 5];
    const newest = data[data.length - 1];

    // Detect sudden rain
    const hasRecentRain = recent.some((d) => d.isRaining());
    const noRainBefore = oldest && !oldest.isRaining();

    if (hasRecentRain && noRainBefore) {
      return {
        id: `rain-${Date.now()}`,
        type: "WEATHER_ANOMALY",
        title: "Sudden Rain",
        description: "Rain detected! Clothesline should be closed.",
        severity: "warning",
        timestamp: Date.now(),
        actionable: true,
        suggestedAction: "Close clothesline immediately",
      };
    }

    // Detect sudden light change
    const lightDiff = Math.abs(newest.light - oldest.light);
    if (lightDiff > 3000) {
      return {
        id: `light-${Date.now()}`,
        type: "WEATHER_ANOMALY",
        title: "Sudden Light Change",
        description: `Light level changed by ${lightDiff} lux. Cloud cover detected.`,
        severity: "info",
        timestamp: Date.now(),
        actionable: false,
      };
    }

    return null;
  }

  /**
   * Generate device health alerts
   */
  static checkDeviceHealth(health: DeviceHealth): SmartAlert[] {
    const alerts: SmartAlert[] = [];

    if (health.status === "critical") {
      alerts.push({
        id: `critical-${Date.now()}`,
        type: "DEVICE_HEALTH",
        title: "Device Critical",
        description: `Device health is critical (${health.healthScore}%). Please check connection.`,
        severity: "critical",
        timestamp: Date.now(),
        actionable: true,
        suggestedAction: "Restart device",
      });
    } else if (health.status === "degraded") {
      alerts.push({
        id: `degraded-${Date.now()}`,
        type: "DEVICE_HEALTH",
        title: "Device Degraded",
        description: `Device health is degraded (${health.healthScore}%). Check connection.`,
        severity: "warning",
        timestamp: Date.now(),
        actionable: false,
      });
    }

    if (!health.connectionQuality.isOnline) {
      alerts.push({
        id: `offline-${Date.now()}`,
        type: "DEVICE_HEALTH",
        title: "Device Offline",
        description: `Device offline for ${Math.round(health.connectionQuality.lastSeenAgo / 1000)}s.`,
        severity: "warning",
        timestamp: Date.now(),
        actionable: false,
      });
    }

    if (health.reliability.commandSuccessRate < 50) {
      alerts.push({
        id: `failure-${Date.now()}`,
        type: "COMMAND_FAILURE",
        title: "High Command Failure Rate",
        description: `Commands failing frequently (${Math.round(health.reliability.commandSuccessRate)}% success).`,
        severity: "critical",
        timestamp: Date.now(),
        actionable: true,
        suggestedAction: "Check device and network",
      });
    }

    if (health.anomalies.length > 0) {
      alerts.push({
        id: `anomaly-${Date.now()}`,
        type: "DEVICE_HEALTH",
        title: "Data Anomalies",
        description: `${health.anomalies.length} anomalies detected in sensor readings.`,
        severity: "warning",
        timestamp: Date.now(),
        actionable: false,
      });
    }

    return alerts;
  }

  /**
   * Consolidate all alerts
   */
  static generateAllAlerts(
    data: SensorData[],
    health: DeviceHealth,
  ): SmartAlert[] {
    const alerts: SmartAlert[] = [];

    // Check clothes dry
    const dryAlert = this.checkClothesReady(data);
    if (dryAlert) alerts.push(dryAlert);

    // Check weather
    const weatherAlert = this.checkWeatherStability(data);
    if (weatherAlert) alerts.push(weatherAlert);

    // Check device health
    const healthAlerts = this.checkDeviceHealth(health);
    alerts.push(...healthAlerts);

    // Remove duplicates by type
    const alertsByType = new Map<string, SmartAlert>();
    alerts.forEach((alert) => {
      alertsByType.set(alert.type, alert);
    });

    return Array.from(alertsByType.values());
  }

  /**
   * Filter alerts by severity
   */
  static getAlertsBySeverity(
    alerts: SmartAlert[],
    severity: "info" | "warning" | "critical",
  ): SmartAlert[] {
    return alerts.filter((a) => a.severity === severity);
  }

  /**
   * Get latest alert of each type
   */
  static getLatestAlerts(alerts: SmartAlert[]): SmartAlert[] {
    const typeMap = new Map<string, SmartAlert>();
    alerts.forEach((alert) => {
      const existing = typeMap.get(alert.type);
      if (!existing || alert.timestamp > existing.timestamp) {
        typeMap.set(alert.type, alert);
      }
    });
    return Array.from(typeMap.values());
  }
}
