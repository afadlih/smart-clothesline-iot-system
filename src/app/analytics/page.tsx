"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Download, RefreshCw } from "lucide-react";
import PageContainer from "@/components/layout/PageContainer";
import { useAnalyticsData } from "@/hooks/useAnalyticsData";
import type { TimeRange } from "@/services/AnalyticsDataService";

function formatMetric(value: number | null | undefined, suffix = "", digits = 1): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "--";
  return `${value.toFixed(digits)}${suffix}`;
}

function getTooltipStyle(isDark: boolean) {
  return {
    borderRadius: "12px",
    border: isDark ? "1px solid #334155" : "1px solid #e2e8f0",
    backgroundColor: isDark ? "#0f172a" : "#ffffff",
    color: isDark ? "#e2e8f0" : "#0f172a",
  };
}

export default function AnalyticsPage() {
  const { range, setRange, result, loading, error, refresh } = useAnalyticsData("24h");
  const [activeTab, setActiveTab] = useState<"environment" | "operations">("environment");

  const chartData = useMemo(() => {
    if (!result?.data?.length) return [];
    return result.data
      .map((item) => {
        const ms = Date.parse(item.timestamp);
        if (!Number.isFinite(ms)) return null;
        return {
          timestamp: ms,
          time: new Date(ms).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
          temp: item.temperature,
          humidity: item.humidity,
          light: item.light,
          rain: item.isRaining() ? 1 : 0,
          isOpen: item.status === "OPEN" ? 1 : 0,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);
  }, [result]);

  const exportData = () => {
    if (!result?.data?.length) return;
    const payload = {
      range,
      rangeStart: result.rangeStart,
      rangeEnd: result.rangeEnd,
      source: result.source,
      data: result.data,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics-${range}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isDark =
    typeof document !== "undefined" && document.documentElement.classList.contains("dark");

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <PageContainer className="space-y-6 py-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Operational Insights</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Historical telemetry from Firestore</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {(["1h", "6h", "24h", "7d", "30d"] as TimeRange[]).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                  range === r
                    ? "bg-blue-600 text-white"
                    : "border border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                }`}
              >
                {r.toUpperCase()}
              </button>
            ))}
            <button
              onClick={refresh}
              disabled={loading}
              className="rounded-lg border border-slate-200 bg-white p-2 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={exportData}
              disabled={!result?.data?.length}
              className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900"
            >
              <span className="inline-flex items-center gap-1">
                <Download className="h-3.5 w-3.5" />
                Export
              </span>
            </button>
          </div>
        </header>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/40 dark:bg-red-900/20">
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            <button onClick={refresh} className="mt-2 text-xs font-semibold text-red-700 underline dark:text-red-300">
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900" />
            ))}
          </section>
        ) : (
          <>
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <MetricCard label="Average Temperature" value={formatMetric(result?.stats.avgTemp, "°C", 1)} />
              <MetricCard label="Average Humidity" value={formatMetric(result?.stats.avgHumidity, "%", 1)} />
              <MetricCard label="Average Light" value={formatMetric(result?.stats.avgLight, "", 0)} />
              <MetricCard label="Rain Events in Selected Range" value={String(result?.stats.rainCount ?? 0)} />
              <MetricCard label="Data Points" value={String(result?.stats.dataPoints ?? 0)} />
              <MetricCard label="Clothesline Open Time" value={formatMetric(result?.stats.openPercentage, "%", 0)} />
            </section>

            {!chartData.length ? (
              <section className="rounded-xl border border-slate-200 bg-white p-6 text-center dark:border-slate-800 dark:bg-slate-900">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">No analytics data yet</h2>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  Start the IoT device and wait for telemetry to be stored.
                </p>
              </section>
            ) : (
              <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex gap-2">
                  <button
                    onClick={() => setActiveTab("environment")}
                    className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                      activeTab === "environment"
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                    }`}
                  >
                    Environment Trends
                  </button>
                  <button
                    onClick={() => setActiveTab("operations")}
                    className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                      activeTab === "operations"
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                    }`}
                  >
                    Device Operations
                  </button>
                </div>

                <div className="h-[320px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    {activeTab === "environment" ? (
                      <AreaChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="time" tick={{ fontSize: 11 }} minTickGap={24} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip contentStyle={getTooltipStyle(isDark)} />
                        <Area type="monotone" dataKey="temp" stroke="#f97316" fill="#f9731633" name="Temperature (°C)" />
                        <Area type="monotone" dataKey="humidity" stroke="#3b82f6" fill="#3b82f633" name="Humidity (%)" />
                        <Area type="monotone" dataKey="light" stroke="#eab308" fill="#eab30833" name="Light" />
                      </AreaChart>
                    ) : (
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="time" tick={{ fontSize: 11 }} minTickGap={24} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip contentStyle={getTooltipStyle(isDark)} />
                        <Bar dataKey="isOpen" name="Clothesline Open State">
                          {chartData.map((row, idx) => (
                            <Cell key={`${row.timestamp}-${idx}`} fill={row.isOpen ? "#10b981" : "#ef4444"} />
                          ))}
                        </Bar>
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </section>
            )}
          </>
        )}
      </PageContainer>
    </main>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
    </article>
  );
}
