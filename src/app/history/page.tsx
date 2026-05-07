"use client";

import { useMemo, useState } from "react";
import { useSensorHistory } from "@/hooks/useSensorHistory";
import { MdOutlineMoreHoriz } from "react-icons/md";
import { FaAngleLeft, FaAngleRight } from "react-icons/fa6";

type SortKey = "date" | "temperature" | "humidity" | "light" | "status";
type SortDirection = "asc" | "desc";
type StatusFilter = "all" | "TERBUKA" | "TERTUTUP";
type WeatherFilter = "all" | "dry" | "rainy";

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
  firstReadingAt: string;
  lastReadingAt: string;
};

const ITEMS_PER_PAGE = 8;

function getTimestampMs(timestamp: string): number {
  const parsed = new Date(timestamp).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatDateValue(timestamp: string): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDateLabel(dateKey: string): string {
  return new Date(dateKey).toLocaleDateString("en-US", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toStatusLabel(status: "TERBUKA" | "TERTUTUP"): "OPEN" | "CLOSED" {
  return status === "TERBUKA" ? "OPEN" : "CLOSED";
}

export default function HistoryPage() {
  const { history, loading, error, lastFetchedAt } = useSensorHistory(200);
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [weatherFilter, setWeatherFilter] = useState<WeatherFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedDataKey, setSelectedDataKey] = useState<string | null>(null);

  const sortedHistory = useMemo(
    () => [...history].sort((a, b) => getTimestampMs(b.timestamp) - getTimestampMs(a.timestamp)),
    [history],
  );

  const dailyHistory = useMemo(() => {
    const dailySummaryMap = sortedHistory.reduce<Record<string, DailySummary>>((accumulator, item) => {
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
          firstReadingAt: item.timestamp,
          lastReadingAt: item.timestamp,
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

      if (getTimestampMs(item.timestamp) < getTimestampMs(dailySummary.firstReadingAt)) {
        dailySummary.firstReadingAt = item.timestamp;
      }
      if (getTimestampMs(item.timestamp) > getTimestampMs(dailySummary.lastReadingAt)) {
        dailySummary.lastReadingAt = item.timestamp;
      }

      return accumulator;
    }, {});

    return Object.values(dailySummaryMap).map<DailySummary>((item) => {
      const averageTemperature = item.averageTemperature / item.totalReadings;
      const averageHumidity = item.averageHumidity / item.totalReadings;
      const averageLight = item.averageLight / item.totalReadings;
      const status: DailySummary["status"] =
        item.openCount >= item.closedCount ? "TERBUKA" : "TERTUTUP";

      return {
        ...item,
        averageTemperature,
        averageHumidity,
        averageLight,
        status,
      };
    });
  }, [sortedHistory]);

  const filteredDailyHistory = useMemo(() => {
    const result = dailyHistory.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) {
        return false;
      }
      if (weatherFilter === "rainy" && item.rainyReadings === 0) {
        return false;
      }
      if (weatherFilter === "dry" && item.rainyReadings > 0) {
        return false;
      }
      return true;
    });

    result.sort((a, b) => {
      if (sortKey === "date") {
        return sortDirection === "desc"
          ? b.dateKey.localeCompare(a.dateKey)
          : a.dateKey.localeCompare(b.dateKey);
      }

      if (sortKey === "status") {
        const statusValue = (value: DailySummary["status"]) => (value === "TERBUKA" ? 1 : 0);
        return sortDirection === "desc"
          ? statusValue(b.status) - statusValue(a.status)
          : statusValue(a.status) - statusValue(b.status);
      }

      const numericValue = (item: DailySummary) => {
        if (sortKey === "temperature") {
          return item.averageTemperature;
        }
        if (sortKey === "humidity") {
          return item.averageHumidity;
        }
        return item.averageLight;
      };

      return sortDirection === "desc"
        ? numericValue(b) - numericValue(a)
        : numericValue(a) - numericValue(b);
    });

    return result;
  }, [dailyHistory, sortDirection, sortKey, statusFilter, weatherFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredDailyHistory.length / ITEMS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * ITEMS_PER_PAGE;
  const paginatedHistory = filteredDailyHistory.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const selectedDateKey =
    selectedDataKey && filteredDailyHistory.some((item) => item.dateKey === selectedDataKey)
      ? selectedDataKey
      : paginatedHistory[0]?.dateKey ?? null;

  const orderedSelectedDayHistory = useMemo(
    () =>
      sortedHistory
        .filter((item) => selectedDateKey !== null && formatDateValue(item.timestamp) === selectedDateKey)
        .sort((a, b) => getTimestampMs(a.timestamp) - getTimestampMs(b.timestamp)),
    [selectedDateKey, sortedHistory],
  );

  const selectedSummary = filteredDailyHistory.find((item) => item.dateKey === selectedDateKey) ?? null;

  const totalRainyDays = dailyHistory.filter((item) => item.rainyReadings > 0).length;
  const totalOpenDominantDays = dailyHistory.filter((item) => item.status === "TERBUKA").length;
  const averageTemperature =
    dailyHistory.length > 0
      ? dailyHistory.reduce((sum, item) => sum + item.averageTemperature, 0) / dailyHistory.length
      : 0;
  const averageHumidity =
    dailyHistory.length > 0
      ? dailyHistory.reduce((sum, item) => sum + item.averageHumidity, 0) / dailyHistory.length
      : 0;

  const toggleSort = (key: SortKey) => {
    setCurrentPage(1);
    setSortKey((currentKey) => {
      if (currentKey === key) {
        setSortDirection((currentDirection) => (currentDirection === "desc" ? "asc" : "desc"));
        return currentKey;
      }
      setSortDirection(key === "date" ? "desc" : "desc");
      return key;
    });
  };

  const temperatureValues = orderedSelectedDayHistory.map((item) => item.temperature);
  const humidityValues = orderedSelectedDayHistory.map((item) => item.humidity);
  const lightValues = orderedSelectedDayHistory.map((item) => item.light);

  const buildChartPoints = (values: number[]) => {
    if (values.length === 0) {
      return "";
    }

    const width = 100;
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

  const renderChartCard = (
    title: string,
    values: number[],
    stroke: string,
    unit: string,
  ) => {
    const latestValue = values.length > 0 ? values[values.length - 1] : null;
    const minValue = values.length > 0 ? Math.min(...values) : 0;
    const maxValue = values.length > 0 ? Math.max(...values) : 0;
    const points = buildChartPoints(values);

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
            Not enough data to display the chart.
          </p>
        ) : (
          <svg viewBox="0 0 100 36" className="h-28 w-full" role="img" aria-label={`${title} chart`}>
            <polyline fill="none" stroke="#e2e8f0" strokeWidth="0.8" points="0,32 100,32" />
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
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
              Clothesline Operational History
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
              Daily summaries and latest readings from the smart clothesline sensor.
            </p>
          </div>
          <div className="text-xs text-gray-500 dark:text-slate-400">
            Last sync: {lastFetchedAt ? new Date(lastFetchedAt).toLocaleString("en-US") : "-"}
          </div>
        </header>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
              Stored Days
            </p>
            <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-slate-100">{dailyHistory.length}</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
              Average Temperature
            </p>
            <p className="mt-2 text-2xl font-bold text-red-600">{averageTemperature.toFixed(1)} C</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
              Rainy Days
            </p>
            <p className="mt-2 text-2xl font-bold text-blue-600">{totalRainyDays}</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
              Open-Dominant Days
            </p>
            <p className="mt-2 text-2xl font-bold text-emerald-600">{totalOpenDominantDays}</p>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-800 dark:text-slate-100">
                History Filter
              </h2>
              <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                Filter days by operational status and weather conditions.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <label className="text-xs text-gray-500 dark:text-slate-400">
                Dominant Status
                <select
                  value={statusFilter}
                  onChange={(event) => {
                    setStatusFilter(event.target.value as StatusFilter);
                    setCurrentPage(1);
                  }}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                >
                  <option value="all">All statuses</option>
                  <option value="TERBUKA">Open</option>
                  <option value="TERTUTUP">Closed</option>
                </select>
              </label>
              <label className="text-xs text-gray-500 dark:text-slate-400">
                Rain Condition
                <select
                  value={weatherFilter}
                  onChange={(event) => {
                    setWeatherFilter(event.target.value as WeatherFilter);
                    setCurrentPage(1);
                  }}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                >
                  <option value="all">All days</option>
                  <option value="dry">No rain</option>
                  <option value="rainy">Has rain</option>
                </select>
              </label>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-950">
                <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-slate-400">
                  Average Humidity
                </p>
                <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-slate-100">
                  {averageHumidity.toFixed(1)} %
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-950">
                <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-slate-400">
                  Sensor Data
                </p>
                <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-slate-100">
                  {history.length} readings
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.5fr_1fr]">
          <section className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-slate-800">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-800 dark:text-slate-100">
                  Daily Summary
                </h2>
                <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                  {filteredDailyHistory.length} days matching filters
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-slate-800">
                <thead className="bg-gray-50 dark:bg-slate-800/60">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-slate-300">
                      <button type="button" onClick={() => toggleSort("date")}>Date</button>
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-slate-300">
                      <button type="button" onClick={() => toggleSort("temperature")}>Temperature</button>
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-slate-300">
                      <button type="button" onClick={() => toggleSort("humidity")}>Humidity</button>
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-slate-300">
                      <button type="button" onClick={() => toggleSort("light")}>Light</button>
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-slate-300">Readings</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-slate-300">Rain</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-slate-300">
                      <button type="button" onClick={() => toggleSort("status")}>Status</button>
                    </th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-600 dark:text-slate-300">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-gray-500 dark:text-slate-400">
                        Loading history data from Firestore...
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-red-600 dark:text-red-400">
                        Failed to load history: {error}
                      </td>
                    </tr>
                  ) : paginatedHistory.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-gray-500 dark:text-slate-400">
                        No data matches the current filters.
                      </td>
                    </tr>
                  ) : (
                    paginatedHistory.map((item) => (
                      <tr key={item.dateKey} className="hover:bg-gray-50/80 dark:hover:bg-slate-800/50">
                        <td className="px-4 py-3 text-gray-700 dark:text-slate-100">
                          <p className="font-medium">{formatDateLabel(item.dateKey)}</p>
                          <p className="text-xs text-gray-500 dark:text-slate-400">
                            {formatTime(item.firstReadingAt)} - {formatTime(item.lastReadingAt)}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-gray-700 dark:text-slate-100">
                          {item.averageTemperature.toFixed(1)} C
                        </td>
                        <td className="px-4 py-3 text-gray-700 dark:text-slate-100">
                          {item.averageHumidity.toFixed(1)} %
                        </td>
                        <td className="px-4 py-3 text-gray-700 dark:text-slate-100">
                          {item.averageLight.toFixed(0)} lux
                        </td>
                        <td className="px-4 py-3 text-gray-700 dark:text-slate-100">
                          {item.totalReadings}
                        </td>
                        <td className="px-4 py-3 text-gray-700 dark:text-slate-100">
                          {item.rainyReadings > 0 ? `${item.rainyReadings} times` : "No"}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                              item.status === "TERBUKA"
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                                : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                            }`}
                          >
                            {toStatusLabel(item.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            className={`inline-flex items-center justify-center ${
                              selectedDateKey === item.dateKey ? "text-sky-600" : "text-gray-500"
                            }`}
                            onClick={() => setSelectedDataKey(item.dateKey)}
                          >
                            <MdOutlineMoreHoriz />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 dark:border-slate-800">
              <span className="text-sm text-gray-500 dark:text-slate-400">
                Page {safeCurrentPage} of {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))}
                  disabled={safeCurrentPage === 1}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200"
                >
                  <FaAngleLeft />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.min(page + 1, totalPages))}
                  disabled={safeCurrentPage === totalPages}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200"
                >
                  <FaAngleRight />
                </button>
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="border-b border-gray-200 px-4 py-3 dark:border-slate-800">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-800 dark:text-slate-100">
                  Daily Details
                </h2>
              </div>
              <div className="p-4">
                {!selectedSummary ? (
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    Select a day to view operational details.
                  </p>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                        {formatDateLabel(selectedSummary.dateKey)}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-slate-400">
                        {selectedSummary.totalReadings} readings, time range{" "}
                        {formatTime(selectedSummary.firstReadingAt)} - {formatTime(selectedSummary.lastReadingAt)}.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl bg-gray-50 p-3 dark:bg-slate-800/60">
                        <p className="text-xs text-gray-500 dark:text-slate-400">Dominant Status</p>
                        <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-slate-100">
                          {toStatusLabel(selectedSummary.status)}
                        </p>
                      </div>
                      <div className="rounded-xl bg-gray-50 p-3 dark:bg-slate-800/60">
                        <p className="text-xs text-gray-500 dark:text-slate-400">Rain Events</p>
                        <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-slate-100">
                          {selectedSummary.rainyReadings}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      {renderChartCard("Temperature", temperatureValues, "#ef4444", "C")}
                      {renderChartCard("Humidity", humidityValues, "#3b82f6", "%")}
                      {renderChartCard("Light", lightValues, "#f59e0b", "lux")}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="border-b border-gray-200 px-4 py-3 dark:border-slate-800">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-800 dark:text-slate-100">
                  Latest Readings
                </h2>
              </div>
              <div className="max-h-[420px] overflow-y-auto p-4">
                {orderedSelectedDayHistory.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    No readings available for the selected day.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {orderedSelectedDayHistory.slice().reverse().map((item) => (
                      <div
                        key={`${item.timestamp}-${item.temperature}-${item.humidity}`}
                        className="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-slate-800 dark:bg-slate-950"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                            {formatTime(item.timestamp)}
                          </p>
                          <span
                            className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                              item.isRaining()
                                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                                : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                            }`}
                          >
                            {item.isRaining() ? "Rainy" : "Dry"}
                          </span>
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-gray-600 dark:text-slate-300">
                          <p>Temperature: {item.temperature.toFixed(1)} C</p>
                          <p>Humidity: {item.humidity.toFixed(1)} %</p>
                          <p>Light: {item.light.toFixed(0)} lux</p>
                          <p>Status: {toStatusLabel(item.status as "TERBUKA" | "TERTUTUP")}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
