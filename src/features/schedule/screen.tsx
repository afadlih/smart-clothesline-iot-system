"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { Clock, Loader2, Plus, Power, ShieldCheck, Trash2, Calendar, AlertCircle, Zap, Shield } from "lucide-react";
import { isWithinSchedule } from "@/features/system/ScheduleEngine";
import { ScheduleService, type FirebaseScheduleItem } from "@/services/ScheduleService";
import { mqttService } from "@/services/MQTTService"; 
import { logger } from "@/lib/logger";
import { useAuth } from "@/hooks/useAuth";
import PageContainer from "@/components/layout/PageContainer";

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
  const { user } = useAuth();
  const [activeDeviceId, setActiveDeviceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState<FirebaseScheduleItem[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(initialForm);
  const [errorMessage, setErrorMessage] = useState("");
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  useEffect(() => {
    if (typeof window !== "undefined") {
      setActiveDeviceId(localStorage.getItem("smart-clothesline-active-device-id-v1"));
    }
  }, []);

  const loadScheduleData = useCallback(async () => {
    try {
      const activeDevId = typeof window !== "undefined" ? localStorage.getItem("smart-clothesline-active-device-id-v1") : null;
      if (user && activeDevId) {
        const scheduleResult = await ScheduleService.loadDeviceSchedules({
          uid: user.uid,
          deviceId: activeDevId
        });
        setSchedules(scheduleResult.schedules);
      } else {
        const scheduleResult = await ScheduleService.loadSchedules();
        setSchedules(scheduleResult.schedules);
      }
    } catch (err) {
      console.error("Load error:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    const unsubscribe = mqttService.onConnectionStatus((status) => {
      logger.debug("mqtt", "Schedule page connection state", status.state);
    });
    void ScheduleService.migrateLegacyLocalSchedulesOnce().then(() => { void loadScheduleData(); });
    return () => {
      unsubscribe();
    };
  }, [loadScheduleData]);

  useEffect(() => {
    const timer = window.setInterval(() => { setCurrentTime(new Date()); }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const onUpdate = () => { void loadScheduleData(); };
    window.addEventListener("schedule-updated", onUpdate);
    return () => window.removeEventListener("schedule-updated", onUpdate);
  }, [loadScheduleData]);

  const currentDecimalHour = useMemo(() => {
    return currentTime.getHours() + currentTime.getMinutes() / 60 + currentTime.getSeconds() / 3600;
  }, [currentTime]);

  const onSubmitSchedule = async () => {
    setErrorMessage("");
    if (!form.name.trim()) {
      setErrorMessage("Schedule name is required.");
      return;
    }

    const startHour = ScheduleService.parseTimeToFloat(form.timeOpen);
    const endHour = ScheduleService.parseTimeToFloat(form.timeClose);

    if (!Number.isFinite(startHour) || !Number.isFinite(endHour)) {
      setErrorMessage("Invalid time format.");
      return;
    }

    try {
      const activeDevId = typeof window !== "undefined" ? localStorage.getItem("smart-clothesline-active-device-id-v1") : null;
      if (user && activeDevId) {
        await ScheduleService.addDeviceSchedule({
          uid: user.uid,
          deviceId: activeDevId,
          name: form.name.trim(),
          startHour,
          endHour,
          enabled: true,
        });
      } else {
        await ScheduleService.addSchedule({
          name: form.name.trim(),
          startHour,
          endHour,
          enabled: true,
        });
      }
      setForm(initialForm); setIsFormOpen(false); void loadScheduleData();
    } catch (error) {
      setErrorMessage("Schedule could not be saved. Check login, active device, and Firestore rules.");
      console.error("[Schedule] Save failed", error);
    }
  };

  const onToggleSchedule = async (scheduleId: string, currentEnabled: boolean) => {
    const activeDevId = typeof window !== "undefined" ? localStorage.getItem("smart-clothesline-active-device-id-v1") : null;
    if (user && activeDevId) {
      await ScheduleService.toggleDeviceSchedule({
        uid: user.uid,
        deviceId: activeDevId,
        scheduleId,
        currentEnabled,
      });
    } else {
      await ScheduleService.toggleSchedule(scheduleId, currentEnabled);
    }
    void loadScheduleData();
  };

  const onDeleteSchedule = async (scheduleId: string) => {
    const activeDevId = typeof window !== "undefined" ? localStorage.getItem("smart-clothesline-active-device-id-v1") : null;
    if (user && activeDevId) {
      await ScheduleService.deleteDeviceSchedule({
        uid: user.uid,
        deviceId: activeDevId,
        scheduleId,
      });
    } else {
      await ScheduleService.deleteSchedule(scheduleId);
    }
    void loadScheduleData();
  };

  return (
    <main className="min-h-screen bg-[#f8fafc] dark:bg-[#020617] transition-colors duration-500 pb-20">
      <PageContainer className="space-y-8">
        {/* Info Alert */}
        <div className="group relative overflow-hidden rounded-[2.5rem] bg-teal-500/10 dark:bg-teal-500/5 p-8 border border-teal-200/50 dark:border-teal-500/20 backdrop-blur-sm">
           <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-teal-500/10 blur-2xl" />
           <div className="relative z-10 flex items-center gap-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-lg shadow-teal-600/20">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div>
                 <p className="text-[10px] font-black text-teal-700 dark:text-teal-400 uppercase tracking-widest mb-1">Schedule details</p>
                 <p className="text-sm font-bold text-slate-600 dark:text-slate-400 leading-relaxed">
                   Use <Link href="/automation" className="text-teal-600 dark:text-teal-400 font-black underline decoration-teal-500/30 hover:decoration-teal-500 transition-all">Automation Control Center</Link> for policy and mode controls.
                   Schedules defined here will automatically target the active device.
                   Note: Current schedule execution is dashboard-runtime scheduling. The browser/app must be running for schedule commands to publish.
                 </p>
              </div>
           </div>
        </div>

        {/* Header Section */}
        <header className="relative overflow-hidden rounded-[2.5rem] bg-white dark:bg-slate-900/50 p-8 md:p-10 shadow-2xl shadow-teal-500/5 border border-slate-200/60 dark:border-white/5 backdrop-blur-sm">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-teal-500/10 blur-[80px]" />
          <div className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-emerald-500/5 blur-[80px]" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600 text-white shadow-lg shadow-teal-600/20">
                  <Calendar className="h-5 w-5" />
                </div>
                <span className="text-[11px] font-black uppercase tracking-[0.25em] text-teal-600 dark:text-teal-400">
                  Schedule Manager
                </span>
              </div>
              <h1 className="text-5xl md:text-6xl font-black text-slate-800 dark:text-white tracking-tighter">Schedule Manager</h1>
            </div>

            {activeDeviceId && (
              <div className="flex items-center gap-4">
                <button onClick={() => setIsFormOpen(!isFormOpen)} className="flex items-center gap-4 px-8 py-4 rounded-2xl bg-teal-600 text-white font-black text-xs tracking-widest shadow-xl shadow-teal-600/20 hover:opacity-90 active:scale-95 transition-all">
                  <Plus size={20} /> {isFormOpen ? "CLOSE PANEL" : "NEW SCHEDULE"}
                </button>
              </div>
            )}
          </div>
        </header>

        {!activeDeviceId ? (
          <div className="rounded-[2.5rem] bg-amber-500/10 dark:bg-amber-500/5 p-10 border border-amber-200/50 dark:border-amber-500/20 backdrop-blur-sm text-center max-w-2xl mx-auto shadow-xl">
             <AlertCircle className="h-16 w-16 text-amber-600 dark:text-amber-500 mx-auto mb-6" />
             <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-2">No Active Device</h2>
             <p className="text-sm font-bold text-slate-600 dark:text-slate-400 leading-relaxed mb-8">
               Select a device in IoT Hub before creating schedules.
             </p>
             <Link href="/iot-hub" className="inline-block px-10 py-5 rounded-2xl bg-slate-900 dark:bg-teal-600 text-white font-black text-xs tracking-widest shadow-xl hover:opacity-90 active:scale-95 transition-all uppercase">
               Go to IoT Hub
             </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8 xl:grid-cols-12">
            {/* Main List Area */}
            <section className="xl:col-span-8 space-y-8">
              {isFormOpen && (
                <div className="rounded-[2.5rem] bg-white dark:bg-slate-900/40 p-10 shadow-xl border border-slate-200/60 dark:border-white/5 backdrop-blur-sm animate-in fade-in slide-in-from-top-4 duration-500">
                  <div className="flex items-center gap-3 mb-10">
                     <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
                        <Plus className="h-5 w-5" />
                     </div>
                     <h2 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">New schedule</h2>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
                     <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Schedule name</label>
                        <input type="text" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} placeholder="Morning Shift" className="w-full rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 p-5 text-sm font-bold text-slate-700 dark:text-white outline-none focus:ring-1 ring-teal-500/50 transition-all" />
                     </div>
                     <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Open time</label>
                        <input type="time" value={form.timeOpen} onChange={(e) => setForm({...form, timeOpen: e.target.value})} className="w-full rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 p-5 text-sm font-bold text-slate-700 dark:text-white outline-none focus:ring-1 ring-teal-500/50 transition-all" />
                     </div>
                     <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Close time</label>
                        <input type="time" value={form.timeClose} onChange={(e) => setForm({...form, timeClose: e.target.value})} className="w-full rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 p-5 text-sm font-bold text-slate-700 dark:text-white outline-none focus:ring-1 ring-teal-500/50 transition-all" />
                     </div>
                  </div>
                  
                  {errorMessage && <p className="mt-6 text-[10px] font-black text-rose-500 uppercase tracking-widest">{errorMessage}</p>}
                  
                  <div className="mt-10 flex justify-end">
                     <button onClick={onSubmitSchedule} className="px-10 py-5 rounded-2xl bg-slate-900 dark:bg-teal-600 text-white font-black text-xs tracking-widest shadow-xl shadow-teal-600/20 hover:opacity-90 active:scale-95 transition-all uppercase">
                        Save schedule
                     </button>
                  </div>
                </div>
              )}

              <div className="space-y-6">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-20 opacity-30">
                     <Loader2 className="h-12 w-12 animate-spin mb-4 text-teal-500" />
                     <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Loading schedules...</p>
                  </div>
                ) : schedules.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-24 bg-white dark:bg-slate-900/40 rounded-[2.5rem] border border-dashed border-slate-200 dark:border-white/10">
                     <Calendar className="h-16 w-16 text-slate-200 dark:text-slate-800 mb-6" />
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No Active Schedules</p>
                  </div>
                ) : (
                  schedules.map((schedule) => {
                    const isTimeMatch = isWithinSchedule(
                      { id: schedule.id, startHour: schedule.startHour, endHour: schedule.endHour, enabled: true }, 
                      currentDecimalHour
                    );
                    const isCurrentlyRunning = schedule.enabled && isTimeMatch;

                    return (
                      <div key={schedule.id} className={`group relative overflow-hidden rounded-[2.5rem] bg-white dark:bg-slate-900/40 p-8 md:p-10 shadow-xl border transition-all hover:scale-[1.01] ${isCurrentlyRunning ? 'border-emerald-500/50 ring-1 ring-emerald-500/20' : 'border-slate-200/60 dark:border-white/5'}`}>
                        {isCurrentlyRunning && (
                          <div className="absolute right-0 top-0 h-40 w-40 bg-emerald-500/5 blur-3xl rounded-full" />
                        )}
                        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                          <div className="flex items-center gap-8">
                             <div className={`flex h-20 w-20 items-center justify-center rounded-[1.5rem] transition-all shadow-lg ${isCurrentlyRunning ? 'bg-emerald-500 text-white shadow-emerald-500/30' : schedule.enabled ? 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20' : 'bg-slate-100 dark:bg-white/5 text-slate-400 border border-slate-200 dark:border-white/5 shadow-none'}`}>
                                <Clock size={36} strokeWidth={2.5} />
                             </div>
                             <div>
                                <div className="flex items-center gap-4 mb-2">
                                   <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tighter uppercase">{schedule.name}</h3>
                                   {isCurrentlyRunning && (
                                     <span className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 text-[9px] font-black uppercase tracking-[0.2em] animate-pulse border border-emerald-500/20">
                                        <Zap className="h-3 w-3" /> Running now
                                     </span>
                                   )}
                                </div>
                                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">{formatWindow(schedule.startHour, schedule.endHour)}</p>
                                {!isCurrentlyRunning && schedule.enabled && (
                                  <p className="text-[10px] font-black text-teal-500/60 uppercase tracking-widest mt-2">Waiting for next window</p>
                                )}
                             </div>
                          </div>

                          <div className="flex items-center gap-4">
                             <button 
                               onClick={(e) => { e.preventDefault(); void onToggleSchedule(schedule.id, schedule.enabled); }}
                               className={`flex items-center gap-4 px-8 py-4 rounded-2xl font-black text-[10px] tracking-[0.2em] uppercase transition-all active:scale-95 ${schedule.enabled ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' : 'bg-slate-100 dark:bg-white/5 text-slate-400 border border-slate-200 dark:border-white/5'}`}
                             >
                                <Power size={16} /> {schedule.enabled ? "Enabled" : "Disabled"}
                             </button>
                             <button 
                               onClick={() => void onDeleteSchedule(schedule.id)} 
                               className="p-4 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 hover:bg-rose-500 hover:text-white transition-all active:scale-95"
                             >
                                <Trash2 size={20} />
                             </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>

            {/* Sidebar Insights */}
            <aside className="xl:col-span-4 space-y-8">
               <section className="rounded-[2.5rem] bg-white dark:bg-slate-900/40 p-10 shadow-xl border border-slate-200/60 dark:border-white/5 backdrop-blur-sm">
                  <div className="flex items-center gap-3 mb-10">
                     <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
                        <ShieldCheck className="h-5 w-5" />
                     </div>
                     <h2 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">Active device</h2>
                  </div>
                  
                  <div className="space-y-4">
                     <InsightRow label="Active Device" value={activeDeviceId || "None"} icon={<Calendar size={16}/>} />
                     <InsightRow label="Storage Path" value={`users/${user?.uid ? user.uid.slice(0, 6) : "..."}.../${activeDeviceId}/schedules`} icon={<Shield size={16}/>} color="slate" />
                     <InsightRow label="Schedule Status" value="Dashboard runtime scheduling" icon={<Shield size={16}/>} color="emerald" />
                  </div>
               </section>

               <section className="rounded-[2.5rem] bg-slate-900 p-10 text-white relative overflow-hidden shadow-2xl">
                  <div className="absolute -right-10 -bottom-10 h-32 w-32 rounded-full bg-teal-500/20 blur-2xl" />
                  <div className="relative z-10">
                     <Clock className="h-10 w-10 text-teal-400 mb-6 opacity-40" />
                     <h3 className="text-2xl font-black mb-3">Schedule window</h3>
                     <p className="text-sm font-medium text-slate-400 leading-relaxed mb-10">
                       Schedules defined here will automatically target the active device. 
                       Ensure your automation parameters are tuned to support scheduled operations.
                     </p>
                     <div className="flex items-center justify-between pt-6 border-t border-white/5">
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Live Clock</span>
                        <span className="text-2xl font-black font-mono text-teal-400">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                     </div>
                  </div>
               </section>
            </aside>
          </div>
        )}
      </PageContainer>
    </main>
  );
}

function InsightRow({ label, value, icon, color = "slate" }: { label: string; value: string; icon: React.ReactNode; color?: string }) {
   const colors: Record<string, string> = {
      slate: "text-slate-400",
      emerald: "text-emerald-500",
      amber: "text-amber-500",
   };
   return (
      <div className="flex items-center justify-between p-6 rounded-[2rem] bg-slate-50 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 group hover:border-blue-500/30 transition-all">
         <div className="flex items-center gap-4">
            <span className="text-slate-400 group-hover:text-blue-500 transition-colors">{icon}</span>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
         </div>
         <span className={`text-[10px] font-black uppercase tracking-widest ${colors[color]}`}>{value}</span>
      </div>
   );
}
