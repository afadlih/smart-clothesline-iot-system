"use client";

import ChartSection from "@/components/charts/ChartSection";
import SensorCard from "@/components/cards/SensorCard";
import OperationalHealthPanel from "@/components/status/OperationalHealth";
import StatusPanel from "@/components/status/StatusPanel";
import { useSystemState } from "@/hooks/useSystemState";

export default function SensorMonitorPage() {
  const { sensor, history, serialLogs, status, isOnline, uiState, operationalHealth, debug } = useSystemState();
  const connectionLabel = isOnline ? "ONLINE" : "OFFLINE";
  const connectionClass = isOnline
    ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
    : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300";
  const streamLabel =
    uiState.connection === "DISCONNECTED"
      ? "Disconnected"
      : uiState.stream === "NO_DATA"
        ? "Waiting device..."
        : uiState.stream === "STALE"
          ? "Stale"
          : "Streaming";

  if (!sensor) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 p-6 dark:from-slate-900 dark:to-slate-950">
        <div className="mx-auto max-w-6xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Sensor Monitor</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">
            Menunggu stream MQTT. Status saat ini: {connectionLabel}. Jalankan simulator agar data sensor masuk.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 p-6 dark:from-slate-900 dark:to-slate-950">
      <div className="mx-auto max-w-6xl space-y-6">
        <header>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Sensor Monitor</h1>
            <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${connectionClass}`}>
              <span className={`h-2 w-2 rounded-full ${isOnline ? "bg-green-500" : "bg-red-500"}`} aria-hidden="true" />
              {connectionLabel}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">Realtime data stream + serial log perangkat ({streamLabel})</p>
        </header>

        <StatusPanel status={status ?? "--"} reason="Realtime state from MQTT device" />

        <OperationalHealthPanel health={operationalHealth} compact={false} />

        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Sync Debug</h2>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <p className="text-xs text-gray-500 dark:text-slate-400">Last ACK Result</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">{debug.lastAckResult}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-slate-400">Deduped Status</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">{debug.dedupedStatusCount}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-slate-400">Last Transition</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">{debug.lastTransition ?? "--"}</p>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <SensorCard title="Temperature" value={`${sensor.temperature.toFixed(1)} C`} subtitle="Ambient" />
          <SensorCard title="Humidity" value={`${sensor.humidity.toFixed(1)} %`} subtitle="Relative" />
          <SensorCard title="Light" value={sensor.light.toFixed(0)} subtitle={sensor.isDark() ? "Low light" : "Normal"} accent={sensor.isDark() ? "warning" : undefined} />
          <SensorCard title="Rain" value={sensor.isRaining() ? "Detected" : "Clear"} subtitle={sensor.isRaining() ? "Umbrella needed" : "No rain"} accent={sensor.isRaining() ? "danger" : undefined} />
        </section>

        <ChartSection history={history} />

        <section className="rounded-2xl border border-slate-200 bg-slate-950 shadow-sm dark:border-slate-800">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-200">Serial Monitor</h2>
            <span className="text-xs text-slate-400">Live MQTT Stream</span>
          </div>
          <div className="max-h-[360px] overflow-y-auto p-3 font-mono text-xs">
            {serialLogs.length === 0 ? (
              <p className="rounded-lg border border-slate-800 bg-slate-900/80 p-3 text-slate-400">Belum ada log serial.</p>
            ) : (
              <div className="space-y-2">
                {serialLogs.map((log) => (
                  <div key={log.id} className="rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2 text-slate-200">
                    <div className="mb-1 flex items-center gap-2 text-[11px] text-slate-400">
                      <span>{new Date(log.timestamp).toLocaleTimeString("en-US")}</span>
                      <span className={`rounded px-1.5 py-0.5 font-semibold ${log.level === "WARN" ? "bg-amber-500/20 text-amber-300" : "bg-emerald-500/20 text-emerald-300"}`}>{log.level}</span>
                    </div>
                    <p className="leading-relaxed text-slate-100">{log.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
