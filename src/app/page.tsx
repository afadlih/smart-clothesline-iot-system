"use client";

import StatusPanel from "@/components/status/StatusPanel";
import { useSensor } from "@/hooks/useSensor";


export default function Home() {
  const { sensor, connection, loading, status: reportedStatus } = useSensor();
  const connectionLabel = connection.isOnline ? "ONLINE" : connection.state.toUpperCase();
  const connectionBadgeClass = connection.isOnline
    ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
    : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300";
  const connectionDotClass = connection.isOnline ? "bg-green-500" : "bg-red-500";
  const lastUpdated = sensor
    ? new Date(sensor.timestamp).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "--:--";
  if (!sensor || loading) {
    return (
      <main className="bg-gradient-to-br from-gray-100 to-gray-200 dark:from-slate-900 dark:to-slate-950 min-h-screen transition-colors duration-300">
        <div className="max-w-6xl mx-auto p-6 space-y-8">
          <header className="space-y-3">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">
                Smart Clothesline Dashboard
              </h1>
              <p className="text-gray-500 dark:text-slate-400 mt-1">
                Real-time IoT monitoring dashboard
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-slate-400">
              <span>Last updated: --:--</span>
              <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${connectionBadgeClass}`}>
                <span className={`h-2 w-2 rounded-full ${connectionDotClass}`} aria-hidden="true" />
                {connectionLabel}
              </span>
              <span className="text-xs text-gray-400 dark:text-slate-500">Connecting to MQTT...</span>
            </div>
            <div className="h-px bg-gray-200 dark:bg-slate-800" />
          </header>
          <div className="bg-white dark:bg-slate-900 border border-transparent dark:border-slate-800 rounded-xl shadow-sm p-6">
            <p className="text-gray-500 dark:text-slate-400">Connecting...</p>
          </div>
        </div>
      </main>
    );
  }

  const status = reportedStatus ?? "TERBUKA";
  const reason = status === "TERBUKA"
    ? "Kondisi aman, jemuran tetap terbuka"
    : "Hujan atau cahaya rendah terdeteksi";

  return (
    <main className="bg-gradient-to-br from-gray-100 to-gray-200 dark:from-slate-900 dark:to-slate-950 min-h-screen transition-colors duration-300">
      <div className="max-w-6xl mx-auto p-6 space-y-8">
        <header className="space-y-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-slate-100">
              Smart Clothesline Dashboard
            </h1>
            <p className="text-gray-500 dark:text-slate-400 mt-1">Real-time IoT monitoring dashboard</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-slate-400">
            <span>Last updated: {lastUpdated}</span>
            <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${connectionBadgeClass}`}>
              <span className={`h-2 w-2 rounded-full ${connectionDotClass}`} aria-hidden="true" />
              {connectionLabel}
            </span>
            <span className="text-xs text-gray-400 dark:text-slate-500">
              {connection.isOnline ? "Streaming from MQTT..." : "Data stream terputus, cek broker/simulator."}
            </span>
          </div>
          <div className="h-px bg-gray-200 dark:bg-slate-800" />
        </header>

        <StatusPanel status={status} reason={reason} />

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Sensor Data</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Temperature</p>
              <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-slate-100">{sensor.temperature.toFixed(1)} C</p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Humidity</p>
              <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-slate-100">{sensor.humidity.toFixed(1)} %</p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Light</p>
              <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-slate-100">{sensor.light.toFixed(0)}</p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Rain</p>
              <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-slate-100">{sensor.isRaining() ? "Yes" : "No"}</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}