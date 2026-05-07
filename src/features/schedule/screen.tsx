"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Clock, Loader2, Lock, Plus, Power, RefreshCw, ShieldCheck, Trash2 } from "lucide-react";
import { useSystemState } from "@/hooks/useSystemState";
import { isWithinSchedule } from "@/features/system/ScheduleEngine";
import { ScheduleService, type FirebaseScheduleItem } from "@/services/ScheduleService";
import { mqttService } from "@/services/MQTTService"; 

type FormState = { name: string; timeOpen: string; timeClose: string; };
const initialForm: FormState = { name: "", timeOpen: "08:00", timeClose: "10:00" };

function formatWindow(startHour: number, endHour: number): string {
  const pad = (n: number) => String(Math.floor(n)).padStart(2, "0");
  const hStart = Math.floor(startHour);
  const mStart = Math.round((startHour - hStart) * 60);
  const hEnd = Math.floor(endHour);
  const mEnd = Math.round((endHour - hEnd) * 60);
  return `${pad(hStart)}:${pad(mStart)} - ${pad(hEnd)}:${pad(mEnd)}`;
}

export default function SchedulePage() {
  const { isOnline } = useSystemState(); 
  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState<FirebaseScheduleItem[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(initialForm);
  const [errorMessage, setErrorMessage] = useState("");
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [userAllowedAuto, setUserAllowedAuto] = useState(false);
  const [isSettingOverride, setIsSettingOverride] = useState(false);
  
  const wasActiveRef = useRef<boolean | null>(null);

  const loadScheduleData = async () => {
    try {
      const [scheduleResult, override] = await Promise.all([
        ScheduleService.loadSchedules(),
        ScheduleService.getSystemOverride(),
      ]);
      setSchedules(scheduleResult.schedules);
      setUserAllowedAuto(override);
    } catch (err) {
      console.error("Load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    mqttService.onConnectionStatus((status) => console.log("[MQTT]:", status.state));
    void ScheduleService.migrateLegacyLocalSchedulesOnce().then(() => { void loadScheduleData(); });
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => { setCurrentTime(new Date()); }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const onUpdate = () => { void loadScheduleData(); };
    window.addEventListener("schedule-updated", onUpdate);
    return () => window.removeEventListener("schedule-updated", onUpdate);
  }, []);

  const currentDecimalHour = useMemo(() => {
    return currentTime.getHours() + currentTime.getMinutes() / 60 + currentTime.getSeconds() / 3600;
  }, [currentTime]);
  
  const isCurrentlyActiveGlobal = useMemo(() => {
    return schedules.some((s) => 
      isWithinSchedule({ id: s.id, startHour: s.startHour, endHour: s.endHour, enabled: s.enabled }, currentDecimalHour)
    );
  }, [currentDecimalHour, schedules]);

  useEffect(() => {
    if (loading) return;

    if (wasActiveRef.current === null) {
      wasActiveRef.current = isCurrentlyActiveGlobal;
      return;
    }

    if (!wasActiveRef.current && isCurrentlyActiveGlobal) {
      void ScheduleService.setSystemOverride(true);
      setUserAllowedAuto(true);
    }

    if (wasActiveRef.current && !isCurrentlyActiveGlobal) {
      void ScheduleService.setSystemOverride(false);
      setUserAllowedAuto(false);
    }
    
    wasActiveRef.current = isCurrentlyActiveGlobal;
  }, [isCurrentlyActiveGlobal, loading, schedules.length]);

  const onResetToAuto = async () => {
    setIsSettingOverride(true);
    try { 
      await ScheduleService.setSystemOverride(true); 
      setUserAllowedAuto(true); 
    } finally { 
      setIsSettingOverride(false); 
    }
  };

  const onSubmitSchedule = async () => {
    if (!form.name.trim()) { setErrorMessage("Name required"); return; }
    if (form.timeOpen >= form.timeClose) { setErrorMessage("Invalid time range"); return; }
    try {
      await ScheduleService.addSchedule({
        name: form.name.trim(),
        startHour: ScheduleService.parseTimeToFloat(form.timeOpen),
        endHour: ScheduleService.parseTimeToFloat(form.timeClose),
        enabled: true,
      });
      setForm(initialForm); setIsFormOpen(false); void loadScheduleData();
    } catch { setErrorMessage("Save failed"); }
  };

  return (
    <div className="flex min-h-screen flex-col gap-6 bg-slate-50 p-6 dark:bg-slate-950">
      {/* Header Section */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold dark:text-slate-100">Schedule Manager</h1>
          <div className="mt-1 flex items-center gap-2">
            <p className="text-sm text-slate-500">Status: {isOnline ? "Online" : "Offline"}</p>
            <div className={`flex items-center gap-1 rounded border px-2 py-0.5 text-[10px] font-mono ${userAllowedAuto ? "border-green-100 bg-green-50 text-green-700" : "border-amber-100 bg-amber-50 text-amber-700"}`}>
              {userAllowedAuto ? <ShieldCheck size={10} /> : <Lock size={10} />} MODE: {userAllowedAuto ? "AUTO" : "MANUAL"}
            </div>
            <div className={`rounded border px-2 py-0.5 text-[10px] font-semibold ${isCurrentlyActiveGlobal ? "border-emerald-100 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-600"}`}>
              Schedule {isCurrentlyActiveGlobal ? "ACTIVE" : "INACTIVE"}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={onResetToAuto} disabled={isSettingOverride} className="flex items-center gap-2 rounded-lg border bg-white px-4 py-2 text-sm font-medium dark:bg-slate-800 shadow-sm transition-all hover:bg-slate-50">
            <RefreshCw size={18} className={isSettingOverride ? "animate-spin" : ""} /> Reset to Auto
          </button>
          <button type="button" onClick={() => setIsFormOpen(!isFormOpen)} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-md hover:bg-blue-700">
            <Plus size={18} /> {isFormOpen ? "Close" : "Add"}
          </button>
        </div>
      </div>

      {/* Form Section */}
      {isFormOpen && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <input type="text" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} placeholder="Schedule Name" className="rounded-lg border p-2 text-sm dark:bg-slate-950 dark:text-white" />
            <input type="time" value={form.timeOpen} onChange={(e) => setForm({...form, timeOpen: e.target.value})} className="rounded-lg border p-2 text-sm dark:bg-slate-950 dark:text-white" />
            <input type="time" value={form.timeClose} onChange={(e) => setForm({...form, timeClose: e.target.value})} className="rounded-lg border p-2 text-sm dark:bg-slate-950 dark:text-white" />
          </div>
          {errorMessage && <p className="mt-2 text-xs text-red-500">{errorMessage}</p>}
          <div className="mt-4 flex justify-end"><button onClick={onSubmitSchedule} className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm hover:opacity-90">Save Schedule</button></div>
        </div>
      )}

      {/* List Section */}
      <div className="space-y-4">
        {loading ? (
          <Loader2 className="mx-auto animate-spin text-blue-500" />
        ) : (
          schedules.map((schedule) => {
            const isTimeMatch = isWithinSchedule(
              { id: schedule.id, startHour: schedule.startHour, endHour: schedule.endHour, enabled: true }, 
              currentDecimalHour
            );

            const isCurrentlyRunning = schedule.enabled && isTimeMatch;

            return (
              <div key={schedule.id} className={`flex items-center justify-between rounded-2xl border bg-white p-5 transition-all dark:bg-slate-900 ${isCurrentlyRunning ? "border-green-400 ring-1 ring-green-400/10 shadow-sm" : "border-slate-100 dark:border-slate-800"}`}>
                <div className="flex items-center gap-4">
                  <div 
                    className={`rounded-xl p-3 transition-colors ${
                      isCurrentlyRunning 
                        ? "bg-green-500 text-white" 
                        : schedule.enabled 
                          ? "bg-amber-100 text-amber-600" 
                          : "bg-slate-100 text-slate-400 dark:bg-slate-800"
                    }`}
                  >
                    <Clock size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold dark:text-white">{schedule.name}</h3>
                    <p className="text-xs text-slate-500 font-mono">{formatWindow(schedule.startHour, schedule.endHour)}</p>
                    {isCurrentlyRunning ? (
                      <span className="text-[10px] font-bold text-green-600 uppercase tracking-tight animate-pulse">Running Now</span>
                    ) : schedule.enabled ? (
                      <span className="text-[10px] font-bold text-amber-600 uppercase tracking-tight">Standby / Waiting Time</span>
                    ) : null}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      void ScheduleService.toggleSchedule(schedule.id, schedule.enabled);
                    }} 
                    className={`p-2 rounded-lg border transition-all hover:scale-105 active:scale-95 ${
                      schedule.enabled 
                        ? "bg-green-50 border-green-200 text-green-600 dark:bg-green-900/20" 
                        : "bg-slate-50 border-slate-100 text-slate-400 dark:bg-slate-800 dark:border-slate-700"
                    }`}
                  >
                    <Power size={18} />
                  </button>
                  <button onClick={() => void ScheduleService.deleteSchedule(schedule.id)} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}