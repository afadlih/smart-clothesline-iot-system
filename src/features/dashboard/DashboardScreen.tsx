"use client";

import { useEffect, useState } from "react";
import {
  Zap,
  Shield,
  Clock,
  Calendar,
  Activity,
  AlertCircle,
  HelpCircle,
  History,
  ChevronDown,
  ChevronUp,
  Gauge,
  Terminal,
  Bug,
} from "lucide-react";
import EventTimeline from "@/components/events/EventTimeline";
import OperationalHealthPanel from "@/components/status/OperationalHealth";
import PageContainer from "@/components/layout/PageContainer";
import StatusBadge from "@/components/layout/StatusBadge";
import { useNotificationEngine } from "@/hooks/useNotificationEngine";
import { useSystemState } from "@/hooks/useSystemState";
import { MQTT_BROKER_URL } from "@/services/MQTTService";

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
    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300";
  if (state === "warn")
    return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";
  if (state === "danger")
    return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300";
  return "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300";
}

function sanitizeBrokerUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.username = "";
    parsed.password = "";
    return parsed.toString();
  } catch {
    return url.replace(/\/\/.*@/, "//");
  }
}

export default function DashboardScreen() {
  const {
    runtime,
    sendCommand,
    operationalHealth,
    smartAlerts,
    uiState,
    decision,
    lastUpdate,
    sensor,
    events: sensorEvents,
    serialLogs,
    mqttConnected,
    connection,
    lastSensorUpdate,
    lastStatusUpdate,
    drift,
    debug,
  } = useSystemState();
  const {
    latestAlert,
    toasts,
    dismissToast,
    events: timelineEvents,
  } = useNotificationEngine();
  const [activeDeviceId, setActiveDeviceId] = useState<string | null>(null);
  const [isTimelineExpanded, setIsTimelineExpanded] = useState(false);
  const [isEventLogsExpanded, setIsEventLogsExpanded] = useState(false);
  const ACTIVE_DEVICE_STORAGE_KEY = "smart-clothesline-active-device-id-v1";

  useEffect(() => {
    setActiveDeviceId(localStorage.getItem(ACTIVE_DEVICE_STORAGE_KEY));
  }, []);

  const deviceStatusLabel = runtime.deviceConnectivity.toUpperCase();
  const deviceStatusClass =
    runtime.deviceConnectivity === "OFFLINE" ||
    runtime.deviceConnectivity === "UNKNOWN"
      ? badgeClassByState("danger")
      : runtime.deviceConnectivity === "DELAYED"
        ? badgeClassByState("warn")
        : badgeClassByState("good");

  const realtimeLabel =
    runtime.streamState === "STREAMING"
      ? "REALTIME ACTIVE"
      : runtime.streamState === "STALE"
        ? "TELEMETRY STALE"
        : "REALTIME IDLE";

  const deviceModeLabel = runtime.actualDeviceMode.toUpperCase();
  const safetyLabel = runtime.safetyLabel;
  const safetyClass =
    runtime.decisionSource === "SAFETY"
      ? badgeClassByState("danger")
      : badgeClassByState("good");

  const displayedStatus = runtime.actualDeviceStatus ?? "--";
  const lastUpdated = formatClock(lastUpdate);
  const isCommandPending = uiState.deviceSync === "WAITING_ACK";
  const canSendCommand =
    runtime.streamState === "STREAMING" && !isCommandPending;

  const commandStatusLabel =
    uiState.deviceSync === "WAITING_ACK"
      ? "Syncing..."
      : uiState.deviceSync === "SYNCED"
        ? "Synced"
        : runtime.commandStatus === "timeout"
          ? "Failed (timeout)"
          : "Idle";
  const commandStatusClass =
    uiState.deviceSync === "WAITING_ACK"
      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
      : uiState.deviceSync === "SYNCED"
        ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
        : runtime.commandStatus === "timeout"
          ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";

  const criticalAlerts = smartAlerts.filter(
    (alert) => alert.severity === "critical",
  );
  const warningAlerts = smartAlerts.filter(
    (alert) => alert.severity === "warning",
  );
  const infoAlerts = smartAlerts.filter((alert) => alert.severity === "info");

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 transition-colors duration-300 dark:from-slate-900 dark:to-slate-950">
      <PageContainer>
        {toasts.length > 0 && (
          <div className="fixed right-4 top-20 z-50 space-y-2">
            {toasts.map((toast) => (
              <button
                key={toast.id}
                type="button"
                onClick={() => dismissToast(toast.id)}
                className="block w-80 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-left shadow dark:border-red-900/40 dark:bg-red-900/20"
              >
                <p className="text-xs font-semibold text-red-700 dark:text-red-300">
                  [ALERT] {toast.title}
                </p>
                <p className="mt-1 text-xs text-red-600 dark:text-red-200">
                  {toast.description}
                </p>
              </button>
            ))}
          </div>
        )}

        {/* <header className="mb-6 rounded-2xl border border-slate-200 bg-gradient-to-r from-blue-50 to-slate-50 p-6 shadow-sm dark:border-slate-800 dark:from-slate-800 dark:to-slate-900">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">👋</span>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Welcome back!</h1>
              </div>
              <h2 className="mt-2 text-lg font-semibold text-slate-700 dark:text-slate-200">
                Let's keep your Smart Clothesline running smoothly.
              </h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Here's an overview of your system's current status.
              </p>
            </div>
          </div> */}
        {/* <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <span className={`inline-flex items-center justify-center rounded-full px-3 py-2 text-xs font-semibold ${deviceStatusClass}`}>
              DEVICE: {deviceStatusLabel}
            </span>
            <span className={`inline-flex items-center justify-center rounded-full px-3 py-2 text-xs font-semibold ${badgeClassByState("info")}`}>
              DEVICE MODE: {deviceModeLabel}
            </span>
            <span className={`inline-flex items-center justify-center rounded-full px-3 py-2 text-xs font-semibold ${safetyClass}`}>
              {safetyLabel}
            </span>
            <span className={`inline-flex items-center justify-center rounded-full px-3 py-2 text-xs font-semibold ${decision.scheduleActive ? badgeClassByState("good") : badgeClassByState("warn")}`}>
              SCHEDULE {decision.scheduleActive ? "ACTIVE" : "INACTIVE"}
            </span>
          </div> */}
        {/* </header> */}

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Clothesline Status
            </p>
          </div>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
            <h2 className="text-4xl font-bold text-slate-900 dark:text-slate-100">
              {displayedStatus}
            </h2>
            <span className="text-sm text-slate-500 dark:text-slate-400">
              {realtimeLabel}
            </span>
          </div>
          <p className="mt-3 text-sm text-slate-700 dark:text-slate-300">
            {decision.reason}
          </p>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <StatusBadge
                icon={<Zap className="h-5 w-5" />}
                label="Device Mode"
                value={deviceModeLabel}
                valueClass="text-slate-900 dark:text-slate-100"
                dotClass={
                  deviceStatusClass.includes("danger")
                    ? "bg-red-500"
                    : deviceStatusClass.includes("warn")
                      ? "bg-amber-500"
                      : "bg-emerald-500"
                }
                iconBgClass="bg-blue-100 dark:bg-blue-900/30"
                iconTextClass="text-blue-600 dark:text-blue-400"
                title="Current operating mode"
              />
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <StatusBadge
                icon={<Shield className="h-5 w-5" />}
                label="Safety"
                value={safetyLabel}
                valueClass={
                  runtime.decisionSource === "SAFETY"
                    ? "text-red-600 dark:text-red-400"
                    : "text-emerald-600 dark:text-emerald-400"
                }
                dotClass={
                  runtime.decisionSource === "SAFETY"
                    ? "bg-red-500"
                    : "bg-emerald-500"
                }
                iconBgClass={
                  runtime.decisionSource === "SAFETY"
                    ? "bg-red-100 dark:bg-red-900/30"
                    : "bg-emerald-100 dark:bg-emerald-900/30"
                }
                iconTextClass={
                  runtime.decisionSource === "SAFETY"
                    ? "text-red-600 dark:text-red-400"
                    : "text-emerald-600 dark:text-emerald-400"
                }
                title="Safety status"
              />
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <StatusBadge
                icon={<Clock className="h-5 w-5" />}
                label="Latest Update"
                value={lastUpdated}
                valueClass="text-slate-900 dark:text-slate-100"
                dotClass="bg-blue-500"
                iconBgClass="bg-blue-100 dark:bg-blue-900/30"
                iconTextClass="text-blue-600 dark:text-blue-400"
                title={
                  runtime.freshnessSeconds === null
                    ? "Never"
                    : `${runtime.freshnessSeconds}s ago`
                }
              />
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <StatusBadge
                icon={<Calendar className="h-5 w-5" />}
                label="Schedule Window"
                value={
                  decision.activeSchedule
                    ? `${formatHourFloat(decision.activeSchedule.startHour)}-${formatHourFloat(decision.activeSchedule.endHour)}`
                    : "-"
                }
                valueClass="text-slate-900 dark:text-slate-100"
                dotClass={
                  decision.scheduleActive ? "bg-emerald-500" : "bg-slate-400"
                }
                iconBgClass="bg-purple-100 dark:bg-purple-900/30"
                iconTextClass="text-purple-600 dark:text-purple-400"
                title={
                  decision.scheduleActive
                    ? "Schedule is active"
                    : "Schedule is inactive"
                }
              />
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <div className="space-y-6 xl:col-span-8">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                  Alerts
                </h2>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                <span
                  className={`rounded-full px-3 py-1 font-semibold ${badgeClassByState("danger")}`}
                >
                  Critical {criticalAlerts.length}
                </span>
                <span
                  className={`rounded-full px-3 py-1 font-semibold ${badgeClassByState("warn")}`}
                >
                  Warning {warningAlerts.length}
                </span>
                <span
                  className={`rounded-full px-3 py-1 font-semibold ${badgeClassByState("info")}`}
                >
                  Info {infoAlerts.length}
                </span>
              </div>
              {latestAlert ? (
                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Latest Alert
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {latestAlert.title}
                  </p>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                    {latestAlert.description}
                  </p>
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
                  No active alerts.
                </p>
              )}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                  Why Did The System Change?
                </h2>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Decision Source
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {runtime.decisionSource}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Final State
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {runtime.recommendedStatus}
                  </p>
                </div>
              </div>
              <p className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
                {decision.reason}
              </p>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-2 mb-6">
                <Zap className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Control
                </p>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 mb-6">
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Device Status
                  </p>
                  <p className="mt-2 text-lg font-bold text-slate-900 dark:text-slate-100">
                    {runtime.actualDeviceStatus ?? "--"}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Device Mode
                  </p>
                  <p className="mt-2 text-lg font-bold text-slate-900 dark:text-slate-100">
                    {runtime.actualDeviceMode ?? "--"}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Last Device Command
                  </p>
                  <p className="mt-2 text-lg font-bold text-slate-900 dark:text-slate-100">
                    {runtime.lastDeviceCommand ?? "-"}
                  </p>
                </div>
              </div>

              {runtime.deviceConnectivity === "OFFLINE" && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200 mb-4">
                  Telemetry delayed — last data is stale. Commands blocked until
                  fresh data returns.
                </div>
              )}
              {runtime.deviceConnectivity === "OFFLINE" &&
                runtime.freshnessSeconds !== null && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200 mb-4">
                    Device offline or disconnected — commands blocked until MQTT
                    reconnects.
                  </div>
                )}

              <div className="flex flex-wrap items-center gap-3 mb-4">
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${commandStatusClass}`}
                >
                  Sync State: {commandStatusLabel}
                </span>
                {runtime.lastDeviceCommand &&
                  uiState.deviceSync === "WAITING_ACK" && (
                    <span className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                      Pending Command: {runtime.lastDeviceCommand}
                    </span>
                  )}
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => sendCommand("OPEN")}
                  disabled={!canSendCommand}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  OPEN
                </button>
                <button
                  type="button"
                  onClick={() => sendCommand("CLOSE")}
                  disabled={!canSendCommand}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  CLOSE
                </button>
                <button
                  type="button"
                  onClick={() => sendCommand("AUTO")}
                  disabled={!canSendCommand}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  AUTO
                </button>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-2 mb-6">
                <Activity className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Sensor Data
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Temperature
                  </p>
                  <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
                    {sensor ? `${sensor.temperature.toFixed(1)} C` : "--"}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Humidity
                  </p>
                  <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
                    {sensor ? `${sensor.humidity.toFixed(1)} %` : "--"}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Light
                  </p>
                  <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
                    {sensor ? sensor.light.toFixed(0) : "--"}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Rain
                  </p>
                  <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
                    {sensor ? (sensor.isRaining() ? "Yes" : "No") : "--"}
                  </p>
                </div>
              </div>
            </section>
{/* 
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Timeline & Event Log
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsTimelineExpanded(!isTimelineExpanded)}
                  className="flex items-center gap-1 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition"
                >
                  <span className="text-xs font-semibold uppercase tracking-wide">
                    {isTimelineExpanded ? "Show Less" : "Show All"}
                  </span>
                  {isTimelineExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>
              </div>
              
            </section> */}
            <div>
                <EventTimeline
                  events={
                    isTimelineExpanded
                      ? timelineEvents
                      : timelineEvents.slice(0, 5)
                  }
                />
              </div>
          </div>

          <aside className="space-y-4 xl:col-span-4 xl:top-24 xl:self-start">
            <OperationalHealthPanel health={operationalHealth} />

            <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-2 mb-3">
                <Terminal className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                  Serial Monitor Snapshot
                </h2>
              </div>
              <div className="mt-3 space-y-2">
                {serialLogs.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    No serial logs yet.
                  </p>
                ) : (
                  serialLogs.slice(0, 8).map((log) => (
                    <div
                      key={log.id}
                      className="rounded-lg border border-gray-200 bg-gray-50 p-2 dark:border-slate-700 dark:bg-slate-800/60"
                    >
                      <p className="text-[11px] text-gray-500 dark:text-slate-400">
                        {new Date(log.timestamp).toLocaleTimeString("en-US")}
                      </p>
                      <p className="text-xs font-medium text-gray-800 dark:text-slate-100">
                        {log.message}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-2 mb-3">
                <Bug className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                  Debug Mini
                </h2>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[11px] text-gray-500 dark:text-slate-400">
                    MQTT State
                  </p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                    {connection.state}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-500 dark:text-slate-400">
                    MQTT Connected
                  </p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                    {mqttConnected ? "Yes" : "No"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-500 dark:text-slate-400">
                    Active Device
                  </p>
                  <p className="break-all text-sm font-semibold text-gray-900 dark:text-slate-100">
                    {activeDeviceId ?? "Not selected"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-500 dark:text-slate-400">
                    Last Sensor
                  </p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                    {formatClock(lastSensorUpdate)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-500 dark:text-slate-400">
                    Last Status
                  </p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                    {formatClock(lastStatusUpdate)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-500 dark:text-slate-400">
                    Drift
                  </p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                    {drift === null ? "--" : `${drift} ms`}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-500 dark:text-slate-400">
                    UI Stream
                  </p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                    {uiState.stream}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-500 dark:text-slate-400">
                    Last ACK Result
                  </p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                    {debug.lastAckResult}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-500 dark:text-slate-400">
                    Deduped Status
                  </p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                    {debug.dedupedStatusCount}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-500 dark:text-slate-400">
                    State Source
                  </p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                    {debug.deviceStateSource}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-500 dark:text-slate-400">
                    Duplicate Telemetry
                  </p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                    {debug.mqttDiagnostics.duplicateCount}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-500 dark:text-slate-400">
                    Rejected Payloads
                  </p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                    {debug.mqttDiagnostics.rejectedCount}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-500 dark:text-slate-400">
                    Filtered Device Payloads
                  </p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                    {debug.mqttDiagnostics.filteredDeviceCount}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-500 dark:text-slate-400">
                    Last Reject Reason
                  </p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                    {debug.mqttDiagnostics.lastRejectReason ?? "--"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-500 dark:text-slate-400">
                    Last Sensor Payload
                  </p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                    {formatClock(debug.mqttDiagnostics.lastSensorAt)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-500 dark:text-slate-400">
                    Last Status Payload
                  </p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                    {formatClock(debug.mqttDiagnostics.lastStatusAt)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-500 dark:text-slate-400">
                    Heartbeat Age
                  </p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                    {debug.mqttDiagnostics.heartbeatAgeSeconds === null
                      ? "--"
                      : `${debug.mqttDiagnostics.heartbeatAgeSeconds}s`}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-500 dark:text-slate-400">
                    Freshness
                  </p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                    {debug.mqttDiagnostics.freshnessSeconds === null
                      ? "--"
                      : `${debug.mqttDiagnostics.freshnessSeconds}s`}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-500 dark:text-slate-400">
                    Sensor Topic
                  </p>
                  <p className="break-all text-sm font-semibold text-gray-900 dark:text-slate-100">
                    smart-clothesline/sensor
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-500 dark:text-slate-400">
                    Status Topic
                  </p>
                  <p className="break-all text-sm font-semibold text-gray-900 dark:text-slate-100">
                    smart-clothesline/status
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-[11px] text-gray-500 dark:text-slate-400">
                    MQTT Broker
                  </p>
                  <p className="break-all text-sm font-semibold text-gray-900 dark:text-slate-100">
                    {sanitizeBrokerUrl(MQTT_BROKER_URL)}
                  </p>
                </div>
              </div>
              <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-2 dark:border-slate-700 dark:bg-slate-800/60">
                <p className="text-[11px] text-gray-500 dark:text-slate-400">
                  Last Transition
                </p>
                <p className="mt-1 text-xs font-semibold text-gray-800 dark:text-slate-100">
                  {debug.lastTransition ?? "--"}
                </p>
                <p className="mt-1 text-[11px] text-gray-500 dark:text-slate-400">
                  {debug.lastTransitionAt
                    ? new Date(debug.lastTransitionAt).toLocaleTimeString(
                        "en-US",
                      )
                    : "--"}
                </p>
              </div>
            </section>

            <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                    Event Logs
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEventLogsExpanded(!isEventLogsExpanded)}
                  className="flex items-center gap-1 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition"
                >
                  <span className="text-xs font-semibold uppercase tracking-wide">
                    {isEventLogsExpanded ? "Show Less" : "Show All"}
                  </span>
                  {isEventLogsExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>
              </div>
              <div className="space-y-2">
                {sensorEvents.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    No events yet.
                  </p>
                ) : (
                  (isEventLogsExpanded
                    ? sensorEvents
                    : sensorEvents.slice(0, 5)
                  ).map((event, index) => (
                    <p
                      key={`${event.timestamp}-${event.type}-${index}`}
                      className="text-xs text-gray-700 dark:text-slate-300"
                    >
                      [
                      {new Date(event.timestamp).toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                      ] {event.type} - {event.action}
                    </p>
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
