"use client";

import type { DeviceHealth } from "@/services/DeviceHealthService";
import Link from "next/link";

export interface DeviceHealthProps {
  health: DeviceHealth;
  compact?: boolean;
}

function getHealthTrend(healthScore: number): "improving" | "degrading" | "stable" {
  if (healthScore >= 80) {
    return "improving";
  }
  if (healthScore <= 50) {
    return "degrading";
  }
  return "stable";
}

function getTrendLabel(trend: "improving" | "degrading" | "stable"): string {
  switch (trend) {
    case "improving":
      return "Up";
    case "degrading":
      return "Down";
    case "stable":
      return "Stable";
  }
}

export default function DeviceHealthComponent({ health, compact = false }: DeviceHealthProps) {
  const { healthScore, status } = health;
  const trend = getHealthTrend(healthScore);
  const trendLabel = getTrendLabel(trend);

  const statusColor = {
    healthy: { bg: "bg-green-100", text: "text-green-800", dot: "bg-green-500" },
    degraded: { bg: "bg-yellow-100", text: "text-yellow-800", dot: "bg-yellow-500" },
    critical: { bg: "bg-red-100", text: "text-red-800", dot: "bg-red-500" },
  };

  const colors = statusColor[status];

  if (compact) {
    return (
      <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 ${colors.bg}`}>
        <div className={`h-2 w-2 rounded-full ${colors.dot} animate-pulse`} />
        <span className={`text-sm font-semibold ${colors.text}`}>{healthScore}%</span>
      </div>
    );
  }

  return (
    <div className={`rounded-xl p-6 shadow ${colors.bg}`}>
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h3 className={`text-lg font-bold ${colors.text}`}>Device Health</h3>
          <div className="mt-1 flex items-center gap-2">
            <p className={`text-sm capitalize ${colors.text} opacity-80`}>{status}</p>
            <span className={`text-xs font-semibold uppercase ${colors.text} opacity-70`}>
              {trendLabel}
            </span>
          </div>
        </div>
        <div className="text-4xl font-bold text-gray-900">{healthScore}%</div>
      </div>

      <div className="mb-4">
        <progress
          value={Math.max(0, Math.min(100, healthScore))}
          max={100}
          aria-label="Device health score"
          title="Device health score"
          className={`h-3 w-full overflow-hidden rounded-full bg-gray-300 ${
            status === "healthy"
              ? "accent-green-500"
              : status === "degraded"
                ? "accent-yellow-500"
                : "accent-red-500"
          }`}
        />
      </div>

      <div className="mb-4 grid grid-cols-2 gap-4">
        <div className="rounded-lg bg-white/50 p-3">
          <p className="text-xs font-semibold uppercase text-gray-600">Telemetry Freshness</p>
          <p className="text-lg font-bold text-gray-900">{health.uptime.percentage}%</p>
        </div>
        <div className="rounded-lg bg-white/50 p-3">
          <p className="text-xs font-semibold uppercase text-gray-600">Command Reliability</p>
          <p className="text-lg font-bold text-gray-900">
            {Math.round(health.reliability.commandSuccessRate)}%
          </p>
        </div>
        <div className="rounded-lg bg-white/50 p-3">
          <p className="text-xs font-semibold uppercase text-gray-600">Connection</p>
          <p
            className={`text-lg font-bold ${
              health.connectionQuality.isOnline ? "text-green-600" : "text-red-600"
            }`}
          >
            {health.connectionQuality.isOnline ? "Online" : "Offline"}
          </p>
        </div>
        <div className="rounded-lg bg-white/50 p-3">
          <p className="text-xs font-semibold uppercase text-gray-600">Last Seen</p>
          <p className="text-lg font-bold text-gray-900">
            {(health.connectionQuality.lastSeenAgo / 1000).toFixed(0)}s
          </p>
        </div>
      </div>

      {health.anomalies.length > 0 && (
        <div className="mb-4 rounded-lg bg-white/50 p-3">
          <p className="mb-2 text-xs font-semibold text-gray-700">Anomalies Detected:</p>
          <ul className="space-y-1 text-xs text-gray-700">
            {health.anomalies.slice(0, 3).map((anomaly, index) => (
              <li key={index}>- {anomaly}</li>
            ))}
            {health.anomalies.length > 3 && (
              <li className="text-gray-500">+ {health.anomalies.length - 3} more</li>
            )}
          </ul>
        </div>
      )}

      <div className="border-t border-white/20 pt-4">
        <p className="mb-3 text-xs font-semibold text-gray-700">Quick Actions</p>
        <Link
          href="/analytics"
          className="block rounded-lg bg-white/50 px-3 py-2 text-center text-xs font-semibold text-gray-800 transition hover:bg-white/70"
        >
          View Details
        </Link>
      </div>

      {status === "critical" && (
        <div className="mt-4 rounded-lg bg-red-200 p-3 text-sm font-semibold text-red-800">
          Device requires attention. Check MQTT connection, telemetry freshness, and sensor values.
        </div>
      )}
      {status === "degraded" && (
        <div className="mt-4 rounded-lg bg-yellow-200 p-3 text-sm font-semibold text-yellow-800">
          Device quality is degraded. Monitor the stream and recent command acknowledgements.
        </div>
      )}
      {status === "healthy" && (
        <div className="mt-4 rounded-lg bg-green-200 p-3 text-sm font-semibold text-green-800">
          Device telemetry is stable and operating normally.
        </div>
      )}
    </div>
  );
}
