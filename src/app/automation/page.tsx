"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CloudRain, Settings2, Shield, Timer } from "lucide-react";
import PageContainer from "@/components/layout/PageContainer";
import { useSystemState } from "@/hooks/useSystemState";

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

export default function AutomationPage() {
  const { decision, sendCommand, publishConfig, events } = useSystemState();
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
    () => events.slice(0, 8),
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

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 dark:from-slate-900 dark:to-slate-950">
      <PageContainer className="space-y-5">
        <header className="space-y-1">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Automation Control Center</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Manage schedules, safety behavior, and automatic responses.</p>
        </header>

        <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs uppercase tracking-wide text-slate-500">Mode</p>
            <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">{decision.decisionSource === "MANUAL" ? "Manual" : "Auto"}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs uppercase tracking-wide text-slate-500">Schedule State</p>
            <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">{decision.scheduleActive ? "Active" : "Inactive"}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs uppercase tracking-wide text-slate-500">Safety Status</p>
            <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">{decision.decisionSource === "SAFETY" ? "Triggered" : "Safe"}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs uppercase tracking-wide text-slate-500">Current Decision</p>
            <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">{decision.recommendedStatus}</p>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-12">
          <div className="space-y-4 xl:col-span-8">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">Automation Policies</h2>
                <button onClick={saveAndApply} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700">Save & Apply</button>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Rain Threshold</p>
                  <input type="range" min={200} max={4000} step={50} value={settings.rainThreshold} onChange={(e) => setSettings((p) => ({ ...p, rainThreshold: Number(e.target.value) }))} className="mt-2 w-full accent-emerald-600" />
                  <p className="mt-1 text-xs text-slate-500">{settings.rainThreshold}</p>
                </label>
                <label className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Light Threshold</p>
                  <input type="range" min={500} max={4095} step={50} value={settings.lightThreshold} onChange={(e) => setSettings((p) => ({ ...p, lightThreshold: Number(e.target.value) }))} className="mt-2 w-full accent-emerald-600" />
                  <p className="mt-1 text-xs text-slate-500">{settings.lightThreshold}</p>
                </label>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-3">
                <label className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700"><span>Auto close on rain</span><input type="checkbox" checked={settings.autoCloseOnRain} onChange={(e) => setSettings((p) => ({ ...p, autoCloseOnRain: e.target.checked }))} /></label>
                <label className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700"><span>Auto close on dark</span><input type="checkbox" checked={settings.autoCloseOnDark} onChange={(e) => setSettings((p) => ({ ...p, autoCloseOnDark: e.target.checked }))} /></label>
                <label className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700"><span>Auto open when safe</span><input type="checkbox" checked={settings.autoOpenWhenSafe} onChange={(e) => setSettings((p) => ({ ...p, autoOpenWhenSafe: e.target.checked }))} /></label>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">Schedule Manager</h2>
                <Link href="/schedule" className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">Open Full Schedule</Link>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300">Use the schedule page for full CRUD. This control center keeps automation context centralized.</p>
            </div>
          </div>

          <aside className="space-y-4 xl:col-span-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">Quick Actions</h3>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <button onClick={() => sendCommand("AUTO")} className="rounded-lg border border-slate-200 px-2 py-2 text-xs font-semibold dark:border-slate-700">Auto</button>
                <button onClick={() => sendCommand("OPEN")} className="rounded-lg border border-slate-200 px-2 py-2 text-xs font-semibold dark:border-slate-700">Open</button>
                <button onClick={() => sendCommand("CLOSE")} className="rounded-lg border border-slate-200 px-2 py-2 text-xs font-semibold dark:border-slate-700">Close</button>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">Automation Activity Logs</h3>
              <div className="mt-3 space-y-2">
                {automationEvents.length === 0 ? <p className="text-xs text-slate-500">No automation logs yet.</p> : automationEvents.map((item, index) => (
                  <div key={`${item.timestamp}-${item.action}-${index}`} className="rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-950">
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{item.action}</p>
                    <p className="mt-0.5 text-[11px] text-slate-500">{new Date(item.timestamp).toLocaleTimeString("en-US")}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">Safety Indicators</h3>
              <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                <p className="flex items-center gap-2"><Shield size={14} /> Fallback logic active</p>
                <p className="flex items-center gap-2"><CloudRain size={14} /> Rain response protection</p>
                <p className="flex items-center gap-2"><AlertTriangle size={14} /> Retry behavior managed by MQTT ACK flow</p>
                <p className="flex items-center gap-2"><Timer size={14} /> Update interval {settings.updateIntervalSec}s</p>
                <p className="flex items-center gap-2"><Settings2 size={14} /> Business rules remain unchanged</p>
              </div>
            </div>
          </aside>
        </section>
      </PageContainer>
    </main>
  );
}
