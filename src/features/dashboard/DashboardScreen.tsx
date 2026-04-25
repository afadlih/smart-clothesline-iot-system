"use client";

import Link from "next/link";
import EventTimeline from "@/components/events/EventTimeline";
import StatusPanel from "@/components/status/StatusPanel";
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
    history,
    serialLogs,
    uiState,
    drift,
    decision,
    sendCommand,
    operationalHealth,
    smartAlerts,
  } = useSystemState();
  const { events: timelineEvents, latestAlert, toasts, dismissToast } = useNotificationEngine();

  const connectionLabel = isOnline ? "ONLINE" : "OFFLINE";
  const connectionBadgeClass = isOnline
    ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
    : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300";
  const connectionDotClass = isOnline ? "bg-green-500" : "bg-red-500";
  const streamLabel =
    uiState.connection === "DISCONNECTED"
      ? "Disconnected"
      : uiState.stream === "NO_DATA"
        ? "Waiting device..."
        : uiState.stream === "STALE"
          ? "Stale"
          : "Streaming";
  const displayedStatus = status ?? "--";
  const statusPanelLabel =
    displayedStatus === "OPEN" ? "OPEN" : displayedStatus === "CLOSED" ? "CLOSED" : "--";
  const lastUpdated = formatClock(lastUpdate);
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
  const avgTemperature =
    history.length > 0 ? history.reduce((sum, item) => sum + item.data.temperature, 0) / history.length : null;
  const avgHumidity =
    history.length > 0 ? history.reduce((sum, item) => sum + item.data.humidity, 0) / history.length : null;

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

        <header className="space-y-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-slate-100">
              Smart Clothesline Dashboard
            </h1>
            <p className="mt-1 text-gray-500 dark:text-slate-400">Real-time IoT monitoring dashboard</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-slate-400">
            <span>Last updated: {lastUpdated}</span>
            <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${connectionBadgeClass}`}>
              <span className={`h-2 w-2 rounded-full ${connectionDotClass}`} aria-hidden="true" />
              {connectionLabel}
            </span>
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                decision.scheduleActive
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                  : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
              }`}
            >
              Schedule: {decision.scheduleActive ? "Active" : "Inactive"}
            </span>
            <span className="text-xs text-gray-400 dark:text-slate-500">{streamLabel}</span>
            <Link
              href="/analytics"
              className="ml-auto px-3 py-1 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
            >
              Analytics
            </Link>
          </div>
          <div className="h-px bg-gray-200 dark:bg-slate-800" />
        </header>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Avg Temperature (24h)</p>
            <p className="mt-2 text-2xl font-bold text-red-600">{avgTemperature !== null ? `${avgTemperature.toFixed(1)} C` : "--"}</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Avg Humidity (24h)</p>
            <p className="mt-2 text-2xl font-bold text-blue-600">{avgHumidity !== null ? `${avgHumidity.toFixed(0)}%` : "--"}</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Data Points</p>
            <p className="mt-2 text-2xl font-bold text-amber-600">{history.length}</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Recommended State</p>
            <p className="mt-2 text-2xl font-bold text-green-600">{decision.recommendedStatus}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <div className="space-y-6 xl:col-span-8">
            {smartAlerts.length > 0 && (
              <section className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100">Active Alerts ({smartAlerts.length})</h3>
                <div className="space-y-2">
                  {smartAlerts.slice(0, 3).map((alert) => (
                    <div
                      key={alert.id}
                      className={`rounded-lg p-4 ${
                        alert.severity === "critical"
                          ? "border border-red-300 bg-red-50 dark:border-red-900/40 dark:bg-red-900/20"
                          : alert.severity === "warning"
                            ? "border border-yellow-300 bg-yellow-50 dark:border-yellow-900/40 dark:bg-yellow-900/20"
                            : "border border-blue-300 bg-blue-50 dark:border-blue-900/40 dark:bg-blue-900/20"
                      }`}
                    >
                      <p className={`text-xs font-semibold uppercase ${
                        alert.severity === "critical"
                          ? "text-red-700 dark:text-red-300"
                          : alert.severity === "warning"
                            ? "text-yellow-700 dark:text-yellow-300"
                            : "text-blue-700 dark:text-blue-300"
                      }`}>
                        {alert.title}
                      </p>
                      <p className={`mt-1 text-sm ${
                        alert.severity === "critical"
                          ? "text-red-800 dark:text-red-200"
                          : alert.severity === "warning"
                            ? "text-yellow-800 dark:text-yellow-200"
                            : "text-blue-800 dark:text-blue-200"
                      }`}>
                        {alert.description}
                      </p>
                      {alert.suggestedAction && (
                        <p className={`mt-2 text-xs font-semibold ${
                          alert.severity === "critical"
                            ? "text-red-700 dark:text-red-300"
                            : alert.severity === "warning"
                              ? "text-yellow-700 dark:text-yellow-300"
                              : "text-blue-700 dark:text-blue-300"
                        }`}>
                          Action: {alert.suggestedAction}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {latestAlert && (
              <section className="rounded-xl border border-red-300 bg-red-50 p-4 dark:border-red-900/40 dark:bg-red-900/20">
                <p className="text-xs font-semibold uppercase tracking-wide text-red-700 dark:text-red-300">Latest Alert</p>
                <p className="mt-1 text-sm font-semibold text-red-800 dark:text-red-200">{latestAlert.title}</p>
                <p className="mt-1 text-xs text-red-700 dark:text-red-300">{latestAlert.description}</p>
              </section>
            )}

            <StatusPanel status={statusPanelLabel} reason={`Decision Source: ${decision.decisionSource} (${decision.reason})`} />

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">System Decision</h2>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Final State</p>
                  <p className="mt-2 text-lg font-bold text-gray-900 dark:text-slate-100">{decision.recommendedStatus}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Source</p>
                  <p className="mt-2 text-lg font-bold text-gray-900 dark:text-slate-100">{decision.decisionSource}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Reason</p>
                  <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-slate-100">{decision.reason}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Schedule Window</p>
                  <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-slate-100">
                    {decision.activeSchedule
                      ? `${String(decision.activeSchedule.startHour).padStart(2, "0")}:00-${String(
                          decision.activeSchedule.endHour,
                        ).padStart(2, "0")}:00`
                      : "-"}
                  </p>
                </div>
              </div>
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
