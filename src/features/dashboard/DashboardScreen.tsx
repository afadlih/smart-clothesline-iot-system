"use client";

import { useState } from "react";
import {
  Zap,
  Shield,
  Clock,
  Calendar,
  Activity,
  AlertCircle,
  History,
} from "lucide-react";
import OperationalHealthPanel from "@/components/status/OperationalHealth";
import PageContainer from "@/components/layout/PageContainer";
import StatusBadge from "@/components/layout/StatusBadge";
import { useNotificationEngine } from "@/hooks/useNotificationEngine";
import { useSystemState } from "@/hooks/useSystemState";

function formatClock(value: number | null): string {
  if (value === null) {
    return "--";
  }

  return new Date(value).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatHourFloat(value: number): string {
  const h = Math.floor(value);
  const m = Math.round((value - h) * 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function badgeClassByState(state: "good" | "warn" | "danger" | "info"): string {
  if (state === "good")
    return "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-500/20";
  if (state === "warn")
    return "bg-amber-500/10 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-500/20";
  if (state === "danger")
    return "bg-rose-500/10 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-500/20";
  return "bg-teal-500/10 text-teal-600 dark:bg-teal-500/10 dark:text-teal-400 border border-teal-500/20";
}


export default function DashboardScreen() {
  const {
    runtime,
    sendCommand,
    commandGuard,
    operationalHealth,
    uiState,
    decision,
    lastUpdate,
    sensor,
    // serialLogs,
    // connection,
    // drift,
    // debug,
  } = useSystemState();
  const {
    // latestAlert,
    toasts,
    dismissToast,
    events: timelineEvents,
  } = useNotificationEngine();
  // const [activeDeviceId, setActiveDeviceId] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isTimelineExpanded, _setIsTimelineExpanded] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isEventLogsExpanded, _setIsEventLogsExpanded] = useState(false);
  // const ACTIVE_DEVICE_STORAGE_KEY = "smart-clothesline-active-device-id-v1";

  // useEffect(() => {
  //   setActiveDeviceId(localStorage.getItem(ACTIVE_DEVICE_STORAGE_KEY));
  // }, []);

  const deviceStatusClass =
    runtime.deviceConnectivity === "OFFLINE" ||
      runtime.deviceConnectivity === "UNKNOWN"
      ? badgeClassByState("danger")
      : runtime.deviceConnectivity === "DELAYED"
        ? badgeClassByState("warn")
        : badgeClassByState("good");

  const realtimeLabel =
    runtime.streamState === "STREAMING"
      ? "LIVE TELEMETRY"
      : runtime.streamState === "STALE"
        ? "TELEMETRY STALE"
        : "OFFLINE";

  const deviceModeLabel = runtime.actualDeviceMode.toUpperCase();
  const safetyLabel = runtime.safetyLabel;

  const displayedStatus = runtime.actualDeviceStatus ?? "--";
  const lastUpdated = formatClock(lastUpdate);
  const isCommandPending = uiState.deviceSync === "WAITING_ACK";
  const canSendCommand =
    runtime.streamState === "STREAMING" && !isCommandPending && commandGuard.canSendCommand;
  const openDisabled = !canSendCommand || commandGuard.disabledCommands.includes("OPEN");
  const closeDisabled = !canSendCommand || commandGuard.disabledCommands.includes("CLOSE");
  const autoDisabled = !canSendCommand || commandGuard.disabledCommands.includes("AUTO");

  const commandStatusLabel =
    uiState.deviceSync === "WAITING_ACK"
      ? "SYNCING..."
      : uiState.deviceSync === "SYNCED"
        ? "SYNCED"
        : runtime.commandStatus === "timeout"
          ? "TIMEOUT"
          : "READY";
  const commandStatusClass =
    uiState.deviceSync === "WAITING_ACK"
      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
      : uiState.deviceSync === "SYNCED"
        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
        : runtime.commandStatus === "timeout"
          ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
          : "bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20";


  return (
    <main className="min-h-screen bg-[#f8fafc] dark:bg-[#020617] transition-colors duration-500 pb-20">
      <PageContainer>
        {toasts.length > 0 && (
          <div className="fixed right-6 top-24 z-50 space-y-3">
            {toasts.map((toast) => (
              <button
                key={toast.id}
                type="button"
                onClick={() => dismissToast(toast.id)}
                className="block w-80 rounded-2xl border border-rose-200 bg-white/95 p-4 text-left shadow-2xl backdrop-blur-xl dark:border-rose-500/20 dark:bg-slate-900/95 animate-in slide-in-from-right-10 duration-300"
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-rose-600 dark:text-rose-400">
                    System Alert
                  </p>
                </div>
                <p className="text-sm font-bold text-slate-800 dark:text-white">
                  {toast.title}
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {toast.description}
                </p>
              </button>
            ))}
          </div>
        )}

        {/* Hero Status Section */}
        <div className="mb-8">
          <section className="relative overflow-hidden rounded-[2.5rem] bg-white dark:bg-slate-900/50 p-8 md:p-10 shadow-2xl shadow-teal-500/5 border border-slate-200/60 dark:border-white/5 backdrop-blur-sm">
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-teal-500/10 blur-[80px]" />
            <div className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-emerald-500/5 blur-[80px]" />

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500 text-white shadow-lg shadow-teal-500/20">
                    <Activity className="h-5 w-5" />
                  </div>
                  <span className="text-[11px] font-black uppercase tracking-[0.25em] text-teal-600 dark:text-teal-400">
                    Clothesline Overview
                  </span>
                </div>
                <h2 className="text-6xl md:text-7xl font-black text-slate-800 dark:text-white tracking-tighter">
                  {displayedStatus}
                </h2>
                <div className="flex items-center gap-3">
                  <div className={`h-2 w-2 rounded-full ${runtime.streamState === 'STREAMING' ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-400'}`} />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                    {realtimeLabel}
                  </span>
                </div>
              </div>

            </div>

            <div className="relative z-10 mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatusBadge
                icon={<Zap className="h-5 w-5" />}
                label="Active Mode"
                value={deviceModeLabel}
                valueClass="text-slate-800 dark:text-white"
                dotClass={deviceStatusClass.includes("rose") ? "bg-rose-500" : deviceStatusClass.includes("amber") ? "bg-amber-500" : "bg-emerald-500"}
                iconBgClass="bg-teal-500/10"
                iconTextClass="text-teal-600 dark:text-teal-400"
                title="Current operating mode"
              />
              <StatusBadge
                icon={<Shield className="h-5 w-5" />}
                label="Environmental Guard"
                value={safetyLabel}
                valueClass={runtime.decisionSource === "SAFETY" ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}
                dotClass={runtime.decisionSource === "SAFETY" ? "bg-rose-500" : "bg-emerald-500"}
                iconBgClass={runtime.decisionSource === "SAFETY" ? "bg-rose-500/10" : "bg-emerald-500/10"}
                iconTextClass={runtime.decisionSource === "SAFETY" ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}
                title="Automated safety protocols"
              />
              <StatusBadge
                icon={<Clock className="h-5 w-5" />}
                label="Heartbeat"
                value={lastUpdated}
                valueClass="text-slate-800 dark:text-white"
                dotClass="bg-teal-500"
                iconBgClass="bg-teal-500/10"
                iconTextClass="text-teal-600 dark:text-teal-400"
                title={runtime.freshnessSeconds === null ? "Never" : `${runtime.freshnessSeconds}s ago`}
              />
              <StatusBadge
                icon={<Calendar className="h-5 w-5" />}
                label="Active Schedule"
                value={decision.activeSchedule ? `${formatHourFloat(decision.activeSchedule.startHour)} - ${formatHourFloat(decision.activeSchedule.endHour)}` : "Not Configured"}
                valueClass="text-slate-800 dark:text-white"
                dotClass={decision.scheduleActive ? "bg-emerald-500" : "bg-slate-400"}
                iconBgClass="bg-emerald-500/10"
                iconTextClass="text-emerald-600 dark:text-emerald-400"
                title={decision.scheduleActive ? "Schedule is active" : "Schedule is inactive"}
              />
            </div>
          </section>
        </div>

        <div className="grid grid-cols-1 gap-8 xl:grid-cols-12">
          {/* Main Controls & Data */}
          <div className="flex flex-col gap-8 xl:col-span-8">

            {/* Control Panel */}
            <section className="rounded-[2rem] bg-white dark:bg-slate-900/40 p-8 shadow-xl border border-slate-200/60 dark:border-white/5 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
                    <Zap className="h-5 w-5" />
                  </div>
                  <h2 className="text-lg font-bold text-slate-800 dark:text-white tracking-tight">System Control</h2>
                </div>
                <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] ${commandStatusClass}`}>
                  {commandStatusLabel}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <div className="rounded-2xl bg-slate-50 dark:bg-white/5 p-5 border border-slate-200/50 dark:border-white/5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">State</p>
                  <p className="text-xl font-black text-slate-800 dark:text-white uppercase">{runtime.actualDeviceStatus ?? "--"}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 dark:bg-white/5 p-5 border border-slate-200/50 dark:border-white/5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Mode</p>
                  <p className="text-xl font-black text-slate-800 dark:text-white uppercase">{runtime.actualDeviceMode ?? "--"}</p>
                </div>
              </div>

              {runtime.deviceConnectivity === "OFFLINE" && (
                <div className="mb-6 flex items-center gap-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 p-4 text-sm font-bold text-rose-600 dark:text-rose-400">
                  <AlertCircle className="h-5 w-5" />
                  Commands blocked: Device is currently offline.
                </div>
              )}
              {!canSendCommand && (
                <div className="mb-6 flex items-center gap-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 p-4 text-sm font-bold text-amber-700 dark:text-amber-300">
                  <AlertCircle className="h-5 w-5" />
                  {commandGuard.reason}
                </div>
              )}

              <div className="flex flex-wrap gap-4">
                <button
                  onClick={() => sendCommand("OPEN")}
                  disabled={openDisabled}
                  className="flex-1 min-w-[120px] rounded-2xl bg-teal-600 py-4 text-sm font-black text-white shadow-lg shadow-teal-600/20 transition-all hover:bg-teal-700 hover:-translate-y-0.5 active:scale-95 disabled:opacity-40 disabled:hover:translate-y-0 uppercase tracking-widest"
                >
                  Open
                </button>
                <button
                  onClick={() => sendCommand("CLOSE")}
                  disabled={closeDisabled}
                  className="flex-1 min-w-[120px] rounded-2xl bg-slate-800 py-4 text-sm font-black text-white shadow-lg shadow-slate-800/20 transition-all hover:bg-slate-900 hover:-translate-y-0.5 active:scale-95 disabled:opacity-40 disabled:hover:translate-y-0 uppercase tracking-widest"
                >
                  Close
                </button>
                <button
                  onClick={() => sendCommand("AUTO")}
                  disabled={autoDisabled}
                  className="flex-1 min-w-[120px] rounded-2xl bg-emerald-600 py-4 text-sm font-black text-white shadow-lg shadow-emerald-600/20 transition-all hover:bg-emerald-700 hover:-translate-y-0.5 active:scale-95 disabled:opacity-40 disabled:hover:translate-y-0 uppercase tracking-widest"
                >
                  Auto
                </button>
              </div>
            </section>

            {/* Sensor Grid */}
            <section className="flex-1 flex flex-col rounded-[2rem] bg-white dark:bg-slate-900/40 p-8 shadow-xl border border-slate-200/60 dark:border-white/5 backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-8">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
                  <Activity className="h-5 w-5" />
                </div>
                <h2 className="text-lg font-bold text-slate-800 dark:text-white tracking-tight">Environmental Telemetry</h2>
              </div>

              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="flex flex-col justify-center rounded-2xl bg-slate-50 dark:bg-white/5 p-6 border border-slate-200/50 dark:border-white/5 group hover:border-teal-500/50 transition-colors">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Temperature</p>
                  <p className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">
                    {sensor ? `${sensor.temperature.toFixed(1)}°C` : "--"}
                  </p>
                </div>
                <div className="flex flex-col justify-center rounded-2xl bg-slate-50 dark:bg-white/5 p-6 border border-slate-200/50 dark:border-white/5 group hover:border-teal-500/50 transition-colors">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Humidity</p>
                  <p className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">
                    {sensor ? `${sensor.humidity.toFixed(1)}%` : "--"}
                  </p>
                </div>
                <div className="flex flex-col justify-center rounded-2xl bg-slate-50 dark:bg-white/5 p-6 border border-slate-200/50 dark:border-white/5 group hover:border-teal-500/50 transition-colors">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Light Intensity</p>
                  <p className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">
                    {sensor ? sensor.light.toFixed(0) : "--"}
                  </p>
                </div>
                <div className="flex flex-col justify-center rounded-2xl bg-slate-50 dark:bg-white/5 p-6 border border-slate-200/50 dark:border-white/5 group hover:border-teal-500/50 transition-colors">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Rain Detection</p>
                  <p className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">
                    {sensor ? (sensor.isRaining() ? "YES" : "NO") : "--"}
                  </p>
                </div>
              </div>
            </section>

          </div>

          {/* Right Sidebar - System Health & Activity Log */}
          <aside className="flex flex-col gap-8 xl:col-span-4">
            <OperationalHealthPanel health={operationalHealth} />

            <section className="flex-1 flex flex-col rounded-[2rem] bg-white dark:bg-slate-900/40 p-8 shadow-xl border border-slate-200/60 dark:border-white/5 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <History className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                  <h2 className="text-lg font-bold text-slate-800 dark:text-white tracking-tight">Activity Log</h2>
                </div>
                <button onClick={() => _setIsTimelineExpanded(!isTimelineExpanded)} className="text-[10px] font-black uppercase tracking-widest text-teal-600 hover:text-teal-700">
                  {isTimelineExpanded ? 'Show Less' : 'View All'}
                </button>
              </div>

              <div className="space-y-4">
                {timelineEvents.slice(0, isTimelineExpanded ? 10 : 3).map((event, idx) => (
                  <div key={idx} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="h-2 w-2 rounded-full bg-teal-500 shadow-[0_0_8px_rgba(20,184,166,0.5)]" />
                      {idx < (isTimelineExpanded ? 9 : 2) && <div className="h-full w-px bg-slate-200 dark:bg-white/10 mt-1" />}
                    </div>
                    <div className="pb-4">
                      <p className="text-xs font-bold text-slate-800 dark:text-white leading-none mb-1">{event.title}</p>
                      <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">{new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </PageContainer>
    </main>
  );
}


