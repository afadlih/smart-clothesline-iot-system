"use client";

import Link from "next/link";
import { useState } from "react";
import { DecisionEngine } from "@/features/dashboard/DecisionEngine";
import StatusPanel from "@/components/status/StatusPanel";
import { useSensor } from "@/hooks/useSensor";

type ControlMode = "AUTO" | "MANUAL_OPEN" | "MANUAL_CLOSE";

type CommandLog = {
  id: string;
  label: string;
  timestamp: string;
};

export default function Home() {
  const { sensor, history, serialLogs, connection } = useSensor();
  const connectionLabel = connection.isOnline ? "ONLINE" : connection.state.toUpperCase();
  const connectionBadgeClass = connection.isOnline
    ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
    : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300";
  const connectionDotClass = connection.isOnline ? "bg-green-500" : "bg-red-500";
  const [controlMode, setControlMode] = useState<ControlMode>("AUTO");
  const [commandLogs, setCommandLogs] = useState<CommandLog[]>([]);
  const lastUpdated = sensor
    ? new Date(sensor.timestamp).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "--:--";
  if (!sensor) {
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
              <span className="text-xs text-gray-400 dark:text-slate-500">
                {connection.isOnline ? "Streaming from MQTT..." : "Menunggu koneksi MQTT..."}
              </span>
            </div>
            <div className="h-px bg-gray-200 dark:bg-slate-800" />
          </header>
          <div className="bg-white dark:bg-slate-900 border border-transparent dark:border-slate-800 rounded-xl shadow-sm p-6">
            <p className="text-gray-500 dark:text-slate-400">Loading dashboard...</p>
          </div>
        </div>
      </main>
    );
  }

  const autoStatus = DecisionEngine.getClotheslineStatus(sensor);
  const autoReason = DecisionEngine.getReason(sensor);

  const status =
    controlMode === "AUTO"
      ? autoStatus
      : controlMode === "MANUAL_OPEN"
        ? "TERBUKA"
        : "TERTUTUP";

  const reason =
    controlMode === "AUTO"
      ? autoReason
      : controlMode === "MANUAL_OPEN"
        ? "Mode manual aktif -> jemuran dipaksa TERBUKA"
        : "Mode manual aktif -> jemuran dipaksa TERTUTUP";

  const runCommand = (mode: ControlMode, label: string) => {
    const now = new Date().toISOString();
    setControlMode(mode);
    setCommandLogs((prev) => {
      const next: CommandLog = {
        id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
        label,
        timestamp: now,
      };

      return [next, ...prev].slice(0, 6);
    });
  };

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
          <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Ringkasan Sistem</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <article className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Cuaca Terdeteksi</p>
              <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-slate-100">{sensor.getWeatherStatus()}</p>
              <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">Berdasarkan kombinasi hujan dan cahaya</p>
            </article>

            <article className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Snapshot Sensor</p>
              <p className="mt-2 text-sm font-semibold text-gray-800 dark:text-slate-200">
                {sensor.temperature.toFixed(1)} C | {sensor.humidity.toFixed(1)} %
              </p>
              <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                Cahaya {sensor.light.toFixed(0)} | Hujan {sensor.isRaining() ? "Ya" : "Tidak"}
              </p>
            </article>

            <article className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Buffer Monitoring</p>
              <p className="mt-2 text-sm font-semibold text-gray-800 dark:text-slate-200">
                {serialLogs.length} log serial | {history.length} data history
              </p>
              <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">Detail lengkap tersedia di menu Sensor & History</p>
            </article>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          <div className="lg:col-span-3 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Manual Control</h2>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 dark:bg-slate-800 dark:text-slate-300">
                Mode: {controlMode === "AUTO" ? "AUTO" : "MANUAL"}
              </span>
            </div>

            <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">
              Tombol ini untuk override status jemuran dari dashboard tanpa membuka halaman serial monitor.
            </p>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => runCommand("AUTO", "SET MODE AUTO")}
                className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                  controlMode === "AUTO"
                    ? "bg-emerald-600 text-white"
                    : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                Auto Mode
              </button>
              <button
                type="button"
                onClick={() => runCommand("MANUAL_OPEN", "CMD OPEN CLOTHESLINE")}
                className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                  controlMode === "MANUAL_OPEN"
                    ? "bg-sky-600 text-white"
                    : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                Buka Manual
              </button>
              <button
                type="button"
                onClick={() => runCommand("MANUAL_CLOSE", "CMD CLOSE CLOTHESLINE")}
                className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                  controlMode === "MANUAL_CLOSE"
                    ? "bg-red-600 text-white"
                    : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                Tutup Manual
              </button>
            </div>

            <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-800">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-slate-200">Command Log</h3>
              {commandLogs.length === 0 ? (
                <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">Belum ada perintah manual dikirim.</p>
              ) : (
                <ul className="mt-2 space-y-1 text-xs text-gray-600 dark:text-slate-300">
                  {commandLogs.map((log) => (
                    <li key={log.id}>
                      {new Date(log.timestamp).toLocaleTimeString("en-US")} - {log.label}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="lg:col-span-2 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Monitoring Pages</h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">
              Serial Monitor dan History dipisah agar dashboard tetap fokus ke ringkasan dan kontrol.
            </p>

            <div className="mt-4 space-y-3">
              <Link
                href="/sensor"
                className="block rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Buka Sensor Monitor (Grafik + Serial)
              </Link>
              <Link
                href="/history"
                className="block rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                Buka History Sensor
              </Link>
            </div>

            <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700 dark:border-amber-800/60 dark:bg-amber-900/20 dark:text-amber-300">
              Mode manual saat ini hanya override di level dashboard (simulasi UI project) dan tidak mengubah data sensor MQTT.
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}