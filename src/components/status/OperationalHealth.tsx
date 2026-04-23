"use client";

import type { OperationalHealth } from "@/services/DeviceHealthService";

type Props = {
  health: OperationalHealth;
  compact?: boolean;
};

function formatAge(ageMs: number | null): string {
  if (ageMs === null) {
    return "--";
  }
  if (ageMs < 1000) {
    return `${ageMs} ms`;
  }
  return `${(ageMs / 1000).toFixed(1)} s`;
}

function badgeClassForStream(stream: OperationalHealth["streamState"]): string {
  if (stream === "STREAMING") {
    return "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300";
  }
  if (stream === "STALE") {
    return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";
  }
  return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200";
}

function badgeClassForAck(ack: OperationalHealth["lastAckState"]): string {
  if (ack === "SYNCED") {
    return "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300";
  }
  if (ack === "WAITING_ACK") {
    return "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300";
  }
  if (ack === "TIMEOUT") {
    return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300";
  }
  return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200";
}

export default function OperationalHealthPanel({ health, compact = false }: Props) {
  if (compact) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClassForStream(health.streamState)}`}>
            {health.streamState}
          </span>
          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClassForAck(health.lastAckState)}`}>
            ACK: {health.lastAckState}
          </span>
          <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            MQTT: {health.mqttConnected ? "CONNECTED" : "DISCONNECTED"}
          </span>
        </div>
      </div>
    );
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
          Operational Health
        </h3>
        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClassForStream(health.streamState)}`}>
          {health.streamState}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-gray-50 p-3 dark:bg-slate-800/70">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">MQTT</p>
          <p className="mt-1 text-sm font-bold text-gray-900 dark:text-slate-100">
            {health.mqttConnected ? "Connected" : "Disconnected"}
          </p>
        </div>
        <div className="rounded-lg bg-gray-50 p-3 dark:bg-slate-800/70">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Last ACK</p>
          <p className="mt-1 text-sm font-bold text-gray-900 dark:text-slate-100">{health.lastAckState}</p>
        </div>
        <div className="rounded-lg bg-gray-50 p-3 dark:bg-slate-800/70">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Sensor Age</p>
          <p className="mt-1 text-sm font-bold text-gray-900 dark:text-slate-100">{formatAge(health.lastSensorAgeMs)}</p>
        </div>
        <div className="rounded-lg bg-gray-50 p-3 dark:bg-slate-800/70">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Status Age</p>
          <p className="mt-1 text-sm font-bold text-gray-900 dark:text-slate-100">{formatAge(health.lastStatusAgeMs)}</p>
        </div>
        <div className="rounded-lg bg-gray-50 p-3 dark:bg-slate-800/70">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Drift</p>
          <p className="mt-1 text-sm font-bold text-gray-900 dark:text-slate-100">{formatAge(health.statusDriftMs)}</p>
        </div>
        <div className="rounded-lg bg-gray-50 p-3 dark:bg-slate-800/70">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Queue Backlog</p>
          <p className="mt-1 text-sm font-bold text-gray-900 dark:text-slate-100">{health.queueBacklog}</p>
        </div>
      </div>
      <div className="mt-3">
        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClassForAck(health.lastAckState)}`}>
          ACK State: {health.lastAckState}
        </span>
      </div>
    </section>
  );
}
