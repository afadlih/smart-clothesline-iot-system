"use client";

import { useState, useEffect } from "react";
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
import { translateEventTitle, translateEventDescription } from "@/utils/translateEvent";
import { useNotificationEngine } from "@/hooks/useNotificationEngine";
import { useSystemState } from "@/hooks/useSystemState";
import { PairableDevice } from "../settings/PairingDeviceSettings";

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


export default function DashboardScreen({ lang = "en" }: { lang?: "en" | "id" }) {
  const t = (en: string, id: string) => (lang === "id" ? id : en);

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
  const [device, setDevice] = useState<PairableDevice | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isTimelineExpanded, _setIsTimelineExpanded] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isEventLogsExpanded, _setIsEventLogsExpanded] = useState(false);
  const ACTIVE_DEVICE_STORAGE_KEY = "smart-clothesline-devices-v1";

  useEffect(() => { // untuk mengambil data dari localstorage 
    try {
      const raw = localStorage.getItem(ACTIVE_DEVICE_STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      const selectedDevice = data.devices?.find(
        (device: PairableDevice) => device.id === data.selectedDeviceId
      ) ?? null;
      setDevice(selectedDevice);
    } catch (error) {
      console.error("Gagal membaca device dari localStorage:", error);
      setDevice(null);
    }
  }, []);

  const deviceStatusClass =
    runtime.deviceConnectivity === "OFFLINE" ||
      runtime.deviceConnectivity === "UNKNOWN"
      ? badgeClassByState("danger")
      : runtime.deviceConnectivity === "DELAYED"
        ? badgeClassByState("warn")
        : badgeClassByState("good");

  const realtimeLabel =
    runtime.streamState === "STREAMING"
      ? t("LIVE TELEMETRY", "TELEMETRI LANGSUNG")
      : runtime.streamState === "STALE"
        ? t("Sensor data is delayed", "Data sensor terlambat")
        : t("OFFLINE", "TERPUTUS");

  const getModeLabel = (mode: string) => {
    if (mode === "AUTO") return t("AUTO", "OTOMATIS");
    if (mode === "MANUAL") return t("MANUAL", "MANUAL");
    return mode;
  };

  const getSafetyLabel = (label: string) => {
    if (label === "MONITORING") return t("MONITORING", "MEMANTAU");
    if (label === "RAIN ALERT") return t("RAIN ALERT", "PERINGATAN HUJAN");
    if (label === "LOW LIGHT") return t("LOW LIGHT", "KURANG CAHAYA");
    if (label === "OVERRIDE") return t("OVERRIDE", "KONTROL MANUAL");
    return label;
  };

  const deviceModeLabel = getModeLabel(runtime.actualDeviceMode).toUpperCase();
  const safetyLabel = runtime.safetyLabel;

  const displayedStatus = runtime.actualDeviceStatus
    ? (runtime.actualDeviceStatus === "OPEN"
        ? t("OPEN", "TERBUKA")
        : runtime.actualDeviceStatus === "CLOSED"
          ? t("CLOSED", "TERTUTUP")
          : runtime.actualDeviceStatus)
    : "--";
  const lastUpdated = formatClock(lastUpdate);
  const isCommandPending = uiState.deviceSync === "WAITING_ACK";
  const canSendCommand =
    runtime.streamState === "STREAMING" && !isCommandPending && commandGuard.canSendCommand;
  const openDisabled = !canSendCommand || commandGuard.disabledCommands.includes("OPEN");
  const closeDisabled = !canSendCommand || commandGuard.disabledCommands.includes("CLOSE");
  const autoDisabled = !canSendCommand || commandGuard.disabledCommands.includes("AUTO");

  const commandStatusLabel =
    uiState.deviceSync === "WAITING_ACK"
      ? t("Sending command", "Perintah sedang dikirim")
      : uiState.deviceSync === "SYNCED"
        ? t("SYNCED", "TERSINKRONISASI")
        : runtime.commandStatus === "timeout"
          ? t("TIMEOUT", "WAKTU HABIS")
          : t("READY", "SIAP");
  const commandStatusClass =
    uiState.deviceSync === "WAITING_ACK"
      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
      : uiState.deviceSync === "SYNCED"
        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
        : runtime.commandStatus === "timeout"
          ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
          : "bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20";

  const getGuardReasonLabel = (reason: string) => {
    if (reason === "No matching runtime state rule.") {
      return t("No matching runtime state rule.", "Tidak ada aturan status runtime yang cocok.");
    }
    if (reason === "Fault flag is active.") {
      return t("Fault flag is active.", "Sistem dalam kondisi kesalahan (fault).");
    }
    if (reason === "MQTT disconnected or telemetry exceeded offline threshold.") {
      return t(
        "MQTT disconnected or telemetry exceeded offline threshold.",
        "Koneksi MQTT terputus atau batas waktu offline terlampaui."
      );
    }
    if (reason === "Telemetry exceeded stale threshold.") {
      return t("Telemetry exceeded stale threshold.", "Data telemetri sudah usang.");
    }
    if (reason === "Rain detected while clothesline is not retracted.") {
      return t(
        "Rain detected while clothesline is not retracted.",
        "Terdeteksi hujan saat jemuran tidak ditarik (terbuka)."
      );
    }
    if (reason === "Device movement is in progress.") {
      return t("Device movement is in progress.", "Pergerakan motor jemuran sedang berlangsung.");
    }
    if (reason === "Clothesline is retracted.") {
      return t("Clothesline is retracted.", "Jemuran dalam kondisi ditarik (tertutup).");
    }
    if (reason === "Clothesline is extended and rain is not detected.") {
      return t(
        "Clothesline is extended and rain is not detected.",
        "Jemuran dalam kondisi dibuka dan tidak ada deteksi hujan."
      );
    }
    return reason;
  };



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
                    {t("System Alert", "Peringatan Sistem")}
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

        {/* Warning banner when no device is paired */}
        {!device && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 p-4 text-sm font-bold text-amber-700 dark:text-amber-300">
            <AlertCircle className="h-5 w-5" />
            {t(
              "No device selected yet. Choose a device from IoT Hub or try the demo simulator.",
              "Belum ada alat yang dipilih. Pilih alat dari IoT Hub atau coba simulator demo."
            )}
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
                    {t("Clothesline Overview", "Ikhtisar Jemuran")}
                  </span>
                </div>
                <h2 className="text-6xl md:text-7xl font-black text-slate-800 dark:text-white tracking-tighter">
                  {displayedStatus}
                </h2>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`h-2 w-2 rounded-full ${runtime.streamState === 'STREAMING' ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-400'}`} />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                      {realtimeLabel}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest">{device?.name}</span>
                </div>
              </div>

            </div>

            <div className="relative z-10 mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatusBadge
                icon={<Zap className="h-5 w-5" />}
                label={t("Operating Mode", "Mode Operasi")}
                value={deviceModeLabel}
                valueClass="text-slate-800 dark:text-white"
                dotClass={deviceStatusClass.includes("rose") ? "bg-rose-500" : deviceStatusClass.includes("amber") ? "bg-amber-500" : "bg-emerald-500"}
                iconBgClass="bg-teal-500/10"
                iconTextClass="text-teal-600 dark:text-teal-400"
                title={t("Current operating mode", "Mode operasi saat ini")}
              />
              <StatusBadge
                icon={<Shield className="h-5 w-5" />}
                label={t("Safety Status", "Status Keamanan")}
                value={getSafetyLabel(safetyLabel)}
                valueClass={runtime.decisionSource === "SAFETY" ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}
                dotClass={runtime.decisionSource === "SAFETY" ? "bg-rose-500" : "bg-emerald-500"}
                iconBgClass={runtime.decisionSource === "SAFETY" ? "bg-rose-500/10" : "bg-emerald-500/10"}
                iconTextClass={runtime.decisionSource === "SAFETY" ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}
                title={t("Automated safety protocols", "Protokol keamanan otomatis")}
              />
              <StatusBadge
                icon={<Clock className="h-5 w-5" />}
                label={t("Last active", "Terakhir aktif")}
                value={lastUpdated}
                valueClass="text-slate-800 dark:text-white"
                dotClass="bg-teal-500"
                iconBgClass="bg-teal-500/10"
                iconTextClass="text-teal-600 dark:text-teal-400"
                title={runtime.freshnessSeconds === null ? t("Never", "Tidak pernah") : `${runtime.freshnessSeconds}s ${t("ago", "yang lalu")}`}
              />
              <StatusBadge
                icon={<Calendar className="h-5 w-5" />}
                label={t("Active Schedule", "Jadwal Aktif")}
                value={decision.activeSchedule ? `${formatHourFloat(decision.activeSchedule.startHour)} - ${formatHourFloat(decision.activeSchedule.endHour)}` : t("Not Configured", "Belum Diatur")}
                valueClass="text-slate-800 dark:text-white"
                dotClass={decision.scheduleActive ? "bg-emerald-500" : "bg-slate-400"}
                iconBgClass="bg-emerald-500/10"
                iconTextClass="text-emerald-600 dark:text-emerald-400"
                title={decision.scheduleActive ? t("Schedule is active", "Jadwal sedang aktif") : t("Schedule is inactive", "Jadwal tidak aktif")}
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
                  <h2 className="text-lg font-bold text-slate-800 dark:text-white tracking-tight">{t("Clothesline Control", "Kontrol Jemuran")}</h2>
                </div>
                <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] ${commandStatusClass}`}>
                  {commandStatusLabel}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <div className="rounded-2xl bg-slate-50 dark:bg-white/5 p-5 border border-slate-200/50 dark:border-white/5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{t("State", "Status")}</p>
                  <p className="text-xl font-black text-slate-800 dark:text-white uppercase">
                    {runtime.actualDeviceStatus
                      ? (runtime.actualDeviceStatus === "OPEN"
                          ? t("OPEN", "TERBUKA")
                          : runtime.actualDeviceStatus === "CLOSED"
                            ? t("CLOSED", "TERTUTUP")
                            : runtime.actualDeviceStatus)
                      : "--"}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 dark:bg-white/5 p-5 border border-slate-200/50 dark:border-white/5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{t("Mode", "Mode")}</p>
                  <p className="text-xl font-black text-slate-800 dark:text-white uppercase">{runtime.actualDeviceMode ? getModeLabel(runtime.actualDeviceMode) : "--"}</p>
                </div>
              </div>

              {runtime.deviceConnectivity === "OFFLINE" && (
                <div className="mb-6 flex items-center gap-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 p-4 text-sm font-bold text-rose-600 dark:text-rose-400">
                  <AlertCircle className="h-5 w-5" />
                  {t(
                    "The device has not sent new sensor data recently. Check power, Wi-Fi, or MQTT connection.",
                    "Alat belum mengirim data sensor terbaru. Periksa daya, Wi-Fi, atau koneksi MQTT."
                  )}
                </div>
              )}
              {!canSendCommand && runtime.deviceConnectivity !== "OFFLINE" && (
                <div className="mb-6 flex items-center gap-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 p-4 text-sm font-bold text-amber-700 dark:text-amber-300">
                  <AlertCircle className="h-5 w-5" />
                  {getGuardReasonLabel(commandGuard.reason)}
                </div>
              )}

              <div className="flex flex-wrap gap-4">
                <button
                  onClick={() => sendCommand("OPEN")}
                  disabled={openDisabled}
                  className="flex-1 min-w-[120px] rounded-2xl bg-teal-600 py-4 text-sm font-black text-white shadow-lg shadow-teal-600/20 transition-all hover:bg-teal-700 hover:-translate-y-0.5 active:scale-95 disabled:opacity-40 disabled:hover:translate-y-0 uppercase tracking-widest"
                >
                  {t("Open", "Buka")}
                </button>
                <button
                  onClick={() => sendCommand("CLOSE")}
                  disabled={closeDisabled}
                  className="flex-1 min-w-[120px] rounded-2xl bg-slate-800 py-4 text-sm font-black text-white shadow-lg shadow-slate-800/20 transition-all hover:bg-slate-900 hover:-translate-y-0.5 active:scale-95 disabled:opacity-40 disabled:hover:translate-y-0 uppercase tracking-widest"
                >
                  {t("Close", "Tutup")}
                </button>
                <button
                  onClick={() => sendCommand("AUTO")}
                  disabled={autoDisabled}
                  className="flex-1 min-w-[120px] rounded-2xl bg-emerald-600 py-4 text-sm font-black text-white shadow-lg shadow-emerald-600/20 transition-all hover:bg-emerald-700 hover:-translate-y-0.5 active:scale-95 disabled:opacity-40 disabled:hover:translate-y-0 uppercase tracking-widest"
                >
                  {t("Auto", "Otomatis")}
                </button>
              </div>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-500 dark:text-slate-400 font-semibold">
                <div>
                  <span className="font-extrabold text-teal-600 dark:text-teal-400">{t("OPEN:", "BUKA:")}</span>{" "}
                  {t("Open clothesline", "Buka jemuran")}
                </div>
                <div>
                  <span className="font-extrabold text-slate-700 dark:text-slate-300">{t("CLOSE:", "TUTUP:")}</span>{" "}
                  {t("Close clothesline", "Tutup jemuran")}
                </div>
                <div>
                  <span className="font-extrabold text-emerald-600 dark:text-emerald-400">{t("AUTO:", "OTOMATIS:")}</span>{" "}
                  {t("Let the system respond to conditions", "Sistem merespons kondisi otomatis")}
                </div>
              </div>
            </section>

            {/* Sensor Grid */}
            <section className="flex-1 flex flex-col rounded-[2rem] bg-white dark:bg-slate-900/40 p-8 shadow-xl border border-slate-200/60 dark:border-white/5 backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-8">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
                  <Activity className="h-5 w-5" />
                </div>
                <h2 className="text-lg font-bold text-slate-800 dark:text-white tracking-tight">{t("Sensor Data", "Data Sensor")}</h2>
              </div>

              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="flex flex-col justify-center rounded-2xl bg-slate-50 dark:bg-white/5 p-6 border border-slate-200/50 dark:border-white/5 group hover:border-teal-500/50 transition-colors">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{t("Temperature", "Suhu")}</p>
                  <p className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">
                    {sensor ? `${sensor.temperature.toFixed(1)}°C` : "--"}
                  </p>
                </div>
                <div className="flex flex-col justify-center rounded-2xl bg-slate-50 dark:bg-white/5 p-6 border border-slate-200/50 dark:border-white/5 group hover:border-teal-500/50 transition-colors">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{t("Humidity", "Kelembapan")}</p>
                  <p className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">
                    {sensor ? `${sensor.humidity.toFixed(1)}%` : "--"}
                  </p>
                </div>
                <div className="flex flex-col justify-center rounded-2xl bg-slate-50 dark:bg-white/5 p-6 border border-slate-200/50 dark:border-white/5 group hover:border-teal-500/50 transition-colors">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{t("Light Condition", "Kondisi Cahaya")}</p>
                  <p className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">
                    {sensor ? sensor.getLightCondition(sensor.light, t) : "--"}
                  </p>
                </div>
                <div className="flex flex-col justify-center rounded-2xl bg-slate-50 dark:bg-white/5 p-6 border border-slate-200/50 dark:border-white/5 group hover:border-teal-500/50 transition-colors">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{t("Rain Detection", "Deteksi Hujan")}</p>
                  <p className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">
                    {sensor ? (sensor.isRaining() ? t("YES", "YA") : t("NO", "TIDAK")) : "--"}
                  </p>
                </div>
              </div>
            </section>

          </div>

          {/* Right Sidebar - System Health & Activity Log */}
          <aside className="flex flex-col gap-8 xl:col-span-4">
            <OperationalHealthPanel health={operationalHealth} lang={lang} />

            <section className="flex-1 flex flex-col rounded-[2rem] bg-white dark:bg-slate-900/40 p-8 shadow-xl border border-slate-200/60 dark:border-white/5 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <History className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                  <h2 className="text-lg font-bold text-slate-800 dark:text-white tracking-tight">{t("Activity Log", "Catatan Aktivitas")}</h2>
                </div>
                <button onClick={() => _setIsTimelineExpanded(!isTimelineExpanded)} className="text-[10px] font-black uppercase tracking-widest text-teal-600 hover:text-teal-700">
                  {isTimelineExpanded ? t("Show Less", "Tampilkan Lebih Sedikit") : t("View All", "Lihat Semua")}
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
                      <p className="text-xs font-bold text-slate-800 dark:text-white leading-none mb-1">
                        {translateEventTitle(event.title, lang)}
                      </p>
                      <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 leading-normal mb-1">
                        {translateEventDescription(event.description, lang)}
                      </p>
                      <p className="text-[9px] font-medium text-slate-400 dark:text-slate-500">
                        {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
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


