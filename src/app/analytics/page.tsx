"use client";

import { useSensor } from "@/hooks/useSensor";
import { useAnalytics } from "@/hooks/useAnalytics";
import { DataExportService } from "@/services/DataExportService";
import { useState } from "react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import ErrorAlert from "@/components/alerts/ErrorAlert";
import { resolveThemePalette } from "@/lib/themeResolver";
import { useThemeStore } from "@/stores/themeStore";

type TimeRange = "today" | "7days" | "30days" | "all";

export default function AnalyticsPage() {
  const { history, connection, commandStatus, commandSentAt } = useSensor();
  const currentTheme = useThemeStore((state) => state.theme);
  const analytics = useAnalytics(history, connection, {
    commandStatus,
    lastCommandAt: commandSentAt,
  });
  const [timeRange, setTimeRange] = useState<TimeRange>("7days");

  if (analytics.loading) {
    return (
      <main className="bg-gray-100 min-h-screen p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-12 bg-gray-300 rounded-lg"></div>
            <div className="h-96 bg-gray-300 rounded-lg"></div>
          </div>
        </div>
      </main>
    );
  }

  const { dailyStats, hourlyBreakdown, deviceHealth, smartAlerts, dataSufficiency } = analytics;
  const palette = resolveThemePalette(currentTheme);

  const safeNumber = (value: unknown, fallback: number = 0) =>
    typeof value === "number" && Number.isFinite(value) ? value : fallback;

  const metric = (value: unknown) => ({
    min: safeNumber((value as { min?: unknown })?.min),
    max: safeNumber((value as { max?: unknown })?.max),
    avg: safeNumber((value as { avg?: unknown })?.avg),
  });

  const tempMetric = metric(dailyStats?.temperature);
  const humidityMetric = metric(dailyStats?.humidity);
  const lightMetric = metric(dailyStats?.light);
  const safeRainEvents = safeNumber(dailyStats?.rainEvents);
  const safeDataPoints = safeNumber(dailyStats?.dataPoints);
  const safeOperationHours = safeNumber(dailyStats?.operationHours);

  // Download sensor data as CSV
  const handleExportCSV = () => {
    const filename = `clothesline-${new Date().toISOString().split("T")[0]}.csv`;
    DataExportService.exportToCSV(
      history.map((h) => h.data),
      filename,
    );
  };

  // Download sensor data as JSON
  const handleExportJSON = () => {
    const filename = `clothesline-${new Date().toISOString().split("T")[0]}.json`;
    DataExportService.exportToJSON(
      history.map((h) => h.data),
      filename,
    );
  };

  // Filter data by time range
  const getFilteredData = () => {
    const now = Date.now();
    let cutoffTime = now;

    switch (timeRange) {
      case "today":
        cutoffTime = now - 24 * 60 * 60 * 1000;
        break;
      case "7days":
        cutoffTime = now - 7 * 24 * 60 * 60 * 1000;
        break;
      case "30days":
        cutoffTime = now - 30 * 24 * 60 * 60 * 1000;
        break;
      case "all":
        cutoffTime = 0;
        break;
    }

    return history.filter((h) => {
      const timestamp = new Date(h.data.timestamp).getTime();
      return Number.isFinite(timestamp) && timestamp >= cutoffTime;
    });
  };

  const filteredData = getFilteredData();
  const rainRatio = safeDataPoints > 0 ? (safeRainEvents / safeDataPoints) * 100 : 0;
  const dryingEfficiency = dataSufficiency.canEstimateDryingEfficiency
    ? Math.max(0, Math.min(100, 100 - rainRatio))
    : null;
  const dominantWeather = dataSufficiency.hasOperationalPattern
    ? rainRatio > 45 ? "Rain-dominant" : rainRatio > 20 ? "Mixed weather" : "Dry-dominant"
    : "Collecting operational patterns";

  return (
    <main className="bg-gray-100 min-h-screen p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Operational Insights</h1>
            <p className="text-gray-600 mt-2">Readable trends for drying performance and device activity</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={handleExportCSV}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Export CSV
            </button>
            <button
              onClick={handleExportJSON}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
              Export JSON
            </button>
          </div>
        </div>

        {/* Time Range Selector */}
        <div className="flex gap-2 flex-wrap bg-white rounded-lg shadow p-4 dark:bg-slate-900">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center">Time Range:</p>
          {(["today", "7days", "30days", "all"] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition ${
                timeRange === range
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300"
              }`}
            >
              {range === "today" && "Today"}
              {range === "7days" && "Last 7 Days"}
              {range === "30days" && "Last 30 Days"}
              {range === "all" && "All Data"}
            </button>
          ))}
          <span className="ml-auto text-xs text-gray-600 dark:text-gray-400 flex items-center">
            {filteredData.length} records
          </span>
        </div>

        {/* Smart Alerts */}
        {smartAlerts.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-gray-900">Active Alerts</h2>
            <div className="space-y-2">
              {smartAlerts.map((alert) => (
                <ErrorAlert
                  key={alert.id}
                  type={
                    alert.severity === "critical"
                      ? "error"
                      : alert.severity === "warning"
                        ? "warning"
                        : "info"
                  }
                  message={`${alert.title}: ${alert.description}`}
                  dismissible={true}
                />
              ))}
            </div>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Temperature Card */}
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase">Temperature</h3>
            <p className="text-3xl font-bold text-red-600 mt-2">
              {tempMetric.avg.toFixed(1)} C
            </p>
            <p className="text-sm text-gray-600 mt-2">
              Min: {tempMetric.min.toFixed(1)} C / Max:{" "}
              {tempMetric.max.toFixed(1)} C
            </p>
          </div>

          {/* Humidity Card */}
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase">Humidity</h3>
            <p className="text-3xl font-bold text-blue-600 mt-2">
              {humidityMetric.avg.toFixed(1)}%
            </p>
            <p className="text-sm text-gray-600 mt-2">
              Min: {humidityMetric.min.toFixed(1)}% / Max:{" "}
              {humidityMetric.max.toFixed(1)}%
            </p>
          </div>

          {/* Light Card */}
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase">Light</h3>
            <p className="text-3xl font-bold text-amber-600 mt-2">
              {lightMetric.avg.toFixed(0)}
            </p>
            <p className="text-sm text-gray-600 mt-2">
              Min: {lightMetric.min.toFixed(0)} / Max: {lightMetric.max.toFixed(0)}
            </p>
          </div>

          {/* Device Health Card */}
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase">Device Health</h3>
            <p className={`text-3xl font-bold mt-2 ${
              deviceHealth.status === "healthy"
                ? "text-green-600"
                : deviceHealth.status === "degraded"
                  ? "text-yellow-600"
                  : "text-red-600"
            }`}>
              {deviceHealth.healthScore}%
            </p>
            <p className="text-sm text-gray-600 mt-2 capitalize">{deviceHealth.status}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Best Drying Period</p>
            <p className="mt-2 text-sm font-bold text-slate-900">
              {dailyStats.temperature.avg > 27 && dailyStats.humidity.avg < 75 ? "Favorable" : "Moderate"}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Rain Frequency</p>
            <p className="mt-2 text-sm font-bold text-slate-900">{dataSufficiency.hasOperationalPattern ? `${rainRatio.toFixed(1)}%` : "Insufficient telemetry history"}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Dominant Weather</p>
            <p className="mt-2 text-sm font-bold text-slate-900">{dominantWeather}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Device Activity Trend</p>
            <p className="mt-2 text-sm font-bold text-slate-900">
              {safeDataPoints > 150 ? "High activity" : safeDataPoints > 60 ? "Stable" : "Low activity"}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Drying Efficiency</p>
            <p className="mt-2 text-sm font-bold text-slate-900">{dryingEfficiency === null ? "Waiting for telemetry stream" : `${dryingEfficiency.toFixed(0)}%`}</p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Temperature Trend */}
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Temperature Trend</h3>
            {hourlyBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={hourlyBreakdown}>
                  <CartesianGrid stroke={palette.chart.grid} strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="temperature"
                    stroke={palette.chart.temperature}
                    strokeWidth={2}
                    dot={{ fill: palette.chart.temperature, r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-500 text-center py-12">No hourly data available</p>
            )}
          </div>

          {/* Humidity Trend */}
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Humidity Trend</h3>
            {hourlyBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={hourlyBreakdown}>
                  <defs>
                    <linearGradient id="colorHumidity" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={palette.chart.humidity} stopOpacity={0.8} />
                      <stop offset="95%" stopColor={palette.chart.humidity} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={palette.chart.grid} strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="humidity"
                    stroke={palette.chart.humidity}
                    fillOpacity={1}
                    fill="url(#colorHumidity)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-500 text-center py-12">No hourly data available</p>
            )}
          </div>

          {/* Light Levels */}
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Light Levels</h3>
            {hourlyBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={hourlyBreakdown}>
                  <CartesianGrid stroke={palette.chart.grid} strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="light" fill={palette.chart.light} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-500 text-center py-12">No hourly data available</p>
            )}
          </div>

          {/* Rain Events */}
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Rain Events</h3>
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-4xl font-bold text-blue-600">{safeRainEvents}</p>
                <p className="text-gray-600 mt-2">rain events today</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Data Points</p>
                  <p className="text-2xl font-bold text-gray-900">{safeDataPoints}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Operation Hours</p>
                  <p className="text-2xl font-bold text-gray-900">{safeOperationHours.toFixed(1)}h</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Device Health Details */}
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Device Health Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600">Telemetry Freshness</p>
              <p className="text-2xl font-bold text-gray-900">
                {deviceHealth.uptime.percentage}%
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Command Reliability</p>
              <p className="text-2xl font-bold text-gray-900">
                {Math.round(deviceHealth.reliability.commandSuccessRate)}%
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Last Seen</p>
              <p className="text-2xl font-bold text-gray-900">
                {(deviceHealth.connectionQuality.lastSeenAgo / 1000).toFixed(0)}s ago
              </p>
            </div>
          </div>
          {deviceHealth.anomalies.length > 0 && (
            <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
              <p className="text-sm font-semibold text-yellow-800 mb-2">Detected Anomalies:</p>
              <ul className="text-sm text-yellow-700 space-y-1">
                {deviceHealth.anomalies.map((anomaly, i) => (
                  <li key={i}>- {anomaly}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
