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
import { BarChart3, Download, RefreshCw, TrendingUp, Zap, Thermometer, Droplets, Sun as SunIcon, ShieldCheck, Database } from "lucide-react";
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
    <main className="min-h-screen bg-[#f8fafc] dark:bg-[#020617] transition-colors duration-500 pb-20">
      <PageContainer className="space-y-8">
        {/* Header Section */}
        <header className="relative overflow-hidden rounded-[2.5rem] bg-white dark:bg-slate-900/50 p-8 md:p-10 shadow-2xl border border-slate-200/60 dark:border-white/5 backdrop-blur-sm">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-teal-500/10 blur-[80px]" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500 text-white shadow-lg shadow-teal-500/20">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <span className="text-[11px] font-black uppercase tracking-[0.25em] text-teal-600 dark:text-teal-400">
                  Strategic Insights
                </span>
              </div>
              <h1 className="text-4xl font-black text-slate-800 dark:text-white tracking-tight">System Analytics</h1>
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Advanced telemetry processing and trend analysis.</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex bg-slate-100 dark:bg-white/5 p-1.5 rounded-2xl border border-slate-200 dark:border-white/5">
                {(["1h", "6h", "24h", "7d", "30d"] as TimeRange[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => setRange(r)}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      range === r
                        ? "bg-white dark:bg-teal-500 text-teal-600 dark:text-white shadow-sm"
                        : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <button onClick={refresh} disabled={loading} className="p-3 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 shadow-sm hover:bg-slate-50 dark:hover:bg-white/10 transition-colors">
                <RefreshCw className={`h-4 w-4 text-slate-500 ${loading ? "animate-spin" : ""}`} />
              </button>
              <button onClick={exportData} disabled={!result?.data?.length} className="flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-900 dark:bg-teal-600 text-white font-black text-[10px] tracking-widest uppercase hover:opacity-90 transition-all disabled:opacity-50">
                <Download className="h-4 w-4" /> Export
              </button>
            </div>
          </div>
        </header>

        {error && (
          <div className="rounded-[2rem] border border-rose-200 bg-rose-50 p-6 dark:border-rose-900/40 dark:bg-rose-900/20 flex items-center justify-between">
            <p className="text-sm font-bold text-rose-700 dark:text-rose-300">{error}</p>
            <button onClick={refresh} className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-black uppercase tracking-widest">Retry</button>
          </div>
        )}

        <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <MetricCard label="Avg Temp" value={formatMetric(result?.stats.avgTemp, "°C", 1)} icon={<Thermometer className="h-4 w-4" />} color="rose" />
          <MetricCard label="Avg Humidity" value={formatMetric(result?.stats.avgHumidity, "%", 1)} icon={<Droplets className="h-4 w-4" />} color="blue" />
          <MetricCard label="Avg Light" value={formatMetric(result?.stats.avgLight, "", 0)} icon={<SunIcon className="h-4 w-4" />} color="amber" />
          <MetricCard label="Rain Events" value={String(result?.stats.rainCount ?? 0)} icon={<Zap className="h-4 w-4" />} color="indigo" />
          <MetricCard label="Data Density" value={String(result?.stats.dataPoints ?? 0)} icon={<Database className="h-4 w-4" />} color="slate" />
          <MetricCard label="System Efficiency" value={formatMetric(result?.stats.openPercentage, "%", 0)} icon={<ShieldCheck className="h-4 w-4" />} color="emerald" />
        </section>

        <section className="rounded-[2.5rem] bg-white dark:bg-slate-900/40 p-8 shadow-xl border border-slate-200/60 dark:border-white/5 backdrop-blur-sm">
           <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
              <div className="flex items-center gap-4">
                 <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 shrink-0">
                    <TrendingUp className="h-6 w-6" />
                 </div>
                 <div>
                    <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Temporal Analysis</h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Environmental vs Operational Trends</p>
                 </div>
              </div>
              <div className="flex bg-slate-100 dark:bg-white/5 p-1.5 rounded-2xl border border-slate-200 dark:border-white/5 w-full md:w-auto">
                 <button 
                   onClick={() => setActiveTab("environment")} 
                   className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'environment' ? 'bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 shadow-lg shadow-teal-500/5' : 'text-slate-400 hover:text-slate-600'}`}
                 >
                   Environment
                 </button>
                 <button 
                   onClick={() => setActiveTab("operations")} 
                   className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'operations' ? 'bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 shadow-lg shadow-teal-500/5' : 'text-slate-400 hover:text-slate-600'}`}
                 >
                   Operations
                 </button>
              </div>
           </div>

           <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                 {activeTab === "environment" ? (
                    <AreaChart data={chartData}>
                       <defs>
                          <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/><stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/></linearGradient>
                          <linearGradient id="colorHumid" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient>
                       </defs>
                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "#ffffff08" : "#00000008"} />
                       <XAxis dataKey="time" tick={{ fontSize: 10, fontWeight: 700 }} minTickGap={30} stroke={isDark ? "#ffffff20" : "#00000020"} />
                       <YAxis tick={{ fontSize: 10, fontWeight: 700 }} stroke={isDark ? "#ffffff20" : "#00000020"} />
                       <Tooltip contentStyle={getTooltipStyle(isDark)} />
                       <Area type="monotone" dataKey="temp" stroke="#f43f5e" strokeWidth={3} fillOpacity={1} fill="url(#colorTemp)" name="Temperature" />
                       <Area type="monotone" dataKey="humidity" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorHumid)" name="Humidity" />
                    </AreaChart>
                 ) : (
                    <BarChart data={chartData}>
                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "#ffffff08" : "#00000008"} />
                       <XAxis dataKey="time" tick={{ fontSize: 10, fontWeight: 700 }} minTickGap={30} stroke={isDark ? "#ffffff20" : "#00000020"} />
                       <YAxis tick={{ fontSize: 10, fontWeight: 700 }} stroke={isDark ? "#ffffff20" : "#00000020"} />
                       <Tooltip contentStyle={getTooltipStyle(isDark)} />
                       <Bar dataKey="isOpen" radius={[4, 4, 0, 0]} name="System State">
                          {chartData.map((row, idx) => (
                             <Cell key={idx} fill={row.isOpen ? "#10b981" : "#f43f5e"} />
                          ))}
                       </Bar>
                    </BarChart>
                 )}
              </ResponsiveContainer>
           </div>
        </section>
      </PageContainer>
    </main>
  );
}

function MetricCard({ label, value, icon, color }: { label: string; value: string; icon: React.ReactNode; color: string }) {
  const colors: Record<string, string> = {
    rose: "text-rose-500 bg-rose-500/10",
    blue: "text-blue-500 bg-blue-500/10",
    amber: "text-amber-500 bg-amber-500/10",
    indigo: "text-indigo-500 bg-indigo-500/10",
    slate: "text-slate-500 bg-slate-500/10",
    emerald: "text-emerald-500 bg-emerald-500/10",
  };
  return (
    <div className="p-6 rounded-[2rem] bg-white dark:bg-slate-900/40 shadow-xl border border-slate-200/60 dark:border-white/5 backdrop-blur-sm group hover:border-teal-500/30 transition-all">
      <div className="flex items-center gap-4">
         <div className={`p-3 rounded-2xl ${colors[color]}`}>{icon}</div>
         <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{label}</p>
            <p className="text-2xl font-black text-slate-800 dark:text-white leading-none tracking-tight">{value}</p>
         </div>
      </div>
    </div>
  );
}
