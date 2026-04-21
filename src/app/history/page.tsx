"use client";

import { useState } from "react";
import { useSensorHistory } from "@/hooks/useSensorHistory";

type SortKey = "temperature" | "humidity" | "light" | "status" | null;

export default function HistoryPage() {
  const statusData: Record<"TERBUKA" | "TERTUTUP", number> = {
    TERBUKA: 2,
    TERTUTUP: 1,
  };
  const { history, loading, error } = useSensorHistory(20);
  const [selectedDate, setSelectedDate] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>(null);

  const formatDateValue = (timestamp: string) => {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  const availableDates = Array.from(
    new Set(history.map((item) => formatDateValue(item.timestamp))),
  );

  const filteredHistory = selectedDate
    ? history.filter((item) => formatDateValue(item.timestamp) === selectedDate)
    : history;

  const displayedHistory = [...filteredHistory];

  if (sortKey === "temperature") {
    displayedHistory.sort((a, b) => b.temperature - a.temperature);
  }

  if (sortKey === "humidity") {
    displayedHistory.sort((a, b) => b.humidity - a.humidity);
  }

  if (sortKey === "light") {
    displayedHistory.sort((a, b) => b.light - a.light);
  }

  if (sortKey === "status") {
    displayedHistory.sort((a, b) => statusData[b.status] - statusData[a.status]);
  }

  const toggleSort = (nextSortKey: Exclude<SortKey, null>) => {
    setSortKey((currentSortKey) => (currentSortKey === nextSortKey ? null : nextSortKey));
  };

  const renderSortLabel = (label: string, key: Exclude<SortKey, null>) =>
    sortKey === key ? `${label} (desc)` : label;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 p-6 dark:from-slate-900 dark:to-slate-950">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">History Sensor</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">Riwayat data sensor yang diterima dari MQTT</p>
          </div>
          <div className="w-full md:w-64">
            <label htmlFor="history-date-filter" className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300">
              Filter Tanggal
            </label>
            <select
              id="history-date-filter"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-sky-400 dark:focus:ring-sky-900/40"
            >
              <option value="">Semua tanggal</option>
              {availableDates.map((date) => (
                <option key={date} value={date}>
                  {new Date(date).toLocaleDateString("id-ID", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                </option>
              ))}
            </select>
          </div>
        </header>

        <section className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-slate-800">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-800 dark:text-slate-100">Data History</h2>
            <span className="text-xs text-gray-500 dark:text-slate-400">{filteredHistory.length} data ditampilkan</span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-slate-800">
              <thead className="bg-gray-50 dark:bg-slate-800/60">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-slate-300">Waktu</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-slate-300">
                    <button
                      type="button"
                      onClick={() => toggleSort("temperature")}
                      className="transition hover:text-sky-600 dark:hover:text-sky-300"
                    >
                      {renderSortLabel("Suhu", "temperature")}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-slate-300">
                    <button
                      type="button"
                      onClick={() => toggleSort("humidity")}
                      className="transition hover:text-sky-600 dark:hover:text-sky-300"
                    >
                      {renderSortLabel("Kelembapan", "humidity")}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-slate-300">
                    <button
                      type="button"
                      onClick={() => toggleSort("light")}
                      className="transition hover:text-sky-600 dark:hover:text-sky-300"
                    >
                      {renderSortLabel("Cahaya", "light")}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-slate-300">Hujan</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-slate-300">Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-slate-300">Deskripsi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-gray-500 dark:text-slate-400">
                      Memuat data history dari Firestore...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-red-600 dark:text-red-400">
                      Gagal memuat history: {error}
                    </td>
                  </tr>
                ) : displayedHistory.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-gray-500 dark:text-slate-400">
                      {history.length === 0
                        ? "Belum ada data history di Firestore."
                        : "Tidak ada data pada tanggal yang dipilih."}
                    </td>
                  </tr>
                ) : (
                  displayedHistory.map((item, index) => (
                    <tr key={`${item.timestamp}-${index}`} className="hover:bg-gray-50/80 dark:hover:bg-slate-800/50">
                      <td className="px-4 py-3 text-gray-600 dark:text-slate-300">{new Date(item.timestamp).toLocaleString("id-ID")}</td>
                      <td className="px-4 py-3 text-gray-700 dark:text-slate-100">{item.temperature.toFixed(1)} C</td>
                      <td className="px-4 py-3 text-gray-700 dark:text-slate-100">{item.humidity.toFixed(1)} %</td>
                      <td className="px-4 py-3 text-gray-700 dark:text-slate-100">{item.light.toFixed(0)}</td>
                      <td className="px-4 py-3 text-gray-700 dark:text-slate-100">{item.isRaining() ? "Ya" : "Tidak"}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${item.status === "TERBUKA" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-slate-300">{item.status === "TERBUKA" ? "Cuaca cerah -> jemuran dibuka" : "Hujan/cahaya rendah -> jemuran ditutup"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
