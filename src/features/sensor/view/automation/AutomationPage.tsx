"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Bot, CloudRain, Shield, Timer, Zap, History, ChevronRight, Clock, Sliders, Info, Sun, AlertCircle } from "lucide-react";
import PageContainer from "@/components/layout/PageContainer";
import { useSystemState } from "@/hooks/useSystemState";
import { formatClock } from "@/utils/timeFormat";
import { ScheduleService, type FirebaseScheduleItem } from "@/services/ScheduleService";
import { useAuth } from "@/hooks/useAuth";
import { isWithinSchedule } from "@/features/system/ScheduleEngine";
import {
  RAIN_MODES,
  rainThresholdToMode,
  modeToRainThreshold,
  lightThresholdToLevel,
  levelToLightThreshold,
  type RainMode
} from "@/utils/thresholdMapper";

const SETTINGS_STORAGE_KEY = "smart-clothesline-settings-v1";

type AutomationSettings = {
  rainThreshold: number;
  lightThreshold: number;
  autoCloseOnRain: boolean;
  autoCloseOnDark: boolean;
  autoOpenWhenSafe: boolean;
  updateIntervalSec: number;
};

const defaults: AutomationSettings = {
  rainThreshold: 2000,
  lightThreshold: 3000,
  autoCloseOnRain: true,
  autoCloseOnDark: true,
  autoOpenWhenSafe: false,
  updateIntervalSec: 5,
};

const RAIN_THRESHOLD_OFFSET = 200;
const LIGHT_THRESHOLD_OFFSET = 300;
const MIN_RAIN_THRESHOLD = 0;
const MAX_RAIN_THRESHOLD = 4095;
const MIN_LIGHT_THRESHOLD = 0;
const MAX_LIGHT_THRESHOLD = 10000;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function calculateAutoThreshold(sensor: {
  rainVal?: number;
  rainRaw?: number;
  light?: number;
}) {
  const rainRaw = sensor.rainVal ?? sensor.rainRaw;
  const light = sensor.light ?? 0;

  if (typeof rainRaw !== "number") {
    throw new Error("Raw rain value is required to calculate rain threshold");
  }

  return {
    rainThreshold: clamp(
      rainRaw - RAIN_THRESHOLD_OFFSET,
      MIN_RAIN_THRESHOLD,
      MAX_RAIN_THRESHOLD
    ),

    lightThreshold: clamp(
      light + LIGHT_THRESHOLD_OFFSET,
      MIN_LIGHT_THRESHOLD,
      MAX_LIGHT_THRESHOLD
    ),
  };
}

export default function AutomationPage({ lang = "en" }: { lang?: "en" | "id" }) {
  const t = (en: string, id: string) => (lang === "id" ? id : en);

  const getRainModeLabel = (mode: RainMode) => {
    return mode === "INSTANT" ? t("Instant", "Instan") : t("Tolerant", "Toleran");
  };

  const getRainModeDesc = (mode: RainMode) => {
    return mode === "INSTANT"
      ? t("Closes immediately on the first contact with water. Best for protecting clothes.", "Menutup segera pada sentuhan pertama dengan air. Terbaik untuk melindungi pakaian.")
      : t("Ignores light condensation or humid air. Activates only when the sensor is noticeably wet.", "Mengabaikan embun tipis atau udara lembap. Aktif hanya saat sensor benar-benar basah.");
  };

  const getLightLevelName = (level: number) => {
    switch (level) {
      case 1: return t("Very Low (Total Dark)", "Sangat Rendah (Gelap Gulita)");
      case 2: return t("Low (Very Dim)", "Rendah (Sangat Redup)");
      case 3: return t("Medium (Overcast / Dusk)", "Sedang (Mendung / Senja)");
      case 4: return t("High (Afternoon Shade)", "Tinggi (Teduh Sore)");
      case 5: return t("Very High (Any Dimming)", "Sangat Tinggi (Redup Sedikit)");
      default: return "";
    }
  };

  const getLightLevelDesc = (level: number) => {
    switch (level) {
      case 1: return t("Closes only in complete darkness — suitable for outdoor setups with significant ambient light at night.", "Menutup hanya dalam kegelapan total — cocok untuk luar ruangan dengan cahaya sekitar yang signifikan di malam hari.");
      case 2: return t("Closes when light drops to a very low level, such as late evening.", "Menutup ketika cahaya turun ke tingkat yang sangat rendah, seperti sore menjelang malam.");
      case 3: return t("Closes at dusk or under heavy overcast conditions. Recommended for most setups.", "Menutup pada senja hari or dalam kondisi mendung tebal. Direkomendasikan untuk sebagian besar pengaturan.");
      case 4: return t("Closes earlier when the room or environment becomes moderately shaded.", "Menutup lebih awal ketika ruangan atau lingkungan mulai agak teduh.");
      case 5: return t("Very sensitive — closes as soon as ambient light begins to drop from a bright state.", "Sangat sensitif — menutup segera setelah cahaya sekitar mulai turun dari keadaan terang.");
      default: return "";
    }
  };

  const { decision, sendCommand, publishConfig, events, sensorData } = useSystemState();
  const [settings, setSettings] = useState<AutomationSettings>(defaults);
  const [isSaving, setIsSaving] = useState(false);

  const currentRainMode = useMemo(() => rainThresholdToMode(settings.rainThreshold), [settings.rainThreshold]);
  const currentLightLevel = useMemo(() => lightThresholdToLevel(settings.lightThreshold), [settings.lightThreshold]);

  const { user } = useAuth();
  const [schedules, setSchedules] = useState<FirebaseScheduleItem[]>([]);
  const [loadingSchedules, setLoadingSchedules] = useState(true);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = window.setInterval(() => { setCurrentTime(new Date()); }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const loadScheduleData = async () => {
      try {
        const activeDevId = typeof window !== "undefined" ? localStorage.getItem("smart-clothesline-active-device-id-v1") : null;
        if (user && activeDevId) {
          const scheduleResult = await ScheduleService.loadDeviceSchedules({
            uid: user.uid,
            deviceId: activeDevId
          });
          setSchedules(scheduleResult.schedules.filter(s => s.enabled));
        } else {
          const scheduleResult = await ScheduleService.loadSchedules();
          setSchedules(scheduleResult.schedules.filter(s => s.enabled));
        }
      } catch (err) {
        console.error("Load error:", err);
      } finally {
        setLoadingSchedules(false);
      }
    };
    
    void loadScheduleData();
    const onUpdate = () => { void loadScheduleData(); };
    window.addEventListener("schedule-updated", onUpdate);
    return () => window.removeEventListener("schedule-updated", onUpdate);
  }, [user]);

  const currentDecimalHour = useMemo(() => {
    return currentTime.getHours() + currentTime.getMinutes() / 60 + currentTime.getSeconds() / 3600;
  }, [currentTime]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<AutomationSettings>;
      setSettings({
        rainThreshold: parsed.rainThreshold ?? defaults.rainThreshold,
        lightThreshold: parsed.lightThreshold ?? defaults.lightThreshold,
        autoCloseOnRain: parsed.autoCloseOnRain ?? defaults.autoCloseOnRain,
        autoCloseOnDark: parsed.autoCloseOnDark ?? defaults.autoCloseOnDark,
        autoOpenWhenSafe: parsed.autoOpenWhenSafe ?? defaults.autoOpenWhenSafe,
        updateIntervalSec: parsed.updateIntervalSec ?? defaults.updateIntervalSec,
      });
    } catch {
      setSettings(defaults);
    }
  }, []);

  const automationEvents = useMemo(
    () => events.slice(0, 10),
    [events],
  );

  const saveAndApply = async () => {
    if (isSaving) return;
    
    setIsSaving(true);

    const next = { ...settings };

    try {
      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      const prev = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};

      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ ...prev, ...next }));

      publishConfig(next);

      await new Promise((resolve) => setTimeout(resolve, 800));
    } catch {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next));
    } finally {
      setIsSaving(false);
    }
  };

  const applyAutoThreshold = () => {
    if (!sensorData) {
      return;
    }

    const autoThreshold = calculateAutoThreshold(sensorData);

    setSettings((previous) => ({
      ...previous,
      ...autoThreshold,
      autoCloseOnDark: true,
      autoCloseOnRain: true,
      autoOpenWhenSafe: true,
    }));
  };

  return (
    <main className="min-h-screen bg-[#f8fafc] dark:bg-[#020617] transition-colors duration-500 pb-20">
      <PageContainer className="space-y-8">
        {/* Header Section */}
        <header className="relative overflow-hidden rounded-[2.5rem] bg-white dark:bg-slate-900/50 p-8 md:p-10 shadow-2xl shadow-emerald-500/5 border border-slate-200/60 dark:border-white/5 backdrop-blur-sm">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-emerald-500/10 blur-[80px]" />
          <div className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-teal-500/5 blur-[80px]" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/20">
                  <Bot className="h-5 w-5" />
                </div>
                <span className="text-[11px] font-black uppercase tracking-[0.25em] text-emerald-600 dark:text-emerald-400">
                  {t("Intelligence Hub", "Pusat Kecerdasan")}
                </span>
              </div>
              <h1 className="text-5xl md:text-6xl font-black text-slate-800 dark:text-white tracking-tighter">{t("Automation Control", "Kontrol Otomatisasi")}</h1>
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400">{t("Manage rules, safety behaviors, and automatic responses.", "Kelola aturan, perilaku keselamatan, dan respons otomatis.")}</p>
            </div>

            <div className="flex items-center gap-4">
                <div className="px-5 py-2.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 shadow-sm">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t("Current State", "Status Saat Ini")}</p>
                   <p className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">{decision.decisionSource === "MANUAL" ? t("Manual Override", "Kontrol Manual") : t("Auto Mode", "Mode Otomatis")}</p>
                </div>
                <button onClick={saveAndApply} disabled={isSaving} className="px-8 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs tracking-widest transition-all shadow-lg shadow-emerald-600/20 active:scale-95">
                  {isSaving ? t("SAVING....", "MENYIMPAN....") : t("SAVE & APPLY", "SIMPAN & TERAPKAN")}
                </button>
            </div>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Main Logic Configuration */}
          <div className="space-y-8 lg:col-span-8">
            <div className="rounded-[2.5rem] bg-white dark:bg-slate-900/40 p-10 shadow-xl border border-slate-200/60 dark:border-white/5 backdrop-blur-sm space-y-10">
              {/* Card Header with Auto-Calibrate */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-white/5">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <Sliders className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">{t("Sensor Sensitivity", "Sensitivitas Sensor")}</h2>
                    <p className="text-xs font-bold text-slate-400 dark:text-slate-500">{t("Configure how the system reacts to rain and light conditions.", "Konfigurasi bagaimana sistem bereaksi terhadap kondisi hujan dan cahaya.")}</p>
                  </div>
                </div>

                <div className="relative group">
                  <button 
                    onClick={applyAutoThreshold} 
                    className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black text-[11px] tracking-widest uppercase flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-500/10 active:scale-95"
                  >
                    <Zap className="h-4 w-4" /> {t("Auto-Calibrate", "Kalibrasi Otomatis")}
                  </button>
                  <div className="absolute right-0 top-full mt-2 hidden group-hover:block w-72 p-4 bg-slate-900 text-white text-[11px] leading-relaxed rounded-2xl border border-white/10 shadow-2xl z-20">
                    <p className="font-bold mb-1 text-emerald-400">{t("Auto-Calibrate", "Kalibrasi Otomatis")}</p>
                    {t("Reads the current sensor values and applies an optimal threshold offset for both rain and light detection based on current conditions.", "Membaca nilai sensor saat ini dan menerapkan offset batas optimal untuk deteksi hujan dan cahaya berdasarkan kondisi saat ini.")}
                  </div>
                </div>
              </div>

              {/* Grid Controls */}
              <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                
                {/* Rain Sensor Control (Segmented Control) */}
                <div className="flex flex-col h-full justify-between p-8 rounded-[2rem] bg-slate-50 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 shadow-sm space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-widest opacity-60 flex items-center gap-1.5">
                        <CloudRain className="h-4 w-4 text-sky-500" /> {t("Rain Sensitivity", "Sensitivitas Hujan")}
                      </span>
                      <span className="px-3 py-1 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 text-[10px] font-black uppercase tracking-wider">
                        {getRainModeLabel(currentRainMode)}
                      </span>
                    </div>
                    
                    {/* Segmented Buttons */}
                    <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-200/60 dark:bg-white/5 rounded-2xl">
                      {(Object.keys(RAIN_MODES) as RainMode[]).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setSettings((p) => ({ ...p, rainThreshold: modeToRainThreshold(mode) }))}
                          className={`py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${
                            currentRainMode === mode
                              ? "bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-md scale-[1.02]"
                              : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                          }`}
                        >
                          {getRainModeLabel(mode)}
                        </button>
                      ))}
                    </div>

                    <p className="mt-4 text-xs font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
                      {getRainModeDesc(currentRainMode)}
                    </p>
                  </div>

                  {/* Real-time Rain Visualizer Bar */}
                  <div className="pt-4 border-t border-slate-200/50 dark:border-white/5 space-y-2">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                      <span>{t("Rain Sensor (Live)", "Sensor Hujan (Langsung)")}</span>
                      <span>{sensorData?.rainVal ?? sensorData?.rainRaw ?? t("Dry", "Kering")}</span>
                    </div>
                    {/* Graphical Bar */}
                    <div className="relative w-full h-4 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                      {/* Threshold Boundary Marker Line */}
                      {(() => {
                        const threshPercent = Math.max(0, Math.min(100, Math.round(((4095 - settings.rainThreshold) / 4095) * 100)));
                        return (
                          <div 
                            className="absolute top-0 bottom-0 w-1 bg-rose-500 z-10 shadow-[0_0_8px_rgba(239,68,68,0.8)]"
                            style={{ left: `${threshPercent}%` }}
                            title={`Trigger threshold (${settings.rainThreshold})`}
                          >
                            <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[7px] font-black text-rose-500 uppercase tracking-widest leading-none bg-white dark:bg-slate-900 px-1 rounded">{t("Limit", "Batas")}</span>
                          </div>
                        );
                      })()}
                      
                      {/* Active Wetness progress bar */}
                      {(() => {
                        const rainRaw = sensorData?.rainVal ?? sensorData?.rainRaw ?? 4095;
                        const wetPercent = Math.max(0, Math.min(100, Math.round(((4095 - rainRaw) / 4095) * 100)));
                        const isTriggered = rainRaw < settings.rainThreshold;
                        return (
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              isTriggered 
                                ? "bg-gradient-to-r from-sky-400 to-sky-600 animate-pulse" 
                                : "bg-gradient-to-r from-teal-400 to-emerald-500"
                            }`}
                            style={{ width: `${wetPercent}%` }}
                          />
                        );
                      })()}
                    </div>
                    <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-slate-400">
                      <span>{t("Dry", "Kering")}</span>
                      <span>{t("Wet", "Basah")}</span>
                    </div>
                  </div>
                </div>

                {/* Light Sensor Control (Continuous discrete 5-level slider) */}
                <div className="flex flex-col justify-between h-full p-8 rounded-[2rem] bg-slate-50 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 shadow-sm space-y-8">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-widest opacity-60 flex items-center gap-1.5">
                        <Sun className="h-4 w-4 text-amber-500" /> {t("Light Sensitivity", "Sensitivitas Cahaya")}
                      </span>
                      <span className="px-3 py-1 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-black uppercase tracking-wider">
                        {t("Level", "Level")} {currentLightLevel} / 5 ({getLightLevelName(currentLightLevel)})
                      </span>
                    </div>

                    {/* 5-Level Discrete Slider */}
                    <div className="space-y-4">
                      <input 
                        type="range" 
                        min={1} 
                        max={5} 
                        step={1} 
                        value={currentLightLevel} 
                        onChange={(e) => setSettings((p) => ({ ...p, lightThreshold: levelToLightThreshold(Number(e.target.value)) }))} 
                        className="w-full h-2.5 bg-slate-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-amber-500" 
                      />
                      
                      <div className="flex justify-between text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">
                        <span>{t("Total Dark", "Gelap Gulita")}</span>
                        <span>{t("Overcast", "Mendung")}</span>
                        <span>{t("Dim Light", "Redup")}</span>
                      </div>
                    </div>

                    <p className="mt-4 text-xs font-medium text-slate-500 dark:text-slate-400 leading-relaxed h-12">
                      {getLightLevelDesc(currentLightLevel)}
                    </p>
                  </div>

                  {/* Real-time Light Visualizer Bar */}
                  <div className="pt-4 border-t border-slate-200/50 dark:border-white/5 space-y-2">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                      <span>{t("Ambient Light (Live)", "Cahaya Sekitar (Langsung)")}</span>
                      <span>{sensorData?.light !== undefined ? `${Math.round(sensorData.light)}` : t("Dark", "Gelap")}</span>
                    </div>
                    {/* Graphical Bar */}
                    <div className="relative w-full h-4 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                      {/* Threshold Boundary Marker Line */}
                      {(() => {
                        const threshPercent = Math.max(0, Math.min(100, Math.round((settings.lightThreshold / 4095) * 100)));
                        return (
                          <div 
                            className="absolute top-0 bottom-0 w-1 bg-amber-500 z-10 shadow-[0_0_8px_rgba(245,158,11,0.8)]"
                            style={{ left: `${threshPercent}%` }}
                            title={`Darkness threshold (${settings.lightThreshold})`}
                          >
                            <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[7px] font-black text-amber-500 uppercase tracking-widest leading-none bg-white dark:bg-slate-900 px-1 rounded">{t("Limit", "Batas")}</span>
                          </div>
                        );
                      })()}
                      
                      {/* Active Light level bar */}
                      {(() => {
                        const lightVal = sensorData?.light ?? 0;
                        const lightPercent = Math.max(0, Math.min(100, Math.round((lightVal / 4095) * 100)));
                        const isDarkTriggered = lightVal > settings.lightThreshold;
                        return (
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              isDarkTriggered 
                                ? "bg-gradient-to-r from-amber-300 to-yellow-500" 
                                : "bg-gradient-to-r from-indigo-500 to-slate-700"
                            }`}
                            style={{ width: `${lightPercent}%` }}
                          />
                        );
                      })()}
                    </div>
                    <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-slate-400">
                      <span>{t("Bright", "Terang")}</span>
                      <span>{t("Dark", "Gelap")}</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Toggle Protection Behaviors */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3 pt-6 border-t border-slate-100 dark:border-white/5">
                <ToggleButton label={t("Auto Close on Rain", "Tutup Otomatis saat Hujan")} active={settings.autoCloseOnRain} icon={<CloudRain className="h-4 w-4" />} onClick={(v) => setSettings(p => ({ ...p, autoCloseOnRain: v }))} />
                <ToggleButton label={t("Auto Close on Dark", "Tutup Otomatis saat Gelap")} active={settings.autoCloseOnDark} icon={<Timer className="h-4 w-4" />} onClick={(v) => setSettings(p => ({ ...p, autoCloseOnDark: v }))} />
                <ToggleButton label={t("Auto Open When Safe", "Buka Otomatis saat Aman")} active={settings.autoOpenWhenSafe} icon={<Zap className="h-4 w-4" />} onClick={(v) => setSettings(p => ({ ...p, autoOpenWhenSafe: v }))} />
              </div>

              {/* Progressive Disclosure: Developer / Power User Technical Settings Accordion */}
              <details className="group border border-slate-200/60 dark:border-white/10 rounded-2xl bg-slate-50 dark:bg-white/5 overflow-hidden transition-all duration-300">
                <summary className="flex items-center justify-between p-6 font-black text-[10px] tracking-widest text-slate-500 dark:text-slate-400 uppercase cursor-pointer select-none hover:bg-slate-100 dark:hover:bg-white/5 list-none">
                  <div className="flex items-center gap-2">
                    <Info className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <span>{t("Raw Sensor Values & Threshold Debug", "Nilai Sensor Mentah & Batas Debug")}</span>
                  </div>
                  <span className="text-xs transition-transform duration-300 group-open:rotate-180">▼</span>
                </summary>
                <div className="p-6 border-t border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/20 text-xs font-medium text-slate-600 dark:text-slate-300 space-y-4">
                  <div className="grid grid-cols-2 gap-6 font-mono text-[11px]">
                    <div className="space-y-2 p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                      <p className="font-bold text-slate-800 dark:text-slate-100 border-b border-slate-200 dark:border-white/5 pb-1 mb-2">{t("RAIN SENSOR", "SENSOR HUJAN")}</p>
                      <p>{t("Threshold:", "Batas:")} <span className="text-emerald-600 dark:text-emerald-400 font-bold">{settings.rainThreshold}</span> (ADC 0–4095)</p>
                      <p>{t("Live Value:", "Nilai Langsung:")} <span className="text-sky-600 dark:text-sky-400 font-bold">{sensorData?.rainVal ?? sensorData?.rainRaw ?? ("4095 (" + t("Dry", "Kering") + ")")}</span></p>
                      <p>{t("State:", "Status:")} <span className="font-bold uppercase">{(sensorData?.rainVal ?? sensorData?.rainRaw ?? 4095) < settings.rainThreshold ? t("WET", "BASAH") : t("DRY", "KERING")}</span></p>
                    </div>
                    <div className="space-y-2 p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                      <p className="font-bold text-slate-800 dark:text-slate-100 border-b border-slate-200 dark:border-white/5 pb-1 mb-2">{t("LIGHT SENSOR (LDR)", "SENSOR CAHAYA (LDR)")}</p>
                      <p>{t("Threshold:", "Batas:")} <span className="text-emerald-600 dark:text-emerald-400 font-bold">{settings.lightThreshold}</span> (ADC 0–4095)</p>
                      <p>{t("Live Value:", "Nilai Langsung:")} <span className="text-amber-600 dark:text-amber-400 font-bold">{sensorData?.light !== undefined ? `${Math.round(sensorData.light)}` : ("0 (" + t("Dark", "Gelap") + ")")}</span></p>
                      <p>{t("State:", "Status:")} <span className="font-bold uppercase">{(sensorData?.light ?? 0) > settings.lightThreshold ? t("DARK", "GELAP") : t("BRIGHT", "TERANG")}</span></p>
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30 flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <p className="text-[10px] leading-normal text-amber-700 dark:text-amber-300 uppercase tracking-wider font-bold">
                      {t("Rain sensor uses resistance-based detection — dry reads ~4000, wet drops below 500 instantly. Instant mode is recommended to trigger the motor before water reaches the clothesline.", "Sensor hujan menggunakan deteksi berbasis hambatan — kering terbaca ~4000, basah langsung turun di bawah 500. Mode instan disarankan untuk mengaktifkan motor sebelum air mengenai jemuran.")}
                    </p>
                  </div>
                </div>
              </details>

            </div>

            <div className="rounded-[2.5rem] bg-white dark:bg-slate-900/40 p-10 shadow-xl border border-slate-200/60 dark:border-white/5 backdrop-blur-sm overflow-hidden">
               <div className="flex items-center justify-between mb-10">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <Timer className="h-5 w-5" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">{t("Active Schedules", "Jadwal Aktif")}</h2>
                  </div>
                  <Link href={lang ? `/schedule?lang=${lang}` : "/schedule"} className="px-6 py-2.5 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 font-black text-[10px] tracking-widest flex items-center gap-2 hover:bg-slate-200 dark:hover:bg-white/10 transition-all uppercase">
                    {t("Configure", "Atur")} <ChevronRight className="h-3 w-3" />
                  </Link>
               </div>
               {loadingSchedules ? (
                  <div className="flex flex-col items-center justify-center py-20 opacity-30">
                     <Timer className="h-8 w-8 animate-pulse mb-4 text-emerald-500" />
                     <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t("Loading schedules...", "Memuat jadwal...")}</p>
                  </div>
               ) : schedules.length === 0 ? (
                 <div className="flex flex-col items-center justify-center py-20 bg-slate-50/50 dark:bg-white/5 rounded-[2rem] border border-dashed border-slate-200 dark:border-white/10">
                    <div className="h-16 w-16 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm mb-6">
                      <Timer className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center leading-relaxed">{t("No active override schedules found.", "Tidak ada jadwal override aktif yang ditemukan.")}<br/><span className="opacity-60">{t("System currently follows default business rules.", "Sistem saat ini mengikuti aturan operasional bawaan.")}</span></p>
                 </div>
               ) : (
                 <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                   {schedules.map((schedule) => {
                     const isTimeMatch = isWithinSchedule(
                       { id: schedule.id, startHour: schedule.startHour, endHour: schedule.endHour, enabled: true }, 
                       currentDecimalHour
                     );
                     
                     const pad = (n: number) => String(Math.floor(n)).padStart(2, "0");
                     const hStart = Math.floor(schedule.startHour);
                     const mStart = Math.round((schedule.startHour - hStart) * 60);
                     const hEnd = Math.floor(schedule.endHour);
                     const mEnd = Math.round((schedule.endHour - hEnd) * 60);
                     const timeStr = `${pad(hStart)}:${pad(mStart)} - ${pad(hEnd)}:${pad(mEnd)}`;

                     return (
                       <div key={schedule.id} className={`flex items-center justify-between p-6 rounded-[1.5rem] border transition-all ${isTimeMatch ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-slate-50 dark:bg-white/5 border-slate-200/50 dark:border-white/5'}`}>
                          <div className="flex items-center gap-4">
                             <div className={`p-3 rounded-xl ${isTimeMatch ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-slate-200 dark:bg-white/10 text-slate-500'}`}>
                               <Clock className="h-5 w-5" />
                             </div>
                             <div>
                                <h3 className={`text-sm font-black uppercase tracking-tight whitespace-nowrap ${isTimeMatch ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-800 dark:text-white'}`}>{timeStr}</h3>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{schedule.name}</p>
                             </div>
                          </div>
                          {isTimeMatch ? (
                            <span className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500 text-white text-[9px] font-black uppercase tracking-[0.2em] shadow-lg shadow-emerald-500/20 whitespace-nowrap">
                               <Zap className="h-3 w-3" /> {t("Running", "Berjalan")}
                            </span>
                          ) : (
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t("Waiting", "Menunggu")}</span>
                          )}
                       </div>
                     );
                   })}
                 </div>
               )}
            </div>
          </div>

          {/* Quick Stats & Logs */}
          <aside className="space-y-8 lg:col-span-4">
             <section className="rounded-[2.5rem] bg-white dark:bg-slate-900/40 p-10 shadow-xl border border-slate-200/60 dark:border-white/5 backdrop-blur-sm">
                <div className="flex items-center gap-3 mb-8">
                  <Zap className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  <h2 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">{t("Quick Actions", "Tindakan Cepat")}</h2>
                </div>
                <div className="grid grid-cols-1 gap-4">
                   <QuickActionButton label={t("Automatic", "Otomatis")} onClick={() => sendCommand("AUTO")} active={decision.decisionSource === "AUTO"} />
                   <div className="grid grid-cols-2 gap-4">
                      <QuickActionButton label={t("Open", "Buka")} onClick={() => sendCommand("OPEN")} />
                      <QuickActionButton label={t("Close", "Tutup")} onClick={() => sendCommand("CLOSE")} />
                   </div>
                </div>
             </section>

             <section className="rounded-[2.5rem] bg-white dark:bg-slate-900/40 p-10 shadow-xl border border-slate-200/60 dark:border-white/5 backdrop-blur-sm">
                <div className="flex items-center gap-3 mb-8">
                  <History className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  <h2 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">{t("Activity Log", "Log Aktivitas")}</h2>
                </div>
                <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                   {automationEvents.length === 0 ? (
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center py-16 opacity-30">{t("No recent activity", "Tidak ada aktivitas terbaru")}</p>
                   ) : (
                     automationEvents.map((item, index) => (
                       <div key={index} className="flex gap-6 group">
                          <div className="flex flex-col items-center">
                             <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.4)] transition-all group-hover:scale-125" />
                             {index < automationEvents.length - 1 && <div className="h-full w-px bg-slate-200 dark:bg-white/10 mt-2" />}
                          </div>
                          <div className="pb-6">
                             <p className="text-xs font-black text-slate-800 dark:text-white leading-none mb-2 uppercase tracking-tight">{item.action}</p>
                             <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{formatClock(item.timestamp)}</p>
                          </div>
                       </div>
                     ))
                   )}
                </div>
             </section>

             <section className="rounded-[2.5rem] bg-white dark:bg-slate-900/40 p-10 shadow-xl border border-slate-200/60 dark:border-white/5 backdrop-blur-sm">
                <div className="flex items-center gap-3 mb-8">
                  <Shield className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  <h2 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">{t("Safety Guard", "Pelindung Keamanan")}</h2>
                </div>
                <div className="space-y-4">
                   <SafetyIndicator label={t("Rain Protection", "Perlindungan Hujan")} active={true} icon={<CloudRain className="h-4 w-4" />} lang={lang} />
                   <SafetyIndicator label={t("Hardware Fail-safe", "Keamanan Gagal Perangkat Keras")} active={decision.decisionSource === "SAFETY"} icon={<Shield className="h-4 w-4" />} lang={lang} />
                   <SafetyIndicator label={t("Update Cycle", "Siklus Pembaruan")} active={true} value={`${settings.updateIntervalSec}s`} icon={<Timer className="h-4 w-4" />} lang={lang} />
                </div>
             </section>
          </aside>
        </section>
      </PageContainer>
    </main>
  );
}

function ToggleButton({ label, active, icon, onClick }: { label: string; active: boolean; icon: React.ReactNode; onClick: (v: boolean) => void }) {
  return (
    <button onClick={() => onClick(!active)} className={`flex items-center justify-between gap-4 p-6 rounded-[2rem] border transition-all ${active ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 shadow-sm shadow-emerald-500/5' : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/5 text-slate-500 dark:text-slate-400'}`}>
       <div className="flex items-center gap-4">
          <div className={`p-3 rounded-xl transition-colors ${active ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-white/10 text-slate-500'}`}>{icon}</div>
          <span className="text-[10px] font-black uppercase tracking-widest leading-none">{label}</span>
       </div>
       <div className={`h-2.5 w-2.5 rounded-full transition-all ${active ? 'bg-emerald-500 animate-pulse scale-110 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-300 dark:bg-slate-700'}`} />
    </button>
  );
}

function QuickActionButton({ label, onClick, active }: { label: string; onClick: () => void; active?: boolean }) {
  return (
    <button onClick={onClick} className={`px-6 py-5 rounded-[2rem] font-black text-[10px] tracking-widest uppercase transition-all active:scale-95 ${active ? 'bg-emerald-500 text-white shadow-xl shadow-emerald-500/20' : 'bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 text-slate-800 dark:text-white hover:bg-slate-100 dark:hover:bg-white/10'}`}>
       {label}
    </button>
  );
}

function SafetyIndicator({ label, active, value, icon, lang = "en" }: { label: string; active: boolean; value?: string; icon: React.ReactNode; lang?: string }) {
  const t = (en: string, id: string) => (lang === "id" ? id : en);
  return (
    <div className="flex items-center justify-between p-6 rounded-[1.5rem] bg-slate-50 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 group hover:border-emerald-500/30 transition-all">
       <div className="flex items-center gap-4">
          <div className="text-slate-400 group-hover:text-emerald-500 transition-colors">{icon}</div>
          <span className="text-[10px] font-black text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300 uppercase tracking-widest transition-colors">{label}</span>
       </div>
       <span className={`text-[10px] font-black uppercase tracking-widest ${active ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>{value ?? (active ? t("ACTIVE", "AKTIF") : t("STANDBY", "SIAGA"))}</span>
    </div>
  );
}
