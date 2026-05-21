"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Bot, CloudRain, Settings2, Shield, Timer, Zap, History, ChevronRight, Clock } from "lucide-react";
import PageContainer from "@/components/layout/PageContainer";
import { useSystemState } from "@/hooks/useSystemState";
import { formatClock } from "@/utils/timeFormat";
import { ScheduleService, type FirebaseScheduleItem } from "@/services/ScheduleService";
import { useAuth } from "@/hooks/useAuth";
import { isWithinSchedule } from "@/features/system/ScheduleEngine";

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
  light: number;
}) {
  const rainRaw = sensor.rainVal ?? sensor.rainRaw;

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
      sensor.light + LIGHT_THRESHOLD_OFFSET,
      MIN_LIGHT_THRESHOLD,
      MAX_LIGHT_THRESHOLD
    ),
  };
}

export default function AutomationPage() {
  const { decision, sendCommand, publishConfig, events, sensorData } = useSystemState();
  const [settings, setSettings] = useState<AutomationSettings>(defaults);
  const [isSaving, setIsSaving] = useState(false);

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
                  Intelligence Hub
                </span>
              </div>
              <h1 className="text-5xl md:text-6xl font-black text-slate-800 dark:text-white tracking-tighter">Automation Control</h1>
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Manage rules, safety behaviors, and automatic responses.</p>
            </div>

            <div className="flex items-center gap-4">
                <div className="px-5 py-2.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 shadow-sm">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Current State</p>
                   <p className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">{decision.decisionSource === "MANUAL" ? "Manual Override" : "Auto Mode"}</p>
                </div>
                <button onClick={saveAndApply} disabled={isSaving} className="px-8 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs tracking-widest transition-all shadow-lg shadow-emerald-600/20 active:scale-95">
                  {isSaving ? "SAVING...." : "SAVE & APPLY"}
                </button>
            </div>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Main Logic Configuration */}
          <div className="space-y-8 lg:col-span-8">
            <div className="rounded-[2.5rem] bg-white dark:bg-slate-900/40 p-10 shadow-xl border border-slate-200/60 dark:border-white/5 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <Settings2 className="h-5 w-5" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">Logic Parameters</h2>
                </div>
                <button onClick={applyAutoThreshold} className="text-[10px] font-black text-emerald-600 hover:text-emerald-700 uppercase tracking-widest flex items-center gap-2 transition-colors">
                   <Zap className="h-3 w-3" /> Auto-Tune
                </button>
              </div>

              <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                <div className="space-y-4">
                  <label className="block p-8 rounded-[2rem] bg-slate-50 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 transition-all group focus-within:border-emerald-500/50">
                    <div className="flex items-center justify-between mb-6">
                       <span className="text-[10px] font-black text-slate-800 dark:text-white uppercase tracking-widest opacity-60">Rain Threshold</span>
                       <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">{settings.rainThreshold}</span>
                    </div>
                    <input type="range" min={200} max={4000} step={50} value={settings.rainThreshold} onChange={(e) => setSettings((p) => ({ ...p, rainThreshold: Number(e.target.value) }))} className="w-full h-2 bg-slate-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-emerald-500" />
                    <p className="mt-6 text-[9px] font-black text-slate-400 leading-tight uppercase tracking-[0.2em]">Lower is more sensitive</p>
                  </label>
                </div>
                <div className="space-y-4">
                  <label className="block p-8 rounded-[2rem] bg-slate-50 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 transition-all group focus-within:border-emerald-500/50">
                    <div className="flex items-center justify-between mb-6">
                       <span className="text-[10px] font-black text-slate-800 dark:text-white uppercase tracking-widest opacity-60">Light Threshold</span>
                       <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">{settings.lightThreshold}</span>
                    </div>
                    <input type="range" min={500} max={10000} step={50} value={settings.lightThreshold} onChange={(e) => setSettings((p) => ({ ...p, lightThreshold: Number(e.target.value) }))} className="w-full h-2 bg-slate-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-emerald-500" />
                    <p className="mt-6 text-[9px] font-black text-slate-400 leading-tight uppercase tracking-[0.2em]">Ambient light reference</p>
                  </label>
                </div>
              </div>

              <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
                <ToggleButton label="Auto Close on Rain" active={settings.autoCloseOnRain} icon={<CloudRain className="h-4 w-4" />} onClick={(v) => setSettings(p => ({ ...p, autoCloseOnRain: v }))} />
                <ToggleButton label="Auto Close on Dark" active={settings.autoCloseOnDark} icon={<Timer className="h-4 w-4" />} onClick={(v) => setSettings(p => ({ ...p, autoCloseOnDark: v }))} />
                <ToggleButton label="Auto Open When Safe" active={settings.autoOpenWhenSafe} icon={<Zap className="h-4 w-4" />} onClick={(v) => setSettings(p => ({ ...p, autoOpenWhenSafe: v }))} />
              </div>
            </div>

            <div className="rounded-[2.5rem] bg-white dark:bg-slate-900/40 p-10 shadow-xl border border-slate-200/60 dark:border-white/5 backdrop-blur-sm overflow-hidden">
               <div className="flex items-center justify-between mb-10">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <Timer className="h-5 w-5" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">Active Schedules</h2>
                  </div>
                  <Link href="/schedule" className="px-6 py-2.5 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 font-black text-[10px] tracking-widest flex items-center gap-2 hover:bg-slate-200 dark:hover:bg-white/10 transition-all uppercase">
                    Configure <ChevronRight className="h-3 w-3" />
                  </Link>
               </div>
               {loadingSchedules ? (
                  <div className="flex flex-col items-center justify-center py-20 opacity-30">
                     <Timer className="h-8 w-8 animate-pulse mb-4 text-emerald-500" />
                     <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Loading schedules...</p>
                  </div>
               ) : schedules.length === 0 ? (
                 <div className="flex flex-col items-center justify-center py-20 bg-slate-50/50 dark:bg-white/5 rounded-[2rem] border border-dashed border-slate-200 dark:border-white/10">
                    <div className="h-16 w-16 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm mb-6">
                      <Timer className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center leading-relaxed">No active override schedules found.<br/><span className="opacity-60">System currently follows default business rules.</span></p>
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
                               <Zap className="h-3 w-3" /> Running
                            </span>
                          ) : (
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Waiting</span>
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
                  <h2 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">Quick Actions</h2>
                </div>
                <div className="grid grid-cols-1 gap-4">
                   <QuickActionButton label="Automatic" onClick={() => sendCommand("AUTO")} active={decision.decisionSource === "AUTO"} />
                   <div className="grid grid-cols-2 gap-4">
                      <QuickActionButton label="Open" onClick={() => sendCommand("OPEN")} />
                      <QuickActionButton label="Close" onClick={() => sendCommand("CLOSE")} />
                   </div>
                </div>
             </section>

             <section className="rounded-[2.5rem] bg-white dark:bg-slate-900/40 p-10 shadow-xl border border-slate-200/60 dark:border-white/5 backdrop-blur-sm">
                <div className="flex items-center gap-3 mb-8">
                  <History className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  <h2 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">Activity Log</h2>
                </div>
                <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                   {automationEvents.length === 0 ? (
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center py-16 opacity-30">No recent activity</p>
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
                  <h2 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">Safety Guard</h2>
                </div>
                <div className="space-y-4">
                   <SafetyIndicator label="Rain Protection" active={true} icon={<CloudRain className="h-4 w-4" />} />
                   <SafetyIndicator label="Hardware Fail-safe" active={decision.decisionSource === "SAFETY"} icon={<Shield className="h-4 w-4" />} />
                   <SafetyIndicator label="Update Cycle" active={true} value={`${settings.updateIntervalSec}s`} icon={<Timer className="h-4 w-4" />} />
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

function SafetyIndicator({ label, active, value, icon }: { label: string; active: boolean; value?: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between p-6 rounded-[1.5rem] bg-slate-50 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 group hover:border-emerald-500/30 transition-all">
       <div className="flex items-center gap-4">
          <div className="text-slate-400 group-hover:text-emerald-500 transition-colors">{icon}</div>
          <span className="text-[10px] font-black text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300 uppercase tracking-widest transition-colors">{label}</span>
       </div>
       <span className={`text-[10px] font-black uppercase tracking-widest ${active ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>{value ?? (active ? "ACTIVE" : "STANDBY")}</span>
    </div>
  );
}


