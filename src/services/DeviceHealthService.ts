import type { SensorHistoryItem } from "@/hooks/useSensor";
import type { ConnectionSnapshot } from "@/hooks/useSensor";

type DeviceCommandStatus = "idle" | "pending" | "success" | "timeout";

export type DeviceHealth = {
  uptime: {
    totalDays: number;
    consecutiveDays: number;
    percentage: number;
  };
  reliability: {
    commandSuccessRate: number;
    averageResponseTimeMs: number;
    lastFailureAt: number | null;
    totalCommands: number;
    failedCommands: number;
  };
  connectionQuality: {
    lastSeenAgo: number;
    reconnectionCount: number;
    lastDisruptionAt: number | null;
    isOnline: boolean;
  };
  anomalies: string[];
  healthScore: number;
  status: "healthy" | "degraded" | "critical";
};

export type DeviceHealthOptions = {
  commandStatus?: DeviceCommandStatus;
  lastCommandAt?: number | null;
};

export type OperationalHealth = {
  mqttConnected: boolean;
  streamState: "NO_DATA" | "STREAMING" | "STALE";
  lastSensorAgeMs: number | null;
  lastStatusAgeMs: number | null;
  statusDriftMs: number | null;
  queueBacklog: number;
  lastAckState: "IDLE" | "WAITING_ACK" | "SYNCED" | "TIMEOUT";
};

export type OperationalHealthOptions = {
  mqttConnected: boolean;
  streamState: "NO_DATA" | "STREAMING" | "STALE";
  commandStatus: DeviceCommandStatus;
  lastSensorUpdate: number | null;
  lastStatusUpdate: number | null;
  queueBacklog: number;
  now?: number;
};

export class DeviceHealthService {
  static calculateOperationalHealth(options: OperationalHealthOptions): OperationalHealth {
    const now = options.now ?? Date.now();
    const lastSensorAgeMs =
      options.lastSensorUpdate === null ? null : Math.max(0, now - options.lastSensorUpdate);
    const lastStatusAgeMs =
      options.lastStatusUpdate === null ? null : Math.max(0, now - options.lastStatusUpdate);
    const statusDriftMs =
      options.lastSensorUpdate !== null && options.lastStatusUpdate !== null
        ? Math.abs(options.lastSensorUpdate - options.lastStatusUpdate)
        : null;

    const lastAckState: OperationalHealth["lastAckState"] =
      options.commandStatus === "pending"
        ? "WAITING_ACK"
        : options.commandStatus === "success"
          ? "SYNCED"
          : options.commandStatus === "timeout"
            ? "TIMEOUT"
            : "IDLE";

    return {
      mqttConnected: options.mqttConnected,
      streamState: options.streamState,
      lastSensorAgeMs,
      lastStatusAgeMs,
      statusDriftMs,
      queueBacklog: options.queueBacklog,
      lastAckState,
    };
  }

  /**
   * The project does not persist true hardware uptime, so this score is based on
   * observable telemetry quality: MQTT state, data freshness, command ack state,
   * and sensor anomalies.
   */
  static calculateHealth(
    connection: ConnectionSnapshot,
    historyData: SensorHistoryItem[],
    options: DeviceHealthOptions = {},
  ): DeviceHealth {
    const now = Date.now();
    const lastMessageTime = connection.lastMessageAt
      ? new Date(connection.lastMessageAt).getTime()
      : null;
    const lastSeenAgo = lastMessageTime ? now - lastMessageTime : Number.POSITIVE_INFINITY;
    const { commandStatus = "idle", lastCommandAt = null } = options;

    const uniqueDays = this.getUniqueHistoryDays(historyData);
    const anomalies = this.detectAnomalies(historyData);
    const freshnessScore = this.getFreshnessScore(lastSeenAgo);
    const connectionScore = this.getConnectionScore(connection.state, connection.isOnline);
    const continuityScore = this.getContinuityScore(historyData);
    const anomalyScore = Math.max(0, 100 - anomalies.length * 15);
    const commandReliability = this.getCommandReliability(commandStatus, lastCommandAt, now);

    const weightedScore =
      freshnessScore * 0.35 +
      connectionScore * 0.25 +
      continuityScore * 0.15 +
      anomalyScore * 0.1 +
      commandReliability.commandSuccessRate * 0.15;
    const healthScore = Math.round(Math.max(0, Math.min(100, weightedScore)));

    const status: DeviceHealth["status"] =
      healthScore >= 80 ? "healthy" : healthScore >= 50 ? "degraded" : "critical";

    return {
      uptime: {
        totalDays: uniqueDays.length,
        consecutiveDays: this.getConsecutiveDayCount(uniqueDays),
        percentage: freshnessScore,
      },
      reliability: {
        commandSuccessRate: commandReliability.commandSuccessRate,
        averageResponseTimeMs: commandReliability.averageResponseTimeMs,
        lastFailureAt: commandStatus === "timeout" ? lastCommandAt : null,
        totalCommands: commandReliability.totalCommands,
        failedCommands: commandReliability.failedCommands,
      },
      connectionQuality: {
        lastSeenAgo,
        reconnectionCount: connection.state === "reconnecting" ? 1 : 0,
        lastDisruptionAt: lastSeenAgo > 30_000 ? lastMessageTime : null,
        isOnline: connection.isOnline,
      },
      anomalies,
      healthScore,
      status,
    };
  }

  static detectAnomalies(historyData: SensorHistoryItem[]): string[] {
    if (historyData.length === 0) {
      return [];
    }

    const anomalies: string[] = [];
    const recentData = historyData.slice(0, 10);

    recentData.forEach((item) => {
      const data = item.data;

      if (data.temperature < -10 || data.temperature > 60) {
        anomalies.push("Temperature out of normal range");
      }
      if (data.humidity < 0 || data.humidity > 100) {
        anomalies.push("Humidity invalid");
      }
      if (data.light < 0 || data.light > 10000) {
        anomalies.push("Light level anomaly");
      }
    });

    if (recentData.length > 1) {
      const rainCount = recentData.filter((item) => item.data.isRaining()).length;
      if (rainCount === recentData.length) {
        anomalies.push("Continuous rain detected for extended period");
      }

      const newest = new Date(recentData[0].data.timestamp).getTime();
      const oldest = new Date(recentData[recentData.length - 1].data.timestamp).getTime();
      if (Number.isFinite(newest) && Number.isFinite(oldest) && newest - oldest > 6 * 60 * 60 * 1000) {
        anomalies.push("Telemetry updates are too sparse");
      }
    }

    return [...new Set(anomalies)];
  }

  static getHealthMessage(health: DeviceHealth): string {
    const { status, healthScore } = health;

    if (status === "healthy") {
      return `Device healthy (${healthScore}%)`;
    }
    if (status === "degraded") {
      return `Device degraded (${healthScore}%)`;
    }
    return `Device critical (${healthScore}%)`;
  }

  private static getFreshnessScore(lastSeenAgo: number): number {
    if (!Number.isFinite(lastSeenAgo)) {
      return 0;
    }
    if (lastSeenAgo <= 10_000) {
      return 100;
    }
    if (lastSeenAgo <= 30_000) {
      return 75;
    }
    if (lastSeenAgo <= 60_000) {
      return 45;
    }
    return 10;
  }

  private static getConnectionScore(state: ConnectionSnapshot["state"], isOnline: boolean): number {
    if (isOnline && state === "online") {
      return 100;
    }
    if (state === "reconnecting") {
      return 65;
    }
    if (state === "connecting") {
      return 55;
    }
    if (state === "error") {
      return 20;
    }
    return 10;
  }

  private static getContinuityScore(historyData: SensorHistoryItem[]): number {
    if (historyData.length < 2) {
      return historyData.length === 1 ? 70 : 0;
    }

    const recentTimestamps = historyData
      .slice(0, 5)
      .map((item) => new Date(item.data.timestamp).getTime())
      .filter((value) => Number.isFinite(value));

    if (recentTimestamps.length < 2) {
      return 50;
    }

    const intervals: number[] = [];
    for (let index = 0; index < recentTimestamps.length - 1; index += 1) {
      intervals.push(Math.abs(recentTimestamps[index] - recentTimestamps[index + 1]));
    }

    const averageInterval = intervals.reduce((sum, value) => sum + value, 0) / intervals.length;

    if (averageInterval <= 30_000) {
      return 100;
    }
    if (averageInterval <= 60_000) {
      return 85;
    }
    if (averageInterval <= 5 * 60 * 1000) {
      return 60;
    }
    return 35;
  }

  private static getCommandReliability(
    commandStatus: DeviceCommandStatus,
    lastCommandAt: number | null,
    now: number,
  ): {
    commandSuccessRate: number;
    averageResponseTimeMs: number;
    totalCommands: number;
    failedCommands: number;
  } {
    if (commandStatus === "timeout") {
      return {
        commandSuccessRate: 0,
        averageResponseTimeMs: lastCommandAt ? now - lastCommandAt : 5_000,
        totalCommands: 1,
        failedCommands: 1,
      };
    }

    if (commandStatus === "pending") {
      return {
        commandSuccessRate: 50,
        averageResponseTimeMs: lastCommandAt ? now - lastCommandAt : 0,
        totalCommands: 1,
        failedCommands: 0,
      };
    }

    if (commandStatus === "success") {
      return {
        commandSuccessRate: 100,
        averageResponseTimeMs: lastCommandAt ? now - lastCommandAt : 0,
        totalCommands: 1,
        failedCommands: 0,
      };
    }

    return {
      commandSuccessRate: 100,
      averageResponseTimeMs: 0,
      totalCommands: 0,
      failedCommands: 0,
    };
  }

  private static getUniqueHistoryDays(historyData: SensorHistoryItem[]): string[] {
    return [...new Set(
      historyData.map((item) => new Date(item.data.timestamp).toISOString().slice(0, 10)),
    )].sort();
  }

  private static getConsecutiveDayCount(days: string[]): number {
    if (days.length === 0) {
      return 0;
    }

    let count = 1;
    for (let index = days.length - 1; index > 0; index -= 1) {
      const current = new Date(days[index]).getTime();
      const previous = new Date(days[index - 1]).getTime();
      const diffDays = Math.round((current - previous) / (24 * 60 * 60 * 1000));

      if (diffDays === 1) {
        count += 1;
        continue;
      }
      break;
    }

    return count;
  }
}
