"use client";

import { Activity } from "lucide-react";
import type { OperationalHealth } from "@/services/DeviceHealthService";

type Props = {
  health: OperationalHealth;
  compact?: boolean;
  lang?: string;
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

function formatUptime(ageMs: number): string {
  if (!Number.isFinite(ageMs) || ageMs <= 0) {
    return "--";
  }
  if (ageMs < 60_000) {
    return `${Math.floor(ageMs / 1000)}s`;
  }
  if (ageMs < 3_600_000) {
    return `${Math.floor(ageMs / 60_000)}m`;
  }
  return `${(ageMs / 3_600_000).toFixed(1)}h`;
}

function badgeClassForStream(stream: OperationalHealth["streamState"]): string {
  if (stream === "STREAMING") {
    return "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-500/20";
  }
  if (stream === "STALE") {
    return "bg-amber-500/10 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-500/20";
  }
  return "bg-slate-500/10 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400 border border-slate-500/20";
}

function badgeClassForSelfAck(ack: OperationalHealth["lastAckState"]): string {
  if (ack === "SYNCED") {
    return "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-500/20";
  }
  if (ack === "WAITING_ACK") {
    return "bg-amber-500/10 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-500/20";
  }
  if (ack === "TIMEOUT") {
    return "bg-rose-500/10 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-500/20";
  }
  return "bg-slate-500/10 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400 border border-slate-500/20";
}

export default function OperationalHealthPanel({ health, compact = false, lang = "en" }: Props) {
  const t = (en: string, id: string) => (lang === "id" ? id : en);

  const streamText = health.streamState === "STREAMING" 
    ? t("STREAMING", "MENGALIR") 
    : health.streamState === "STALE" 
      ? t("STALE", "TERLAMBAT") 
      : t("OFFLINE", "TERPUTUS");

  const ackText = health.lastAckState === "SYNCED" 
    ? t("SYNCED", "SINKRON") 
    : health.lastAckState === "WAITING_ACK" 
      ? t("WAITING_ACK", "MENUNGGU ACK") 
      : health.lastAckState === "TIMEOUT" 
        ? t("TIMEOUT", "HABIS WAKTU") 
        : t("UNKNOWN", "TIDAK DIKETAHUI");

  const getConnectionStateLabel = (state: string) => {
    const s = state.toUpperCase();
    if (s === "CONNECTED") return t("CONNECTED", "TERHUBUNG");
    if (s === "DISCONNECTED") return t("DISCONNECTED", "TERPUTUS");
    if (s === "CONNECTING") return t("CONNECTING", "MENGHUBUNGKAN");
    if (s === "RECONNECTING") return t("RECONNECTING", "MENGHUBUNGKAN ULANG");
    return state.toUpperCase();
  };

  if (compact) {
    return (
      <div className="rounded-2xl border border-slate-200/60 bg-white/50 p-4 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${badgeClassForStream(health.streamState)}`}>
            {streamText}
          </span>
          <span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${badgeClassForSelfAck(health.lastAckState)}`}>
            ACK: {ackText}
          </span>
          <span className="inline-flex rounded-full bg-slate-500/10 border border-slate-500/20 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400">
            MQTT: {getConnectionStateLabel(health.connectionState)}
          </span>
        </div>
      </div>
    );
  }

  return (
    <section className="rounded-[2rem] border border-slate-200/60 bg-white dark:bg-slate-900/40 p-8 shadow-xl backdrop-blur-sm dark:border-white/5">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
            <Activity className="h-5 w-5" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-white tracking-tight">
            {t("System Health", "Kesehatan Sistem")}
          </h3>
        </div>
        <span className={`inline-flex rounded-full px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] ${badgeClassForStream(health.streamState)}`}>
          {streamText}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <HealthItem label={t("MQTT Connection", "Koneksi MQTT")} value={getConnectionStateLabel(health.connectionState)} />
        <HealthItem label={t("Last ACK", "ACK Terakhir")} value={ackText} />
        <HealthItem label={t("Sensor Age", "Usia Sensor")} value={formatAge(health.lastSensorAgeMs)} />
        <HealthItem label={t("Status Age", "Usia Status")} value={formatAge(health.lastStatusAgeMs)} />
        <HealthItem label={t("Status Drift", "Penyimpangan Status")} value={formatAge(health.statusDriftMs)} />
        <HealthItem label={t("Backlog", "Tumpukan Antrean")} value={health.queueBacklog.toString()} />
        <HealthItem label={t("Reconnects", "Koneksi Ulang")} value={health.reconnectCount.toString()} />
        <HealthItem label={t("Uptime", "Waktu Aktif")} value={formatUptime(health.connectionUptimeMs)} />
      </div>

      <div className="mt-6 pt-6 border-t border-slate-100 dark:border-white/5">
        <div className={`flex items-center justify-between px-5 py-3 rounded-2xl ${badgeClassForSelfAck(health.lastAckState)}`}>
          <span className="text-[10px] font-black uppercase tracking-widest">{t("Protocol Sync", "Sinkronisasi Protokol")}</span>
          <span className="text-[10px] font-black uppercase tracking-widest">{ackText}</span>
        </div>
      </div>
    </section>
  );
}

function HealthItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 dark:bg-white/5 p-4 border border-slate-200/50 dark:border-white/5">
      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">{label}</p>
      <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
        {value}
      </p>
    </div>
  );
}
