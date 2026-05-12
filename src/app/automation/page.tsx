"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Bot, CloudRain, Settings2, Shield, Timer, Zap, History, ChevronRight } from "lucide-react";
import PageContainer from "@/components/layout/PageContainer";
import { useSystemState } from "@/hooks/useSystemState";
import { formatClock } from "@/utils/timeFormat";

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

  const saveAndApply = () => {
    const next = { ...settings };
    try {
      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      const prev = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ ...prev, ...next }));
    } catch {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next));
    }
    publishConfig(next);
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
        <header className="relative overflow-hidden rounded-[2.5rem] bg-white dark:bg-slate-900/50 p-8 md:p-10 shadow-2xl border border-slate-200/60 dark:border-white/5 backdrop-blur-sm">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-emerald-500/10 blur-[80px]" />
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
              <h1 className="text-4xl font-black text-slate-800 dark:text-white tracking-tight">Automation Control</h1>
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Manage rules, safety behaviors, and autonomous responses.</p>
            </div>

            <div className="flex items-center gap-4">
                <div className="px-5 py-2.5 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 shadow-sm">
                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Current State</p>
                   <p className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">{decision.decisionSource === "MANUAL" ? "Manual Override" : "Autonomous"}</p>
                </div>
                <button onClick={saveAndApply} className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs tracking-widest transition-all shadow-lg shadow-emerald-600/20 active:scale-95">
                  SAVE & APPLY
                </button>
            </div>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Main Logic Configuration */}
          <div className="space-y-8 lg:col-span-8">
            <div className="rounded-[2rem] bg-white dark:bg-slate-900/40 p-8 shadow-xl border border-slate-200/60 dark:border-white/5 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <Settings2 className="h-5 w-5" />
                  </div>
                  <h2 className="text-lg font-bold text-slate-800 dark:text-white tracking-tight">Logic Parameters</h2>
                </div>
                <button onClick={applyAutoThreshold} className="text-[10px] font-black text-emerald-600 hover:text-emerald-700 uppercase tracking-widest flex items-center gap-2">
                   <Zap className="h-3 w-3" /> Auto-Tune
                </button>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <label className="block p-6 rounded-[1.5rem] bg-slate-50 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 transition-colors group focus-within:border-emerald-500/50">
                    <div className="flex items-center justify-between mb-4">
                       <span className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-widest">Rain Threshold</span>
                       <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">{settings.rainThreshold}</span>
                    </div>
                    <input type="range" min={200} max={4000} step={50} value={settings.rainThreshold} onChange={(e) => setSettings((p) => ({ ...p, rainThreshold: Number(e.target.value) }))} className="w-full h-1.5 bg-slate-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-emerald-500" />
                    <p className="mt-4 text-[10px] font-bold text-slate-400 leading-tight uppercase tracking-widest">Lower is more sensitive</p>
                  </label>
                </div>
                <div className="space-y-4">
                  <label className="block p-6 rounded-[1.5rem] bg-slate-50 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 transition-colors group focus-within:border-emerald-500/50">
                    <div className="flex items-center justify-between mb-4">
                       <span className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-widest">Light Threshold</span>
                       <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">{settings.lightThreshold}</span>
                    </div>
                    <input type="range" min={500} max={10000} step={50} value={settings.lightThreshold} onChange={(e) => setSettings((p) => ({ ...p, lightThreshold: Number(e.target.value) }))} className="w-full h-1.5 bg-slate-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-emerald-500" />
                    <p className="mt-4 text-[10px] font-bold text-slate-400 leading-tight uppercase tracking-widest">Ambient light reference</p>
                  </label>
                </div>
              </div>

              <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
                <ToggleButton label="Rain Protection" active={settings.autoCloseOnRain} icon={<CloudRain className="h-4 w-4" />} onClick={(v) => setSettings(p => ({ ...p, autoCloseOnRain: v }))} />
                <ToggleButton label="Night Security" active={settings.autoCloseOnDark} icon={<Timer className="h-4 w-4" />} onClick={(v) => setSettings(p => ({ ...p, autoCloseOnDark: v }))} />
                <ToggleButton label="Auto Resumption" active={settings.autoOpenWhenSafe} icon={<Zap className="h-4 w-4" />} onClick={(v) => setSettings(p => ({ ...p, autoOpenWhenSafe: v }))} />
              </div>
            </div>

            <div className="rounded-[2rem] bg-white dark:bg-slate-900/40 p-8 shadow-xl border border-slate-200/60 dark:border-white/5 backdrop-blur-sm overflow-hidden">
               <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <Timer className="h-5 w-5" />
                    </div>
                    <h2 className="text-lg font-bold text-slate-800 dark:text-white tracking-tight">Active Schedules</h2>
                  </div>
                  <Link href="/schedule" className="px-5 py-2 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 font-bold text-[10px] tracking-widest flex items-center gap-2 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors uppercase">
                    Configure <ChevronRight className="h-3 w-3" />
                  </Link>
               </div>
               <div className="flex flex-col items-center justify-center py-12 bg-slate-50/50 dark:bg-white/5 rounded-3xl border border-dashed border-slate-200 dark:border-white/10">
                  <div className="h-12 w-12 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm mb-4">
                    <Timer className="h-6 w-6 text-slate-400" />
                  </div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest text-center">No active override schedules found.<br/><span className="text-[10px] opacity-60">System currently follows default business rules.</span></p>
               </div>
            </div>
          </div>

          {/* Quick Stats & Logs */}
          <aside className="space-y-8 lg:col-span-4">
             <section className="rounded-[2rem] bg-white dark:bg-slate-900/40 p-8 shadow-xl border border-slate-200/60 dark:border-white/5 backdrop-blur-sm">
                <div className="flex items-center gap-3 mb-6">
                  <Zap className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  <h2 className="text-lg font-bold text-slate-800 dark:text-white tracking-tight">Quick Actions</h2>
                </div>
                <div className="grid grid-cols-1 gap-3">
                   <QuickActionButton label="Autonomous" onClick={() => sendCommand("AUTO")} active={decision.decisionSource === "AUTO"} />
                   <div className="grid grid-cols-2 gap-3">
                      <QuickActionButton label="Open" onClick={() => sendCommand("OPEN")} />
                      <QuickActionButton label="Close" onClick={() => sendCommand("CLOSE")} />
                   </div>
                </div>
             </section>

             <section className="rounded-[2rem] bg-white dark:bg-slate-900/40 p-8 shadow-xl border border-slate-200/60 dark:border-white/5 backdrop-blur-sm">
                <div className="flex items-center gap-3 mb-6">
                  <History className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  <h2 className="text-lg font-bold text-slate-800 dark:text-white tracking-tight">Activity Log</h2>
                </div>
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                   {automationEvents.length === 0 ? (
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center py-10">No recent activity</p>
                   ) : (
                     automationEvents.map((item, index) => (
                       <div key={index} className="flex gap-4">
                          <div className="flex flex-col items-center">
                             <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                             {index < automationEvents.length - 1 && <div className="h-full w-px bg-slate-200 dark:bg-white/10 mt-1" />}
                          </div>
                          <div className="pb-4">
                             <p className="text-xs font-bold text-slate-800 dark:text-white leading-none mb-1">{item.action}</p>
                             <p className="text-[9px] font-semibold text-slate-500 dark:text-slate-400">{formatClock(item.timestamp)}</p>
                          </div>
                       </div>
                     ))
                   )}
                </div>
             </section>

             <section className="rounded-[2rem] bg-white dark:bg-slate-900/40 p-8 shadow-xl border border-slate-200/60 dark:border-white/5 backdrop-blur-sm">
                <div className="flex items-center gap-3 mb-6">
                  <Shield className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  <h2 className="text-lg font-bold text-slate-800 dark:text-white tracking-tight">Environmental Guard</h2>
                </div>
                <div className="space-y-3">
                   <SafetyIndicator label="Rain Protection" active={true} icon={<CloudRain className="h-3.5 w-3.5" />} />
                   <SafetyIndicator label="Hardware Fail-safe" active={decision.decisionSource === "SAFETY"} icon={<Shield className="h-3.5 w-3.5" />} />
                   <SafetyIndicator label="Update Cycle" active={true} value={`${settings.updateIntervalSec}s`} icon={<Timer className="h-3.5 w-3.5" />} />
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
    <button onClick={() => onClick(!active)} className={`flex items-center justify-between gap-3 p-4 rounded-2xl border transition-all ${active ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 shadow-sm shadow-emerald-500/5' : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/5 text-slate-500 dark:text-slate-400'}`}>
       <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${active ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-white/10 text-slate-500'}`}>{icon}</div>
          <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
       </div>
       <div className={`h-2 w-2 rounded-full ${active ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300 dark:bg-slate-700'}`} />
    </button>
  );
}

function QuickActionButton({ label, onClick, active }: { label: string; onClick: () => void; active?: boolean }) {
  return (
    <button onClick={onClick} className={`px-4 py-4 rounded-2xl font-black text-[10px] tracking-widest uppercase transition-all active:scale-95 ${active ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 text-slate-800 dark:text-white hover:bg-slate-100 dark:hover:bg-white/10'}`}>
       {label}
    </button>
  );
}

function SafetyIndicator({ label, active, value, icon }: { label: string; active: boolean; value?: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/50 dark:border-white/5">
       <div className="flex items-center gap-3">
          <div className="text-slate-400">{icon}</div>
          <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">{label}</span>
       </div>
       <span className={`text-[10px] font-black uppercase tracking-widest ${active ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>{value ?? (active ? "ACTIVE" : "STANDBY")}</span>
    </div>
  );
}

