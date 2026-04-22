"use client";

import { useState } from "react";
import { useSensorHistory } from "@/hooks/useSensorHistory";
import { MdOutlineMoreHoriz } from "react-icons/md"
import { FaAngleLeft } from "react-icons/fa6";
import { FaAngleRight } from "react-icons/fa6";


type SortKey = "temperature" | "humidity" | "light" | "status" | null;
type SortDirection = "desc" | "status-open-first" | "status-closed-first";

type DailySummary = {
  dateKey: string;
  averageTemperature: number;
  averageHumidity: number;
  averageLight: number;
  totalReadings: number;
  rainyReadings: number;
  openCount: number;
  closedCount: number;
  status: "TERBUKA" | "TERTUTUP";
};

export default function HistoryPage() {
  const { history, loading, error } = useSensorHistory(100);
  const [sortKey, setSortKey] = useState<SortKey>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const ITEMS_PER_PAGE = 10;
  const [currentPage, setCurrentPage] = useState(1);

  const formatDateValue = (timestamp: string) => {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  const formatDateLabel = (dateKey: string) =>
    new Date(dateKey).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

  const dailySummaryMap = history.reduce<Record<string, DailySummary>>((accumulator, item) => {
    const dateKey = formatDateValue(item.timestamp);

    if (!accumulator[dateKey]) {
      accumulator[dateKey] = {
        dateKey,
        averageTemperature: 0,
        averageHumidity: 0,
        averageLight: 0,
        totalReadings: 0,
        rainyReadings: 0,
        openCount: 0,
        closedCount: 0,
        status: "TERTUTUP",
      };
    }

    const dailySummary = accumulator[dateKey];
    dailySummary.averageTemperature += item.temperature;
    dailySummary.averageHumidity += item.humidity;
    dailySummary.averageLight += item.light;
    dailySummary.totalReadings += 1;

    if (item.isRaining()) {
      dailySummary.rainyReadings += 1;
    }

    if (item.status === "TERBUKA") {
      dailySummary.openCount += 1;
    } else {
      dailySummary.closedCount += 1;
    }

    return accumulator;
  }, {});

  const dailyHistory = Object.values(dailySummaryMap).map((item) => {
    const averageTemperature = item.averageTemperature / item.totalReadings;
    const averageHumidity = item.averageHumidity / item.totalReadings;
    const averageLight = item.averageLight / item.totalReadings;
    const status = item.openCount >= item.closedCount ? "TERBUKA" : "TERTUTUP";

    return {
      ...item,
      averageTemperature,
      averageHumidity,
      averageLight,
      status,
    };
  });

  const displayedHistory = [...dailyHistory];

  const totalPages = Math.ceil(displayedHistory.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;

  const paginatedHistory = displayedHistory.slice(startIndex, endIndex);

  if (sortKey === "temperature") {
    displayedHistory.sort((a, b) => b.averageTemperature - a.averageTemperature);
  }

  if (sortKey === "humidity") {
    displayedHistory.sort((a, b) => b.averageHumidity - a.averageHumidity);
  }

  if (sortKey === "light") {
    displayedHistory.sort((a, b) => b.averageLight - a.averageLight);
  }

  if (sortKey === "status") {
    displayedHistory.sort((a, b) => {
      const aRank = sortDirection === "status-closed-first"
        ? (a.status === "TERTUTUP" ? 2 : 1)
        : (a.status === "TERBUKA" ? 2 : 1);
      const bRank = sortDirection === "status-closed-first"
        ? (b.status === "TERTUTUP" ? 2 : 1)
        : (b.status === "TERBUKA" ? 2 : 1);

      return bRank - aRank;
    });
  }

  if (sortKey === null) {
    displayedHistory.sort((a, b) => b.dateKey.localeCompare(a.dateKey));
  }

  const toggleSort = (nextSortKey: Exclude<SortKey, null>) => {
    if (nextSortKey === "status") {
      if (sortKey !== "status") {
        setSortKey("status");
        setSortDirection("status-open-first");
        setCurrentPage(1);
        return;
      }

      if (sortDirection === "status-open-first") {
        setSortDirection("status-closed-first");
        setCurrentPage(1);
        return;
      }

      if (sortDirection === "status-closed-first") {
        setSortKey(null);
        setSortDirection("desc");
        setCurrentPage(1);
      }

      return;
    }

    setSortDirection("desc");
    setSortKey((currentSortKey) => (currentSortKey === nextSortKey ? null : nextSortKey));
  };

  const renderSortLabel = (label: string, key: Exclude<SortKey, null>) =>
    sortKey === key ? `${label} (desc)` : label;

  const renderStatusSortLabel = (label: string) => {
    if (sortKey !== "status") {
      return label;
    }

    if (sortDirection === "status-open-first") {
      return `${label} (terbuka)`;
    }

    if (sortDirection === "status-closed-first") {
      return `${label} (tertutup)`;
    }

    return label;
  };

  // Details
  const [selectedDataKey, setSelectedDataKey] = useState<string | null>(null);
  const selectedDayHistory = selectedDataKey
    ? history.filter((item) => formatDateValue(item.timestamp) === selectedDataKey) : [];
  const orderedSelectedDayHistory = [...selectedDayHistory].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  const firstReading = orderedSelectedDayHistory[0];
  const firstTime = firstReading
    ? new Date(firstReading.timestamp).toLocaleTimeString("id-ID")
    : "-";
  const lastReading = orderedSelectedDayHistory[orderedSelectedDayHistory.length - 1];
  const lastTime = lastReading
    ? new Date(lastReading.timestamp).toLocaleTimeString("id-ID")
    : "-";

  // Grafik
  const temperatureValues = orderedSelectedDayHistory.map((item) => item.temperature);
  const humidityValues = orderedSelectedDayHistory.map((item) => item.humidity);
  const lightValues = orderedSelectedDayHistory.map((item) => item.light);
  const buildChartPoints = (values: number[]) => {
    if (values.length === 0) {
      return "";
    }

    const width = 100;
    const height = 36;
    const top = 4;
    const bottom = 32;
    const min = Math.min(...values);
    const max = Math.max(...values);

    return values
      .map((value, index) => {
        const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * width;
        const range = max - min;
        const normalized = range === 0 ? 0.5 : (value - min) / range;
        const y = bottom - normalized * (bottom - top);

        return `${x},${y}`;
      })
      .join(" ");
  };
  const temperaturePoints = buildChartPoints(temperatureValues);
  const humidityPoints = buildChartPoints(humidityValues);
  const lightPoints = buildChartPoints(lightValues);
  const renderChartCard = (
    title: string,
    values: number[],
    points: string,
    stroke: string,
    unit: string,
  ) => {
    const latestValue = values.length > 0 ? values[values.length - 1] : null;
    const minValue = values.length > 0 ? Math.min(...values) : 0;
    const maxValue = values.length > 0 ? Math.max(...values) : 0;

    return (
      <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-slate-100">{title}</h3>
          <span className="text-xs font-semibold text-gray-500 dark:text-slate-400">
            {latestValue === null ? "--" : `${latestValue.toFixed(1)} ${unit}`}
          </span>
        </div>

        {values.length < 2 ? (
          <p className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-4 text-xs text-gray-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
            Data belum cukup untuk menampilkan grafik.
          </p>
        ) : (
          <svg viewBox="0 0 100 36" className="h-28 w-full" role="img" aria-label={`Grafik ${title}`}>
            <polyline
              fill="none"
              stroke="#e2e8f0"
              strokeWidth="0.8"
              points="0,32 100,32"
            />
            <polyline
              fill="none"
              stroke={stroke}
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={points}
            />
          </svg>
        )}

        <div className="mt-2 flex items-center justify-between text-[11px] text-gray-500 dark:text-slate-400">
          <span>Min: {values.length > 0 ? `${minValue.toFixed(1)} ${unit}` : "--"}</span>
          <span>Max: {values.length > 0 ? `${maxValue.toFixed(1)} ${unit}` : "--"}</span>
        </div>
      </article>
    );
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 p-6 dark:from-slate-900 dark:to-slate-950">
      <div className="mx-auto max-w-6xl space-y-6">
        <header>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">History Sensor Harian</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
            Setiap baris menampilkan rata-rata data sensor dari satu hari penuh.
          </p>
        </header>

        <section className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-slate-800">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-800 dark:text-slate-100">Ringkasan Harian</h2>
            <span className="text-xs text-gray-500 dark:text-slate-400">{displayedHistory.length} hari ditampilkan</span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-slate-800">
              <thead className="bg-gray-50 dark:bg-slate-800/60">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-slate-300">Tanggal</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-slate-300">
                    <button
                      type="button"
                      onClick={() => toggleSort("temperature")}
                      className="transition hover:text-sky-600 dark:hover:text-sky-300"
                    >
                      {renderSortLabel("Rata-rata Suhu", "temperature")}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-slate-300">
                    <button
                      type="button"
                      onClick={() => toggleSort("humidity")}
                      className="transition hover:text-sky-600 dark:hover:text-sky-300"
                    >
                      {renderSortLabel("Rata-rata Kelembapan", "humidity")}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-slate-300">
                    <button
                      type="button"
                      onClick={() => toggleSort("light")}
                      className="transition hover:text-sky-600 dark:hover:text-sky-300"
                    >
                      {renderSortLabel("Rata-rata Cahaya", "light")}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-slate-300">Jumlah Data</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-slate-300">Hujan</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-slate-300">
                    <button
                      type="button"
                      onClick={() => toggleSort("status")}
                      className="transition hover:text-sky-600 dark:hover:text-sky-300"
                    >
                      {renderStatusSortLabel("Status Dominan")}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-600 dark:text-slate-300">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-6 text-center text-gray-500 dark:text-slate-400">
                      Memuat data history dari Firestore...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-6 text-center text-red-600 dark:text-red-400">
                      Gagal memuat history: {error}
                    </td>
                  </tr>
                ) : displayedHistory.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-6 text-center text-gray-500 dark:text-slate-400">
                      Belum ada data history di Firestore.
                    </td>
                  </tr>
                ) : (
                  paginatedHistory.map((item) => (
                    <tr key={item.dateKey} className="hover:bg-gray-50/80 dark:hover:bg-slate-800/50">
                      <td className="px-4 py-3 text-gray-600 dark:text-slate-300">{formatDateLabel(item.dateKey)}</td>
                      <td className="px-4 py-3 text-gray-700 dark:text-slate-100">{item.averageTemperature.toFixed(1)} C</td>
                      <td className="px-4 py-3 text-gray-700 dark:text-slate-100">{item.averageHumidity.toFixed(1)} %</td>
                      <td className="px-4 py-3 text-gray-700 dark:text-slate-100">{item.averageLight.toFixed(0)}</td>
                      <td className="px-4 py-3 text-gray-700 dark:text-slate-100">{item.totalReadings}</td>
                      <td className="px-4 py-3 text-gray-700 dark:text-slate-100">{item.rainyReadings > 0 ? `${item.rainyReadings} kali` : "Tidak"}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${item.status === "TERBUKA" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          className={
                            selectedDataKey === item.dateKey
                              ? "inline-flex items-center justify-center text-sky-600"
                              : "inline-flex items-center justify-center"
                          }
                          onClick={() => setSelectedDataKey((current) => current === item.dateKey ? null : item.dateKey)}>
                          <MdOutlineMoreHoriz />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            <div className="flex items-center justify-between border-t border-y-gray-200 px-4 py-3 dark:border-slate-800">
              <span className="text-sm text-gray-500 dark:text-slate-400">
                Halaman {currentPage} dari {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))}
                  disabled={currentPage === 1}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200">
                  <FaAngleLeft />
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.min(page + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200">
                  <FaAngleRight />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Grafik */}
        {selectedDataKey && (
          <section className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-gray-200 px-4 py-3 dark:border-slate-800">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-800 dark:text-slate-100">
                Detail Harian
              </h2>
            </div>
            <div className="px-4 py-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-gray-50 p-3 dark:bg-slate-800/60">
                <p className="text-xs text-gray-500 dark:text-slate-400">Jumlah Pembacaan</p>
                <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-slate-100">
                  {selectedDayHistory.length}
                </p>
              </div>

              <div className="rounded-xl bg-gray-50 p-3 dark:bg-slate-800/60">
                <p className="text-xs text-gray-500 dark:text-slate-400">Data Pertama</p>
                <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-slate-100">
                  {firstTime}
                </p>
              </div>

              <div className="rounded-xl bg-gray-50 p-3 dark:bg-slate-800/60">
                <p className="text-xs text-gray-500 dark:text-slate-400">Data Terakhir</p>
                <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-slate-100">
                  {lastTime}
                </p>
              </div>
            </div>

            <div className="p-4">
              {!selectedDataKey ? (
                <p className="text-sm text-gray-500 dark:bg-slate-400">Pilih salah satu hari dari tabel untuk melihat frafik sensor</p>
              ) : (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                      Detail {formatDateLabel(selectedDataKey)}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-slate-400">
                      Grafik pembacaan sensor pada hari tersebut.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    {renderChartCard("Suhu", temperatureValues, temperaturePoints, "#ef4444", "C")}
                    {renderChartCard("Kelembapan", humidityValues, humidityPoints, "#3b82f6", "%")}
                    {renderChartCard("Cahaya", lightValues, lightPoints, "#f59e0b", "lux")}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
