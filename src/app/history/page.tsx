"use client";

import { useMemo, useState, useEffect } from "react";
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
  X,
  Loader2,
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
  const { history, loading, error, lastFetchedAt } = useSensorHistory(0);
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [weatherFilter, setWeatherFilter] = useState<WeatherFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedDataKey, setSelectedDataKey] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loadingDetailsKey, setLoadingDetailsKey] = useState<string | null>(null);

  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isModalOpen]);

  const sortedHistory = useMemo(
    () => [...history].sort((a, b) => getTimestampMs(b.timestamp) - getTimestampMs(a.timestamp)),
    [history],
  );

  const historyByDay = useMemo(() => {
    const map: Record<string, typeof sortedHistory> = {};
    sortedHistory.forEach((item) => {
      const dateKey = formatDateValue(item.timestamp);
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(item);
    });
    // Critical Optimization: Pre-sort each day once during map creation
    // This removes the O(N log N) sorting cost from the click event
    Object.values(map).forEach((dayReadings) => {
      dayReadings.sort((a, b) => getTimestampMs(a.timestamp) - getTimestampMs(b.timestamp));
    });
    return map;
  }, [sortedHistory]);

  const dailyHistory = useMemo(() => {
    return Object.entries(historyByDay).map<DailySummary>(([dateKey, dayReadings]) => {
      let totalTemp = 0;
      let totalHum = 0;
      let totalLight = 0;
      let rainyCount = 0;
      let openCount = 0;
      let closedCount = 0;
      
      let firstReading = dayReadings[0];
      let lastReading = dayReadings[0];
      let firstTime = getTimestampMs(firstReading.timestamp);
      let lastTime = firstTime;

      dayReadings.forEach((r) => {
        totalTemp += r.temperature;
        totalHum += r.humidity;
        totalLight += r.light;
        if (r.isRaining()) rainyCount++;
        if (r.status === "OPEN") openCount++;
        else closedCount++;

        const rTime = getTimestampMs(r.timestamp);
        if (rTime < firstTime) {
          firstTime = rTime;
          firstReading = r;
        }
        if (rTime > lastTime) {
          lastTime = rTime;
          lastReading = r;
        }
      });

      const total = dayReadings.length;
      return {
        dateKey,
        averageTemperature: totalTemp / total,
        averageHumidity: totalHum / total,
        averageLight: totalLight / total,
        totalReadings: total,
        rainyReadings: rainyCount,
        openCount,
        closedCount,
        status: openCount >= closedCount ? "OPEN" : "CLOSED",
        dominantRatio: (Math.max(openCount, closedCount) / total) * 100,
        humidityTrend:
          lastReading.humidity > firstReading.humidity ? "up" :
          lastReading.humidity < firstReading.humidity ? "down" : "flat",
        lightTrend:
          lastReading.light > firstReading.light ? "up" :
          lastReading.light < firstReading.light ? "down" : "flat",
        firstReadingAt: firstReading.timestamp,
        lastReadingAt: lastReading.timestamp,
      };
    });
  }, [historyByDay]);

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

  const orderedSelectedDayHistory = useMemo(() => {
    if (!selectedDateKey || !historyByDay[selectedDateKey]) return [];
    // Now just a direct O(1) lookup since it's pre-sorted
    return historyByDay[selectedDateKey];
  }, [selectedDateKey, historyByDay]);

  // Pre-calculate chart values for the selected day
  const selectedDayMetrics = useMemo(() => {
    if (orderedSelectedDayHistory.length === 0) return { temp: [], hum: [], light: [] };
    return {
       temp: orderedSelectedDayHistory.map(h => h.temperature),
       hum: orderedSelectedDayHistory.map(h => h.humidity),
       light: orderedSelectedDayHistory.map(h => h.light)
    };
  }, [orderedSelectedDayHistory]);

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
    if (values.length === 0) return "";

    // Maximum optimization: limit to 50 points for lightning fast SVG rendering
    const maxPoints = 50;
    let sampled;
    if (values.length <= maxPoints) {
       sampled = values;
    } else {
       const step = values.length / maxPoints;
       sampled = [];
       for (let i = 0; i < maxPoints; i++) {
          sampled.push(values[Math.floor(i * step)]);
       }
    }

    const width = 100;
    const top = 4;
    const bottom = 32;
    const min = Math.min(...sampled);
    const max = Math.max(...sampled);
    const range = max - min || 1;

    let points = "";
    for (let i = 0; i < sampled.length; i++) {
       const x = sampled.length === 1 ? width / 2 : (i / (sampled.length - 1)) * width;
       const normalized = (sampled[i] - min) / range;
       const y = bottom - normalized * (bottom - top);
       points += `${x.toFixed(1)},${y.toFixed(1)} `;
    }
    return points.trim();
  };

  const renderChartCard = (
    title: string,
    values: number[],
    stroke: string,
    unit: string,
  ) => {
    const avgValue = values.length > 0 ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1) : "0";
    const minValue = values.length > 0 ? Math.min(...values).toFixed(1) : "0";
    const maxValue = values.length > 0 ? Math.max(...values).toFixed(1) : "0";
    const points = buildChartPoints(values);
    const themeColor = stroke;
    
    return (
      <div className="group relative p-10 rounded-[3rem] bg-white dark:bg-slate-900/40 border border-slate-200/50 dark:border-white/5 shadow-sm hover:shadow-2xl hover:shadow-teal-500/5 transition-all duration-500 overflow-hidden">
        {/* Thematic background glow */}
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full opacity-[0.03] group-hover:opacity-[0.08] transition-all duration-700 blur-[80px]" style={{ backgroundColor: themeColor }} />
        
        <div className="relative z-10 space-y-8">
          {/* Header Section: Title & Average */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full animate-pulse" style={{ backgroundColor: themeColor }} />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">{title}</p>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-6xl font-black text-slate-800 dark:text-white tracking-tighter leading-none">{avgValue}</span>
                <span className="text-xl font-black text-slate-400 uppercase tracking-widest">{unit}</span>
                <span className="ml-2 text-[10px] font-black text-teal-500 uppercase tracking-widest opacity-40">Average</span>
              </div>
            </div>
            
            <div className="flex items-center gap-6 pb-2">
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Peak</span>
                <span className="text-base font-black text-emerald-600 dark:text-emerald-400">{maxValue}{unit}</span>
              </div>
              <div className="h-8 w-px bg-slate-100 dark:bg-white/5" />
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Floor</span>
                <span className="text-base font-black text-rose-600 dark:text-rose-400">{minValue}{unit}</span>
              </div>
            </div>
          </div>

          {/* Main Chart Section - The Focus */}
          <div className="w-full h-48 md:h-64 relative bg-slate-50/50 dark:bg-white/5 rounded-[2rem] p-8 border border-slate-100/50 dark:border-white/5">
            <div className="absolute inset-0 p-8 flex flex-col justify-between pointer-events-none opacity-30">
               <div className="w-full border-t border-slate-200 dark:border-white/10" />
               <div className="w-full border-t border-slate-200 dark:border-white/10 border-dashed" />
               <div className="w-full border-t border-slate-200 dark:border-white/10" />
            </div>
            
            <svg className="w-full h-full overflow-visible" viewBox="0 0 100 32" preserveAspectRatio="none">
              <polyline
                points={points}
                fill="none"
                stroke={themeColor}
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="drop-shadow-[0_12px_20px_rgba(0,0,0,0.2)]"
              />
            </svg>
            
            {/* Trend Indicator */}
            <div className="absolute right-8 top-8">
               <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-slate-800 shadow-lg border border-slate-100 dark:border-white/10">
                  <TrendingUp size={12} style={{ color: themeColor }} />
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Trend Active</span>
               </div>
            </div>
          </div>
        </div>
      </div>
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
          <section className="xl:col-span-12 rounded-[2.5rem] bg-white dark:bg-slate-900/40 shadow-xl border border-slate-200/60 dark:border-white/5 backdrop-blur-sm overflow-hidden flex flex-col">
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
                           <button 
                             disabled={!!loadingDetailsKey}
                             onClick={(e) => {
                               e.stopPropagation();
                               if (loadingDetailsKey) return;
                               
                               setLoadingDetailsKey(item.dateKey);
                               // Small delay to allow the loading spinner to render before heavy processing
                               setTimeout(() => {
                                 setSelectedDataKey(item.dateKey);
                                 setIsModalOpen(true);
                                 setLoadingDetailsKey(null);
                               }, 50);
                             }}
                             className={`inline-flex items-center gap-2 px-5 py-3.5 rounded-2xl transition-all duration-300 ${selectedDateKey === item.dateKey ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/20' : 'bg-slate-100 dark:bg-white/5 text-slate-400 group-hover:bg-teal-500/10 group-hover:text-teal-500'} ${loadingDetailsKey === item.dateKey ? 'opacity-80' : ''}`}
                           >
                              <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">
                                {loadingDetailsKey === item.dateKey ? 'Processing' : 'Details'}
                              </span>
                              {loadingDetailsKey === item.dateKey ? (
                                <Loader2 size={18} className="animate-spin" />
                              ) : (
                                <MoreHorizontal size={18} />
                              )}
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

        </div>
      </PageContainer>

      {/* Detail History Modal */}
      {isModalOpen && selectedSummary && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-modal-overlay" 
            onClick={() => setIsModalOpen(false)}
          />
          <div className="relative w-full max-w-5xl max-h-[90vh] overflow-hidden bg-white dark:bg-[#020617] rounded-[3rem] shadow-2xl border border-slate-200 dark:border-white/10 flex flex-col animate-modal-content">
            {/* Modal Header */}
            <div className="p-8 md:p-10 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50/50 dark:bg-white/5">
              <div className="flex items-center gap-5">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-500 text-white shadow-xl shadow-teal-500/20">
                  <Activity className="h-7 w-7" />
                </div>
                <div>
                  <h2 className="text-3xl md:text-4xl font-black text-slate-800 dark:text-white tracking-tight">
                    {formatDateLabel(selectedSummary.dateKey)}
                  </h2>
                  <p className="text-[11px] font-black text-teal-600 dark:text-teal-400 uppercase tracking-[0.2em] mt-1">
                    Operational Analytics • {selectedSummary.totalReadings} Readings Recorded
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-4 rounded-2xl bg-slate-100 dark:bg-white/5 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-all group"
              >
                <X size={24} className="group-hover:rotate-90 transition-transform duration-300" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-8 md:p-10 custom-scrollbar">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
                {/* Left Column: Stats & Charts */}
                <div className="lg:col-span-7 space-y-10 h-full">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="p-8 rounded-[2.5rem] bg-slate-50 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 group hover:border-teal-500/30 transition-all">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Dominant System State</p>
                      <div className="flex items-center gap-4">
                        <div className={`h-4 w-4 rounded-full ${selectedSummary.status === 'OPEN' ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]' : 'bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.5)]'}`} />
                        <p className={`text-3xl font-black uppercase tracking-tight ${selectedSummary.status === 'OPEN' ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {selectedSummary.status}
                        </p>
                      </div>
                    </div>
                    <div className="p-8 rounded-[2.5rem] bg-slate-50 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 group hover:border-teal-500/30 transition-all">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Weather Condition</p>
                      <div className="flex items-center gap-4">
                        <CloudRain className={`h-6 w-6 ${selectedSummary.rainyReadings > 0 ? 'text-blue-500' : 'text-slate-300'}`} />
                        <p className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">
                          {selectedSummary.rainyReadings} <span className="text-xs font-black text-slate-400 uppercase">Rain Hits</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {renderDominantStatusCard(selectedSummary)}

                  <div className="space-y-6">
                    <div className="flex items-center gap-3 ml-2">
                       <TrendingUp size={16} className="text-teal-500" />
                       <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">Environmental Trends</h3>
                    </div>
                    <div className="grid grid-cols-1 gap-6">
                       {renderChartCard("Thermal Variance", selectedDayMetrics.temp, "#f43f5e", "°C")}
                       {renderChartCard("Humidity Path", selectedDayMetrics.hum, "#3b82f6", "%")}
                       {renderChartCard("Photon Flux", selectedDayMetrics.light, "#fbbf24", "lx")}
                    </div>
                  </div>
                </div>

                {/* Right Column: Sequence Stream */}
                <div className="lg:col-span-5 relative">
                  <div className="sticky top-0 h-[calc(90vh-180px)] rounded-[3rem] bg-slate-50/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 p-8 flex flex-col overflow-hidden shadow-sm">
                    <div className="flex items-center gap-3 mb-8 shrink-0">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
                        <Clock className="h-5 w-5" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">Sequence Stream</h3>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                      {orderedSelectedDayHistory.length > 300 && (
                         <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest text-center mb-4 shrink-0">
                            Showing latest 300 of {orderedSelectedDayHistory.length} readings for performance
                         </div>
                      )}
                      {orderedSelectedDayHistory.slice(-300).reverse().map((item, idx) => (
                        <div key={idx} className="p-6 rounded-[1.5rem] bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-white/5 group hover:border-teal-500/40 transition-all shadow-sm shrink-0">
                           <div className="flex items-center justify-between mb-5">
                              <p className="text-sm font-black text-slate-800 dark:text-white tracking-tight">{formatTime(item.timestamp)}</p>
                              <span className={`text-[9px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest ${item.isRaining() ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'}`}>
                                 {item.isRaining() ? 'Rain' : 'Dry'}
                              </span>
                           </div>
                           <div className="grid grid-cols-2 gap-4">
                              <ReadingMetric label="Temp" value={`${item.temperature.toFixed(1)}°`} icon={<Thermometer size={12}/>} />
                              <ReadingMetric label="Humid" value={`${item.humidity.toFixed(0)}%`} icon={<Droplets size={12}/>} />
                              <ReadingMetric label="Light" value={`${item.light.toFixed(0)}`} icon={<Sun size={12}/>} />
                              <ReadingMetric label="State" value={item.status} icon={<Zap size={12}/>} />
                           </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            

          </div>
        </div>
      )}

      {/* Full-Screen Processing Overlay */}
      {loadingDetailsKey && (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-white/60 dark:bg-slate-950/60 backdrop-blur-md animate-modal-overlay">
           <div className="relative">
              <div className="h-24 w-24 rounded-full border-4 border-teal-500/20 border-t-teal-500 animate-spin" />
              <Activity className="absolute inset-0 m-auto h-8 w-8 text-teal-500 animate-pulse" />
           </div>
           <div className="mt-8 text-center">
              <p className="text-xl font-black text-slate-800 dark:text-white tracking-tight">Analyzing Archive</p>
              <p className="text-[10px] font-black text-teal-600 dark:text-teal-400 uppercase tracking-[0.2em] mt-2">Preparing detailed operational insights...</p>
           </div>
        </div>
      )}
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



