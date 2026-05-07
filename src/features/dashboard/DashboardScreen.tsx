"use client";

import { useEffect, useState } from "react";
import EventTimeline from "@/components/events/EventTimeline";
import OperationalHealthPanel from "@/components/status/OperationalHealth";
import PageContainer from "@/components/layout/PageContainer";
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
  if (state === "good") return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300";
  if (state === "warn") return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";
  if (state === "danger") return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300";
  return "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300";
}

export default function DashboardScreen() {
  const {
    sensor,
    connection,
    status,
    mode,
    lastCommand,
    isOnline,
    isStreaming,
    mqttConnected,
    lastUpdate,
    lastSensorUpdate,
    lastStatusUpdate,
    debug,
    pendingCommand,
    commandStatus,
    events,
    serialLogs,
    uiState,
    drift,
    decision,
    sendCommand,
    operationalHealth,
    smartAlerts,
  } = useSystemState();
  const { events: timelineEvents, latestAlert, toasts, dismissToast } = useNotificationEngine();
  const [activeDeviceId, setActiveDeviceId] = useState<string | null>(null);

  useEffect(() => {
    setActiveDeviceId(localStorage.getItem(ACTIVE_DEVICE_STORAGE_KEY));
  }, [])

  const heartbeatAgeSec = lastUpdate === null ? null : Math.max(0, Math.floor((Date.now() - lastUpdate) / 1000));
  const deviceStatusLabel =
    heartbeatAgeSec === null
      ? "OFFLINE"
      : heartbeatAgeSec > 30
        ? "OFFLINE"
        : heartbeatAgeSec > 15
          ? "DATA DELAYED"
          : "ONLINE";
  const deviceStatusClass =
    deviceStatusLabel === "OFFLINE"
      ? badgeClassByState("danger")
      : deviceStatusLabel === "DATA DELAYED"
        ? badgeClassByState("warn")
        : badgeClassByState("good");
  const realtimeLabel = uiState.stream === "STREAMING" ? "REALTIME ACTIVE" : "REALTIME IDLE";

  const systemModeLabel =
    decision.decisionSource === "MANUAL"
      ? "MANUAL"
      : decision.decisionSource === "SCHEDULE"
        ? "SCHEDULE"
        : "AUTO";
  const safetyLabel =
    decision.decisionSource === "SAFETY"
      ? decision.reason.toLowerCase().includes("rain")
        ? "RAIN DETECTED"
        : decision.reason.toLowerCase().includes("light")
          ? "LOW LIGHT"
          : "OVERRIDE"
      : "SAFE";
  const safetyClass = decision.decisionSource === "SAFETY" ? badgeClassByState("danger") : badgeClassByState("good");

  const displayedStatus = status ?? "--";
  const lastUpdated = formatClock(lastUpdate);

  const ACTIVE_DEVICE_STORAGE_KEY = "smart-clothesline-active-device-id-v1";

  const isCommandPending = uiState.deviceSync === "WAITING_ACK";
  const canSendCommand = isStreaming && !isCommandPending;
  const commandStatusLabel =
    uiState.deviceSync === "WAITING_ACK"
      ? "Syncing..."
      : uiState.deviceSync === "SYNCED"
        ? "Synced"
        : commandStatus === "timeout"
          ? "Failed (timeout)"
          : "Idle";
  const commandStatusClass =
    uiState.deviceSync === "WAITING_ACK"
      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
      : uiState.deviceSync === "SYNCED"
        ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
        : commandStatus === "timeout"
          ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";
  const criticalAlerts = smartAlerts.filter((alert) => alert.severity === "critical");
  const warningAlerts = smartAlerts.filter((alert) => alert.severity === "warning");
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
                <p className="text-xs font-semibold text-red-700 dark:text-red-300">[ALERT] {toast.title}</p>
                <p className="mt-1 text-xs text-red-600 dark:text-red-200">{toast.description}</p>
              </button>
            ))}
          </div>
        )}

        <header className="space-y-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Smart Clothesline Operations
            </h1>
            <p className="mt-1 text-slate-500 dark:text-slate-400">Live operational view for daily drying decisions</p>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <span className={`inline-flex items-center justify-center rounded-full px-3 py-2 text-xs font-semibold ${deviceStatusClass}`}>
              DEVICE: {deviceStatusLabel}
            </span>
            <span className={`inline-flex items-center justify-center rounded-full px-3 py-2 text-xs font-semibold ${badgeClassByState("info")}`}>
              MODE: {systemModeLabel}
            </span>
            <span className={`inline-flex items-center justify-center rounded-full px-3 py-2 text-xs font-semibold ${safetyClass}`}>
              {safetyLabel}
            </span>
            <span className={`inline-flex items-center justify-center rounded-full px-3 py-2 text-xs font-semibold ${decision.scheduleActive ? badgeClassByState("good") : badgeClassByState("warn")}`}>
              SCHEDULE {decision.scheduleActive ? "ACTIVE" : "INACTIVE"}
            </span>
          </div>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Clothesline Status</p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
            <h2 className="text-4xl font-bold text-slate-900 dark:text-slate-100">{displayedStatus}</h2>
            <span className="text-sm text-slate-500 dark:text-slate-400">{realtimeLabel}</span>
          </div>
          <p className="mt-3 text-sm text-slate-700 dark:text-slate-300">{decision.reason}</p>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950">
              <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Mode</p>
              <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{systemModeLabel}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950">
              <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Safety</p>
              <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{safetyLabel}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950">
              <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Latest Update</p>
              <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{lastUpdated}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">{heartbeatAgeSec === null ? "-" : `${heartbeatAgeSec}s ago`}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950">
              <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Schedule Window</p>
              <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                {decision.activeSchedule
                  ? `${formatHourFloat(decision.activeSchedule.startHour)}-${formatHourFloat(decision.activeSchedule.endHour)}`
                  : "-"}
              </p>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <div className="space-y-6 xl:col-span-8">
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">Alerts</h2>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className={`rounded-full px-2 py-1 font-semibold ${badgeClassByState("danger")}`}>Critical {criticalAlerts.length}</span>
                  <span className={`rounded-full px-2 py-1 font-semibold ${badgeClassByState("warn")}`}>Warning {warningAlerts.length}</span>
                  <span className={`rounded-full px-2 py-1 font-semibold ${badgeClassByState("info")}`}>Info {infoAlerts.length}</span>
                </div>
              </div>
              {latestAlert ? (
                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Latest Alert</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{latestAlert.title}</p>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{latestAlert.description}</p>
                </div>
              ) : (
                <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">No active alerts.</p>
              )}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                Why Did The System Change?
              </h2>
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Decision Source</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{decision.decisionSource}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Final State</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{decision.recommendedStatus}</p>
                </div>
              </div>
              <p className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
                {decision.reason}
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Control</h2>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Device Status</p>
                  <p className="mt-2 text-lg font-bold text-gray-900 dark:text-slate-100">{status ?? "--"}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Device Mode</p>
                  <p className="mt-2 text-lg font-bold text-gray-900 dark:text-slate-100">{mode ?? "--"}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Last Device Command</p>
                  <p className="mt-2 text-lg font-bold text-gray-900 dark:text-slate-100">{lastCommand ?? "-"}</p>
                </div>
              </div>

              {!isOnline && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
                  Device offline, command blocked until fresh MQTT data returns.
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3">
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${commandStatusClass}`}>
                  Sync State: {commandStatusLabel}
                </span>
                {pendingCommand && (
                  <span className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                    Pending Command: {pendingCommand}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => sendCommand("OPEN")}
                  disabled={!canSendCommand}
                  className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                >
                  OPEN
                </button>
                <button
                  type="button"
                  onClick={() => sendCommand("CLOSE")}
                  disabled={!canSendCommand}
                  className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                >
                  CLOSE
                </button>
                <button
                  type="button"
                  onClick={() => sendCommand("AUTO")}
                  disabled={!canSendCommand}
                  className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                >
                  AUTO
                </button>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Sensor Data</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Temperature</p>
                  <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-slate-100">{sensor ? `${sensor.temperature.toFixed(1)} C` : "--"}</p>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Humidity</p>
                  <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-slate-100">{sensor ? `${sensor.humidity.toFixed(1)} %` : "--"}</p>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Light</p>
                  <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-slate-100">{sensor ? sensor.light.toFixed(0) : "--"}</p>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Rain</p>
                  <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-slate-100">{sensor ? (sensor.isRaining() ? "Yes" : "No") : "--"}</p>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Event Timeline</h2>
              <EventTimeline events={timelineEvents} />
            </section>
          </div>

          <aside className="space-y-4 xl:col-span-4 xl:sticky xl:top-24 xl:self-start">
            <OperationalHealthPanel health={operationalHealth} />

            <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Serial Monitor Snapshot</h2>
              <div className="mt-3 space-y-2">
                {serialLogs.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-slate-400">No serial logs yet.</p>
                ) : (
                  serialLogs.slice(0, 8).map((log) => (
                    <div key={log.id} className="rounded-lg border border-gray-200 bg-gray-50 p-2 dark:border-slate-700 dark:bg-slate-800/60">
                      <p className="text-[11px] text-gray-500 dark:text-slate-400">
                        {new Date(log.timestamp).toLocaleTimeString("en-US")}
                      </p>
                      <p className="text-xs font-medium text-gray-800 dark:text-slate-100">{log.message}</p>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Debug Mini</h2>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[11px] text-gray-500 dark:text-slate-400">MQTT State</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">{connection.state}</p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-500 dark:text-slate-400">MQTT Connected</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">{mqttConnected ? "Yes" : "No"}</p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-500 dark:text-slate-400">Active Device</p>
                  <p className="break-all text-sm font-semibold text-gray-900 dark:text-slate-100">
                    {activeDeviceId ?? "Not selected"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-500 dark:text-slate-400">Last Sensor</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">{formatClock(lastSensorUpdate)}</p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-500 dark:text-slate-400">Last Status</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">{formatClock(lastStatusUpdate)}</p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-500 dark:text-slate-400">Drift</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">{drift === null ? "--" : `${drift} ms`}</p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-500 dark:text-slate-400">UI Stream</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">{uiState.stream}</p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-500 dark:text-slate-400">Last ACK Result</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">{debug.lastAckResult}</p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-500 dark:text-slate-400">Deduped Status</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">{debug.dedupedStatusCount}</p>
                </div>
              </div>
              <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-2 dark:border-slate-700 dark:bg-slate-800/60">
                <p className="text-[11px] text-gray-500 dark:text-slate-400">Last Transition</p>
                <p className="mt-1 text-xs font-semibold text-gray-800 dark:text-slate-100">
                  {debug.lastTransition ?? "--"}
                </p>
                <p className="mt-1 text-[11px] text-gray-500 dark:text-slate-400">
                  {debug.lastTransitionAt ? new Date(debug.lastTransitionAt).toLocaleTimeString("en-US") : "--"}
                </p>
              </div>
            </section>

            <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Event Logs</h2>
              <div className="mt-3 space-y-2">
                {events.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-slate-400">No events yet.</p>
                ) : (
                  events.slice(0, 10).map((event, index) => (
                    <p key={`${event.timestamp}-${event.type}-${index}`} className="text-xs text-gray-700 dark:text-slate-300">
                      [{new Date(event.timestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}] {event.type} - {event.action}
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
