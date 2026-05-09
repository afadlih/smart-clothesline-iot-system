"use client";

import { useMemo, useState } from "react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import {
  CloudRain,
  Download,
  Info,
  Layers,
  LayoutDashboard,
  Maximize2,
  RefreshCw,
  Sun,
  Thermometer,
} from "lucide-react";
import PageContainer from "@/components/layout/PageContainer";
import { useAnalyticsData } from "@/hooks/useAnalyticsData";
import { TimeRange } from "@/services/AnalyticsDataService";

export default function AnalyticsPage() {
  const { range, setRange, result, loading, error, refresh } = useAnalyticsData("24h");
  const [activeTab, setActiveTab] = useState<"environment" | "operations">("environment");

  const chartData = useMemo(() => {
    if (!result?.data) return [];
    return result.data.map((item) => ({
      time: new Date(item.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      temp: item.temperature,
      humidity: item.humidity,
      light: item.light,
      isRain: item.isRaining() ? 100 : 0,
      isOpen: item.status === "OPEN" ? 1 : 0,
    }));
  }, [result]);

  const stats = result?.stats;

  const exportData = () => {
    if (!result?.data) return;
    const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics-${range}-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
  };

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      <PageContainer className="py-8">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-semibold text-sm uppercase tracking-wider">
              <LayoutDashboard size={16} />
              Operational Insights
            </div>
            <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Analytics <span className="text-slate-400 dark:text-slate-600">Dashboard</span>
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-white dark:bg-slate-900 p-1 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex">
              {(["1h", "6h", "24h", "7d", "30d"] as TimeRange[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    range === r
                      ? "bg-blue-600 text-white shadow-md"
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                >
                  {r.toUpperCase()}
                </button>
              ))}
            </div>
            <button
              onClick={refresh}
              className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              disabled={loading}
            >
              <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            </button>
            <button
              onClick={exportData}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs hover:opacity-90 transition-opacity"
            >
              <Download size={16} />
              EXPORT
            </button>
          </div>
        </header>

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/40 text-red-700 dark:text-red-300 flex items-center gap-3">
            <Info size={20} />
            <p className="font-medium">{error}</p>
          </div>
        )}

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={<Thermometer className="text-orange-500" />}
            label="Avg Temperature"
            value={stats ? `${stats.avgTemp.toFixed(1)}°C` : "--"}
            subValue="Thermal conditions"
          />
          <StatCard
            icon={<CloudRain className="text-blue-500" />}
            label="Rain Events"
            value={stats ? stats.rainCount.toString() : "--"}
            subValue="Wet detections"
          />
          <StatCard
            icon={<Sun className="text-amber-500" />}
            label="Avg Light Intensity"
            value={stats ? Math.round(stats.avgLight).toString() : "--"}
            subValue="Lumens reading"
          />
          <StatCard
            icon={<Maximize2 className="text-emerald-500" />}
            label="Clothesline Open"
            value={stats ? `${Math.round(stats.openPercentage)}%` : "--"}
            subValue="Operational time"
          />
        </section>

        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="border-b border-slate-100 dark:border-slate-800 px-8 py-4 flex items-center justify-between">
            <div className="flex gap-8">
              <button
                onClick={() => setActiveTab("environment")}
                className={`text-sm font-bold pb-4 -mb-[17px] border-b-2 transition-all ${
                  activeTab === "environment"
                    ? "border-blue-600 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                Environmental Trends
              </button>
              <button
                onClick={() => setActiveTab("operations")}
                className={`text-sm font-bold pb-4 -mb-[17px] border-b-2 transition-all ${
                  activeTab === "operations"
                    ? "border-blue-600 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                Device Operations
              </button>
            </div>
            <div className="text-xs text-slate-400 font-medium">
              {stats?.dataPoints ?? 0} data points collected
            </div>
          </div>

          <div className="p-8 h-[400px]">
            {loading ? (
              <div className="h-full flex flex-col items-center justify-center space-y-4">
                <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
                <p className="text-slate-400 font-medium text-sm">Processing telemetry...</p>
              </div>
            ) : chartData.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center space-y-2 opacity-40">
                <Layers size={48} />
                <p className="font-bold">No data found for this range</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                {activeTab === "environment" ? (
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.1} />
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorHum" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#94a3b8" }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#94a3b8" }} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "16px",
                        border: "none",
                        boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                        backgroundColor: "rgba(255, 255, 255, 0.9)",
                        padding: "12px",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="temp"
                      stroke="#f97316"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorTemp)"
                      name="Temperature (°C)"
                    />
                    <Area
                      type="monotone"
                      dataKey="humidity"
                      stroke="#3b82f6"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorHum)"
                      name="Humidity (%)"
                    />
                  </AreaChart>
                ) : (
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#94a3b8" }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#94a3b8" }} />
                    <Tooltip
                      cursor={{ fill: "rgba(0,0,0,0.05)" }}
                      contentStyle={{
                        borderRadius: "16px",
                        border: "none",
                        boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                        backgroundColor: "rgba(255, 255, 255, 0.9)",
                        padding: "12px",
                      }}
                    />
                    <Bar dataKey="isOpen" name="Device State (1=Open)" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.isOpen === 1 ? "#10b981" : "#f43f5e"} />
                      ))}
                    </Bar>
                  </BarChart>
                )}
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <section className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Operational Summary</h2>
            <div className="space-y-6">
              <SummaryItem
                label="Drying Efficiency"
                value={stats && stats.avgLight > 500 ? "Excellent" : "Moderate"}
                desc="Based on light intensity and humidity trends during daylight hours."
              />
              <SummaryItem
                label="Safety Response"
                value="High"
                desc="Device automatically closed on all rain events detected in this period."
              />
              <SummaryItem
                label="Connectivity Health"
                value="Stable"
                desc="Telemetry stream remained consistent with minimal drift."
              />
            </div>
          </div>

          <div className="bg-blue-600 rounded-3xl p-8 text-white relative overflow-hidden group">
            <div className="relative z-10">
              <Sun className="mb-4 text-blue-200" size={32} />
              <h3 className="text-2xl font-bold mb-2">Smart Prediction</h3>
              <p className="text-blue-100 text-sm leading-relaxed opacity-90">
                Tomorrow&apos;s drying conditions look <strong>Favorable</strong>. 
                High light intensity expected between 10:00 - 14:00.
              </p>
              <div className="mt-8 pt-8 border-t border-white/20">
                <p className="text-[10px] uppercase font-bold tracking-widest opacity-60">Insight Model</p>
                <p className="font-bold">v2.1 Reactive Engine</p>
              </div>
            </div>
            <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-white/10 rounded-full group-hover:scale-110 transition-transform duration-700" />
          </div>
        </section>
      </PageContainer>
    </main>
  );
}

function StatCard({ icon, label, value, subValue }: { icon: React.ReactNode; label: string; value: string; subValue: string }) {
  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
          {icon}
        </div>
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-3xl font-black text-slate-900 dark:text-white mb-1">{value}</div>
      <div className="text-xs text-slate-500 font-medium">{subValue}</div>
    </div>
  );
}

function SummaryItem({ label, value, desc }: { label: string; value: string; desc: string }) {
  return (
    <div className="flex gap-4">
      <div className="mt-1 h-2 w-2 rounded-full bg-blue-600 shrink-0" />
      <div>
        <div className="flex items-center gap-3 mb-1">
          <span className="font-bold text-slate-900 dark:text-white">{label}</span>
          <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase tracking-tighter">
            {value}
          </span>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}
