"use client";

import { useMemo, useState } from "react";
import { useSensorHistory } from "@/hooks/useSensorHistory";
import {
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  History,
  Calendar,
  Thermometer,
  CloudRain,
  Zap,
  Filter,
  Droplets,
  Database,
  Sun,
  Activity,
  Clock,
  TrendingUp,
} from "lucide-react";
import { formatClock, formatDateTime } from "@/utils/timeFormat";
import PageContainer from "@/components/layout/PageContainer";

type SortKey = "date" | "temperature" | "humidity" | "light" | "status";
type SortDirection = "asc" | "desc";
type StatusFilter = "all" | "OPEN" | "CLOSED";
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
  status: "OPEN" | "CLOSED";
  dominantRatio: number;
  humidityTrend: "up" | "down" | "flat";
  lightTrend: "up" | "down" | "flat";
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
  return formatClock(timestamp);
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
          status: "CLOSED",
          dominantRatio: 0,
          humidityTrend: "flat",
          lightTrend: "flat",
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

      if (item.status === "OPEN") {
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
        item.openCount >= item.closedCount ? "OPEN" : "CLOSED";
      const dominantCount = Math.max(item.openCount, item.closedCount);
      const dominantRatio = item.totalReadings > 0 ? (dominantCount / item.totalReadings) * 100 : 0;
      const dayReadings = sortedHistory
        .filter((entry) => formatDateValue(entry.timestamp) === item.dateKey)
        .sort((a, b) => getTimestampMs(a.timestamp) - getTimestampMs(b.timestamp));
      const firstReading = dayReadings[0];
      const lastReading = dayReadings[dayReadings.length - 1];
      const humidityTrend =
        !firstReading || !lastReading
          ? "flat"
          : lastReading.humidity > firstReading.humidity
            ? "up"
            : lastReading.humidity < firstReading.humidity
              ? "down"
              : "flat";
      const lightTrend =
        !firstReading || !lastReading
          ? "flat"
          : lastReading.light > firstReading.light
            ? "up"
            : lastReading.light < firstReading.light
              ? "down"
              : "flat";

      return {
        ...item,
        averageTemperature,
        averageHumidity,
        averageLight,
        status,
        dominantRatio,
        humidityTrend,
        lightTrend,
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
        const statusValue = (value: DailySummary["status"]) => (value === "OPEN" ? 1 : 0);
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
  const totalOpenDominantDays = dailyHistory.filter((item) => item.status === "OPEN").length;
  const averageTemperatureGlobal =
    dailyHistory.length > 0
      ? dailyHistory.reduce((sum, item) => sum + item.averageTemperature, 0) / dailyHistory.length
      : 0;
  const averageHumidityGlobal =
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
      <article className="rounded-2xl border border-slate-200/50 bg-slate-50 dark:bg-white/5 p-6 dark:border-white/5 transition-all group hover:border-teal-500/30">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">{title}</h3>
          <span className="text-sm font-black text-slate-800 dark:text-white">
            {latestValue === null ? "--" : `${latestValue.toFixed(1)} ${unit}`}
          </span>
        </div>

        {values.length < 2 ? (
          <div className="flex flex-col items-center justify-center py-6 opacity-30">
             <Database className="h-6 w-6 mb-2" />
             <p className="text-[9px] font-black uppercase tracking-widest">Insufficient Data</p>
          </div>
        ) : (
          <svg viewBox="0 0 100 36" className="h-20 w-full" role="img" aria-label={`${title} chart`}>
            <polyline fill="none" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.1" points="0,32 100,32" />
            <polyline
              fill="none"
              stroke={stroke}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={points}
              className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.1)]"
            />
          </svg>
        )}

        <div className="mt-4 flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          <span>Min: {values.length > 0 ? `${minValue.toFixed(1)} ${unit}` : "--"}</span>
          <span>Max: {values.length > 0 ? `${maxValue.toFixed(1)} ${unit}` : "--"}</span>
        </div>
      </article>
    );
  };

  const renderDominantStatusCard = (summary: DailySummary | null) => {
    if (!summary) return null;

    const openPercent = summary.totalReadings > 0 ? (summary.openCount / summary.totalReadings) * 100 : 0;
    const closedPercent = summary.totalReadings > 0 ? (summary.closedCount / summary.totalReadings) * 100 : 0;

    return (
      <article className="rounded-[2rem] border border-slate-200/50 bg-slate-50 dark:bg-white/5 p-8 dark:border-white/5">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Status Distribution</h3>
          <span
            className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${
              summary.status === "OPEN"
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
            }`}
          >
            {summary.status} Dominant
          </span>
        </div>
        <div className="space-y-6">
          <div>
            <div className="mb-2 flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
              <span className="text-emerald-600 dark:text-emerald-400">OPEN</span>
              <span className="text-slate-400">{summary.openCount} reads ({openPercent.toFixed(1)}%)</span>
            </div>
            <div className="h-2 rounded-full bg-slate-200 dark:bg-white/5 overflow-hidden">
              <div className="h-full rounded-full bg-emerald-500" style={{ width: `${openPercent}%` }} />
            </div>
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
              <span className="text-rose-600 dark:text-rose-400">CLOSED</span>
              <span className="text-slate-400">{summary.closedCount} reads ({closedPercent.toFixed(1)}%)</span>
            </div>
            <div className="h-2 rounded-full bg-slate-200 dark:bg-white/5 overflow-hidden">
              <div className="h-full rounded-full bg-rose-500" style={{ width: `${closedPercent}%` }} />
            </div>
          </div>
        </div>
      </article>
    );
  };

  return (
    <main className="min-h-screen bg-[#f8fafc] dark:bg-[#020617] transition-colors duration-500 pb-20">
      <PageContainer className="space-y-8">
        {/* Hero Header Section */}
        <header className="relative overflow-hidden rounded-[2.5rem] bg-white dark:bg-slate-900/50 p-8 md:p-10 shadow-2xl shadow-teal-500/5 border border-slate-200/60 dark:border-white/5 backdrop-blur-sm">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-teal-500/10 blur-[80px]" />
          <div className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-emerald-500/5 blur-[80px]" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500 text-white shadow-lg shadow-teal-500/20">
                  <History className="h-5 w-5" />
                </div>
                <span className="text-[11px] font-black uppercase tracking-[0.25em] text-teal-600 dark:text-teal-400">
                  Operational Archive
                </span>
              </div>
              <h1 className="text-5xl md:text-6xl font-black text-slate-800 dark:text-white tracking-tighter">System History</h1>
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Browse and analyze historical operational data.</p>
            </div>

            <div className="flex items-center gap-4">
                <div className="px-5 py-2.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 shadow-sm">
                   <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Last Sync</p>
                   <p className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">{lastFetchedAt ? formatDateTime(lastFetchedAt) : "-"}</p>
                </div>
            </div>
          </div>
        </header>

        {/* Global Stats Grid */}
        <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
           <HistoryStatCard label="Stored Days" value={dailyHistory.length} icon={<Calendar className="h-4 w-4" />} color="teal" />
           <HistoryStatCard label="Avg Temp" value={formatMetric(averageTemperatureGlobal, "°C")} icon={<Thermometer className="h-4 w-4" />} color="rose" />
           <HistoryStatCard label="Rainy Days" value={totalRainyDays} icon={<CloudRain className="h-4 w-4" />} color="blue" />
           <HistoryStatCard label="Open Days" value={totalOpenDominantDays} icon={<Zap className="h-4 w-4" />} color="emerald" />
        </section>

        {/* Filter Section */}
        <section className="rounded-[2.5rem] bg-white dark:bg-slate-900/40 p-10 shadow-xl border border-slate-200/60 dark:border-white/5 backdrop-blur-sm">
           <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
              <div className="space-y-2">
                 <div className="flex items-center gap-3">
                    <Filter className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">Filter Archive</h2>
                 </div>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Refine results by status or condition</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 flex-1 max-w-2xl">
                 <div className="space-y-3">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Status</span>
                    <select
                      value={statusFilter}
                      onChange={(e) => { setStatusFilter(e.target.value as StatusFilter); setCurrentPage(1); }}
                      className="w-full rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 p-5 text-sm font-bold text-slate-700 dark:text-white outline-none focus:ring-1 ring-teal-500/50 transition-all appearance-none"
                    >
                      <option value="all">All statuses</option>
                      <option value="OPEN">Open Only</option>
                      <option value="CLOSED">Closed Only</option>
                    </select>
                 </div>
                 <div className="space-y-3">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Condition</span>
                    <select
                      value={weatherFilter}
                      onChange={(e) => { setWeatherFilter(e.target.value as WeatherFilter); setCurrentPage(1); }}
                      className="w-full rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 p-5 text-sm font-bold text-slate-700 dark:text-white outline-none focus:ring-1 ring-teal-500/50 transition-all appearance-none"
                    >
                      <option value="all">Any Condition</option>
                      <option value="dry">Dry Only</option>
                      <option value="rainy">Rainy Only</option>
                    </select>
                 </div>
              </div>

              <div className="flex gap-4">
                 <div className="px-8 py-5 rounded-[2rem] bg-teal-500/10 border border-teal-500/20 text-center">
                    <p className="text-[10px] font-black text-teal-600 dark:text-teal-400 uppercase tracking-widest mb-1">Avg Humidity</p>
                    <p className="text-xl font-black text-teal-700 dark:text-teal-300">{averageHumidityGlobal.toFixed(1)}%</p>
                 </div>
                 <div className="px-8 py-5 rounded-[2rem] bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/5 text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Readings</p>
                    <p className="text-xl font-black text-slate-800 dark:text-white">{history.length}</p>
                 </div>
              </div>
           </div>
        </section>

        {/* Data Content Grid */}
        <div className="grid grid-cols-1 gap-8 xl:grid-cols-12">
          {/* Daily Summary Table */}
          <section className="xl:col-span-8 rounded-[2.5rem] bg-white dark:bg-slate-900/40 shadow-xl border border-slate-200/60 dark:border-white/5 backdrop-blur-sm overflow-hidden flex flex-col">
            <div className="p-10 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                 <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
                    <Activity className="h-5 w-5" />
                 </div>
                 <h2 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">Daily Summary</h2>
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{filteredDailyHistory.length} Days Found</p>
            </div>

            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50/50 dark:bg-white/5">
                  <tr>
                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-white/5">
                       <button onClick={() => toggleSort("date")} className="flex items-center gap-2 hover:text-teal-500 transition-colors">
                          Date {sortKey === "date" && (sortDirection === "asc" ? <ChevronUp size={12}/> : <ChevronDown size={12}/>)}
                       </button>
                    </th>
                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-white/5 text-center">Temp</th>
                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-white/5 text-center">Hum</th>
                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-white/5 text-center text-rose-500/70">Rain</th>
                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-white/5">Status</th>
                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-white/5 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {loading ? (
                    <tr><td colSpan={6} className="p-24 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Synchronizing Archive...</td></tr>
                  ) : error ? (
                    <tr><td colSpan={6} className="p-24 text-center text-[10px] font-black text-rose-500 uppercase tracking-widest">Failed: {error}</td></tr>
                  ) : paginatedHistory.length === 0 ? (
                    <tr><td colSpan={6} className="p-24 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">No matching records found.</td></tr>
                  ) : (
                    paginatedHistory.map((item) => (
                      <tr 
                        key={item.dateKey} 
                        className={`group transition-all hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer ${selectedDateKey === item.dateKey ? 'bg-teal-500/5 dark:bg-teal-500/10' : ''}`}
                        onClick={() => setSelectedDataKey(item.dateKey)}
                      >
                        <td className="px-8 py-8">
                           <p className="text-base font-black text-slate-800 dark:text-white tracking-tight">{formatDateLabel(item.dateKey)}</p>
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{formatTime(item.firstReadingAt)} - {formatTime(item.lastReadingAt)}</p>
                        </td>
                        <td className="px-8 py-8 text-center">
                           <span className="text-base font-black text-slate-700 dark:text-slate-200">{item.averageTemperature.toFixed(1)}°</span>
                        </td>
                        <td className="px-8 py-8 text-center">
                           <p className="text-base font-black text-slate-700 dark:text-slate-200">{item.averageHumidity.toFixed(0)}%</p>
                           <div className={`text-[10px] font-black uppercase flex items-center justify-center gap-1 mt-1 ${item.humidityTrend === 'up' ? 'text-rose-500' : item.humidityTrend === 'down' ? 'text-teal-500' : 'text-slate-400'}`}>
                              {item.humidityTrend} {item.humidityTrend !== 'flat' && (item.humidityTrend === 'up' ? <ChevronUp size={10}/> : <ChevronDown size={10}/>)}
                           </div>
                        </td>
                        <td className="px-8 py-8 text-center">
                           {item.rainyReadings > 0 ? (
                             <span className="text-[10px] font-black text-rose-600 dark:text-rose-400 bg-rose-500/10 px-4 py-1.5 rounded-full">{item.rainyReadings}x</span>
                           ) : (
                             <span className="text-[10px] font-black text-slate-300 dark:text-slate-700">None</span>
                           )}
                        </td>
                        <td className="px-8 py-8">
                           <div className="flex flex-col items-start gap-1">
                              <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${item.status === 'OPEN' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'}`}>
                                {item.status}
                              </span>
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest opacity-70 ml-1">{item.dominantRatio.toFixed(0)}% dominant</span>
                           </div>
                        </td>
                        <td className="px-8 py-8 text-right">
                           <button className={`p-4 rounded-2xl transition-all ${selectedDateKey === item.dateKey ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/20' : 'bg-slate-100 dark:bg-white/5 text-slate-400 group-hover:bg-teal-500/10 group-hover:text-teal-500'}`}>
                              <MoreHorizontal size={20} />
                           </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-10 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Page {safeCurrentPage} of {totalPages}</span>
              <div className="flex gap-4">
                <PaginationButton onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={safeCurrentPage === 1} icon={<ChevronLeft size={20}/>} />
                <PaginationButton onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={safeCurrentPage === totalPages} icon={<ChevronRight size={20}/>} />
              </div>
            </div>
          </section>

          {/* Detailed Side Panel */}
          <aside className="xl:col-span-4 space-y-8">
             <section className="rounded-[2.5rem] bg-white dark:bg-slate-900/40 p-10 shadow-xl border border-slate-200/60 dark:border-white/5 backdrop-blur-sm">
                <div className="flex items-center gap-3 mb-10">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">Temporal Insights</h2>
                </div>

                {!selectedSummary ? (
                   <div className="flex flex-col items-center justify-center py-24 opacity-30">
                      <History className="h-16 w-16 mb-6 text-teal-500" />
                      <p className="text-[10px] font-black uppercase tracking-widest text-center">Select a day<br/>to view details</p>
                   </div>
                ) : (
                   <div className="space-y-8">
                      <div className="p-10 rounded-[2.5rem] bg-slate-900 text-white relative overflow-hidden shadow-2xl">
                         <div className="absolute -right-10 -bottom-10 h-32 w-32 rounded-full bg-teal-500/20 blur-2xl" />
                         <p className="text-[10px] font-black uppercase tracking-widest text-teal-400 mb-2">Archive Entry</p>
                         <h3 className="text-3xl font-black mb-1">{formatDateLabel(selectedSummary.dateKey)}</h3>
                         <p className="text-sm font-bold text-slate-400">{selectedSummary.totalReadings} readings recorded.</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                         <div className="p-6 rounded-[2rem] bg-slate-50 dark:bg-white/5 border border-slate-200/50 dark:border-white/5">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Dominant State</p>
                            <p className={`text-base font-black uppercase ${selectedSummary.status === 'OPEN' ? 'text-emerald-600' : 'text-rose-600'}`}>{selectedSummary.status}</p>
                         </div>
                         <div className="p-6 rounded-[2rem] bg-slate-50 dark:bg-white/5 border border-slate-200/50 dark:border-white/5">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Rain Events</p>
                            <p className="text-base font-black text-slate-800 dark:text-white">{selectedSummary.rainyReadings} Detected</p>
                         </div>
                      </div>

                      {renderDominantStatusCard(selectedSummary)}

                      <div className="space-y-6">
                         {renderChartCard("Thermal Variance", temperatureValues, "#f43f5e", "°C")}
                         {renderChartCard("Humidity Path", humidityValues, "#3b82f6", "%")}
                         {renderChartCard("Photon Flux", lightValues, "#fbbf24", "lx")}
                      </div>
                   </div>
                )}
             </section>

             <section className="rounded-[2.5rem] bg-white dark:bg-slate-900/40 p-10 shadow-xl border border-slate-200/60 dark:border-white/5 backdrop-blur-sm overflow-hidden">
                <div className="flex items-center gap-3 mb-10">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
                    <Clock className="h-5 w-5" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">Sequence Stream</h2>
                </div>
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                   {orderedSelectedDayHistory.length === 0 ? (
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center py-24">Stream Offline</p>
                   ) : (
                      orderedSelectedDayHistory.slice().reverse().map((item, idx) => (
                        <div key={idx} className="p-8 rounded-[2rem] bg-slate-50 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 group hover:border-teal-500/30 transition-all">
                           <div className="flex items-center justify-between mb-6">
                              <p className="text-base font-black text-slate-800 dark:text-white">{formatTime(item.timestamp)}</p>
                              <span className={`text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest ${item.isRaining() ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-600'}`}>
                                 {item.isRaining() ? 'Rain' : 'Dry'}
                              </span>
                           </div>
                           <div className="grid grid-cols-2 gap-y-6">
                              <ReadingMetric label="Temp" value={`${item.temperature.toFixed(1)}°`} icon={<Thermometer size={14}/>} />
                              <ReadingMetric label="Humid" value={`${item.humidity.toFixed(1)}%`} icon={<Droplets size={14}/>} />
                              <ReadingMetric label="Light" value={`${item.light.toFixed(0)}`} icon={<Sun size={14}/>} />
                              <ReadingMetric label="Status" value={item.status} icon={<Zap size={14}/>} />
                           </div>
                        </div>
                      ))
                   )}
                </div>
             </section>
          </aside>
        </div>
      </PageContainer>
    </main>
  );
}

function HistoryStatCard({ label, value, icon, color }: { label: string; value: string | number; icon: React.ReactNode; color: string }) {
  const colors: Record<string, string> = {
    teal: "text-teal-600 bg-teal-500/10 border-teal-500/20 shadow-teal-500/5",
    rose: "text-rose-600 bg-rose-500/10 border-rose-500/20 shadow-rose-500/5",
    blue: "text-blue-600 bg-blue-500/10 border-blue-500/20 shadow-blue-500/5",
    emerald: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20 shadow-emerald-500/5",
  };
  return (
    <div className="p-10 rounded-[2.5rem] bg-white dark:bg-slate-900/40 shadow-2xl border border-slate-200/60 dark:border-white/5 backdrop-blur-sm group hover:scale-[1.02] transition-all">
       <div className={`p-4 rounded-2xl w-fit mb-6 shadow-lg ${colors[color]}`}>{icon}</div>
       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-3 ml-1">{label}</p>
       <p className="text-5xl font-black text-slate-800 dark:text-white tracking-tighter">{value}</p>
    </div>
  );
}

function formatMetric(value: number | null | undefined, suffix = ""): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "--";
  return `${value.toFixed(1)}${suffix}`;
}

function PaginationButton({ onClick, disabled, icon }: { onClick: () => void; disabled: boolean; icon: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="p-5 rounded-2xl bg-white dark:bg-white/5 border border-slate-200/50 dark:border-white/5 shadow-sm text-slate-500 disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-white/10 transition-colors"
    >
      {icon}
    </button>
  );
}

function ReadingMetric({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
   return (
      <div className="flex items-center gap-3">
         <span className="text-slate-400">{icon}</span>
         <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1">{label}:</span>
         <span className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase">{value}</span>
      </div>
   );
}

function ChevronDown({ size, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m6 9 6 6 6-6"/>
    </svg>
  );
}

function ChevronUp({ size, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m18 15-6-6-6 6"/>
    </svg>
  );
}



