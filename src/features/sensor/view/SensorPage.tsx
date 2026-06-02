"use client";

import { Activity, Cpu, Database, Zap } from "lucide-react";
import ChartSection from "@/components/charts/ChartSection";
import SensorCard from "@/components/cards/SensorCard";
import OperationalHealthPanel from "@/components/status/OperationalHealth";
import StatusPanel from "@/components/status/StatusPanel";
import PageContainer from "@/components/layout/PageContainer";
import { useSystemState } from "@/hooks/useSystemState";

export default function SensorMonitorPage() {
  const { sensor, history, serialLogs, status, isOnline, uiState, operationalHealth, debug } = useSystemState();
  
  const connectionLabel = isOnline ? "CONNECTED" : "OFFLINE";
  const connectionClass = isOnline
    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]"
    : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20";
  
  const streamLabel =
    uiState.connection === "DISCONNECTED"
      ? "SYSTEM OFFLINE"
      : uiState.stream === "NO_DATA"
        ? "WAITING FOR DEVICE"
        : uiState.stream === "STALE"
          ? "LATENCY DETECTED"
          : "REALTIME STREAM ACTIVE";

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
                  <Activity className="h-5 w-5" />
                </div>
                <span className="text-[11px] font-black uppercase tracking-[0.25em] text-teal-600 dark:text-teal-400">
                  Telemetry Center
                </span>
              </div>
              <h1 className="text-4xl font-black text-slate-800 dark:text-white tracking-tight">Operational Monitoring</h1>
              <div className="flex items-center gap-3">
                <div className={`h-2 w-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-500'}`} />
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                  {streamLabel}
                </span>
              </div>
            </div>

            <div className={`px-6 py-3 rounded-2xl flex items-center gap-3 font-black text-sm tracking-widest ${connectionClass}`}>
               <Cpu className="h-4 w-4" />
               {connectionLabel}
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Main Content Area */}
          <div className="space-y-8 lg:col-span-8">
            <StatusPanel status={status ?? "--"} reason="Real-time mechanical state synchronized with hardware sensors." />

            <section className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <SensorCard title="Temperature" value={sensor ? `${sensor.temperature.toFixed(1)}°C` : "--"} subtitle="Ambient sensor data" />
              <SensorCard title="Humidity" value={sensor ? `${sensor.humidity.toFixed(1)}%` : "--"} subtitle="Relative humidity level" />
              <SensorCard title="Light Intensity" value={sensor ? sensor.light.toFixed(0) : "--"} subtitle={sensor?.isDark() ? "Low light environment" : "Sufficient sunlight"} accent={sensor?.isDark() ? "warning" : undefined} />
              <SensorCard title="Rain Probability" value={sensor ? (sensor.isRaining() ? "DETECTED" : "CLEAR") : "--"} subtitle={sensor?.isRaining() ? "Immediate action required" : "Safe for laundry"} accent={sensor?.isRaining() ? "danger" : undefined} />
            </section>

            <div className="rounded-[2rem] bg-white dark:bg-slate-900/40 p-8 shadow-xl border border-slate-200/60 dark:border-white/5 backdrop-blur-sm">
                <div className="flex items-center gap-3 mb-8">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
                    <Zap className="h-5 w-5" />
                  </div>
                  <h2 className="text-lg font-bold text-slate-800 dark:text-white tracking-tight">Environmental History</h2>
                </div>
                <ChartSection history={history} />
            </div>
          </div>

          {/* Sidebar Area */}
          <aside className="space-y-8 lg:col-span-4">
            <OperationalHealthPanel health={operationalHealth} />

            <section className="rounded-[2rem] bg-white dark:bg-slate-900/40 p-8 shadow-xl border border-slate-200/60 dark:border-white/5 backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-6">
                <Database className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                <h2 className="text-lg font-bold text-slate-800 dark:text-white tracking-tight">Device Console</h2>
              </div>
              
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {serialLogs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 opacity-30">
                    <Database className="h-10 w-10 mb-2" />
                    <p className="text-xs font-bold uppercase tracking-widest text-center">No logs recorded</p>
                  </div>
                ) : (
                  serialLogs.map((log) => (
                    <div key={log.id} className="rounded-2xl bg-slate-50 dark:bg-white/5 p-4 border border-slate-200/50 dark:border-white/5 group">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{new Date(log.timestamp).toLocaleTimeString()}</span>
                        <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${log.level === "WARN" ? "bg-amber-500/10 text-amber-500" : "bg-emerald-500/10 text-emerald-500"}`}>
                          {log.level}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-200 font-mono leading-relaxed">
                        {log.message}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </section>

            <details className="group rounded-[2rem] bg-white dark:bg-slate-900/40 shadow-xl border border-slate-200/60 dark:border-white/5 backdrop-blur-sm overflow-hidden">
              <summary className="cursor-pointer list-none p-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 group-open:bg-teal-500/10 group-open:text-teal-500 transition-colors">
                      <Cpu className="h-4 w-4" />
                    </div>
                    <h2 className="text-sm font-bold text-slate-800 dark:text-white tracking-tight">Internal Diagnostics</h2>
                  </div>
                  <div className="h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-700 group-open:bg-teal-500 group-open:animate-pulse" />
                </div>
              </summary>
              <div className="px-8 pb-8 space-y-6 animate-in slide-in-from-top-2 duration-300">
                <div className="grid grid-cols-1 gap-4">
                  <DiagItem label="Last ACK Result" value={debug.lastAckResult} />
                  <DiagItem label="Deduped Count" value={debug.dedupedStatusCount.toString()} />
                  <DiagItem label="Last Transition" value={debug.lastTransition ?? "--"} />
                </div>
              </div>
            </details>
          </aside>
        </div>
      </PageContainer>
    </main>
  );
}

function DiagItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 dark:bg-white/5 p-4 border border-slate-200/50 dark:border-white/5">
       <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{label}</p>
       <p className="text-sm font-bold text-slate-800 dark:text-white">{value}</p>
    </div>
  );
}