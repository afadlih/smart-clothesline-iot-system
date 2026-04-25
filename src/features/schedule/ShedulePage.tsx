"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import { Plus, RefreshCw, Loader2, Lock, AlertTriangle, Clock, ShieldCheck } from "lucide-react";
import { useSystemState } from "@/hooks/useSystemState";
import { mqttService, COMMAND_TOPIC } from "@/services/MQTTService";
import { ScheduleManager, ScheduleItem } from "../system/ScheduleManager";
import { ScheduleCard } from "@/components/cards/ScheduleCards"; 
import { ScheduleForm } from "@/components/form/ScheduleForm";

interface LocalSensorData {
  status?: string;
}

export default function SchedulePage() {
  const { sensor: rawSensor, mode, isOnline } = useSystemState();
  const sensor = rawSensor as unknown as LocalSensorData;

  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", timeOpen: "08:00", timeClose: "10:00" });
  const [errorMessage, setErrorMessage] = useState("");
  const [isHydrated, setIsHydrated] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [userAllowedAuto, setUserAllowedAuto] = useState(false);
  const wasActiveRef = useRef<boolean>(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [scheduleData, overrideStatus] = await Promise.all([
        ScheduleManager.loadFromFirebase(),
        ScheduleManager.getSystemOverride()
      ]);
      setSchedules(scheduleData);
      setUserAllowedAuto(overrideStatus);
    } catch {
      console.error("Gagal memuat data");
    } finally {
      setLoading(false);
      setIsHydrated(true);
    }
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const isCurrentlyActive = useMemo(() => {
    if (schedules.length === 0) return false;
    const nowMin = currentTime.getHours() * 60 + currentTime.getMinutes();
    return schedules.some((item) => {
      if (!item.isActive) return false;
      const start = ScheduleManager.toMinutes(item.timeOpen);
      const end = ScheduleManager.toMinutes(item.timeClose);
      return nowMin >= start && nowMin < end;
    });
  }, [schedules, currentTime]);

  useEffect(() => {
    if (wasActiveRef.current === true && isCurrentlyActive === false) {
      setUserAllowedAuto(false);
      ScheduleManager.setSystemOverride(false);
    }
    wasActiveRef.current = isCurrentlyActive;
  }, [isCurrentlyActive]);

  // --- LOGIKA INTEGRASI: SINKRONISASI OTOMATIS ---
  useEffect(() => {
    if (!isHydrated || mode === null || mode === undefined || schedules.length === 0) return;
    
    const syncTimer = setTimeout(() => {
      const currentMode = String(mode).toUpperCase();
      const currentStatus = String(sensor?.status || "").toUpperCase();
      const isOpen = currentStatus === "OPEN" || currentStatus === "TERBUKA";

      if (isCurrentlyActive) {
        // Jika masuk jadwal, kirim perintah AUTO
        // Ini memastikan mode berubah jadi AUTO dan jemuran terbuka jika terang
        if (currentMode === "MANUAL" || !isOpen) {
          console.log("SYNC: Jadwal Dimulai. Mengaktifkan Mode AUTO.");
          mqttService.publish(COMMAND_TOPIC, { command: "AUTO", timestamp: Date.now() });
        }
      } else {
        // Jika jadwal habis, kunci ke MANUAL
        if (!userAllowedAuto && currentMode === "AUTO") {
          console.warn("SYNC: Jadwal Berakhir. Mengunci Mode MANUAL.");
          mqttService.publish(COMMAND_TOPIC, { command: "CLOSE", timestamp: Date.now() });
        }
      }
    }, 2500);
    
    return () => clearTimeout(syncTimer);
  }, [isCurrentlyActive, mode, sensor?.status, isHydrated, schedules.length, userAllowedAuto]);

  const onSubmitSchedule = async () => {
    if (!form.name.trim()) {
      setErrorMessage("Nama wajib diisi.");
      return;
    }
    try {
      const payload = { ...form, isActive: true, enabled: true, startHour: form.timeOpen, endHour: form.timeClose };
      await ScheduleManager.addSchedule(payload as unknown as Parameters<typeof ScheduleManager.addSchedule>[0]);
      setForm({ name: "", timeOpen: "08:00", timeClose: "10:00" });
      setIsFormOpen(false);
      setErrorMessage("");
      fetchData();
    } catch {
      setErrorMessage("Gagal menyimpan ke Firebase.");
    }
  };

  const handleResetToAuto = async () => {
    setUserAllowedAuto(true);
    await ScheduleManager.setSystemOverride(true);
    mqttService.publish(COMMAND_TOPIC, { command: "AUTO" });
  };

  return (
    <div className="flex min-h-screen flex-col gap-6 bg-slate-50 p-6 dark:bg-slate-950">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold dark:text-slate-100">Penjadwalan Alat</h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-sm text-slate-500">Koneksi: {isOnline ? "🟢 Online" : "🔴 Offline"}</p>
            <div className={`flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded border ${
              mode === "AUTO" ? "bg-green-50 text-green-700 border-green-100" : "bg-amber-50 text-amber-700 border-amber-100"
            }`}>
              {mode === "AUTO" ? <ShieldCheck size={10} /> : <Lock size={10} />}
              MODE: {mode ?? 'SYNCING...'}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleResetToAuto} className="flex items-center gap-2 rounded-lg bg-white border px-4 py-2 text-sm font-medium dark:bg-slate-800">
            <RefreshCw size={18} /> Reset ke Auto
          </button>
          <button onClick={() => setIsFormOpen(!isFormOpen)} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-md">
            <Plus size={18} /> {isFormOpen ? "Tutup" : "Tambah"}
          </button>
        </div>
      </div>

      {isFormOpen && (
        <div className="animate-in fade-in zoom-in duration-300">
          <ScheduleForm 
            form={form} 
            setForm={setForm} 
            onSubmit={onSubmitSchedule} 
            errorMessage={errorMessage} 
          />
        </div>
      )}

      <div className="w-full space-y-4"> 
        {loading ? (
          <Loader2 className="animate-spin mx-auto mt-10 text-blue-500" size={32} />
        ) : (
          schedules.map((s) => (
            <ScheduleCard 
              key={s.id} 
              schedule={s} 
              isActiveNow={isCurrentlyActive && s.isActive}
              onToggle={() => ScheduleManager.toggleStatus(String(s.id), s.isActive).then(fetchData)}
              onDelete={() => ScheduleManager.deleteSchedule(String(s.id)).then(fetchData)}
            />
          ))
        )}
      </div>

      <div className="mt-auto bg-white border rounded-xl p-4 flex items-center justify-between dark:bg-slate-900">
        <div className="flex items-center gap-2 text-amber-600">
           <AlertTriangle size={16} />
           <p className="text-[10px] text-slate-500">
             {userAllowedAuto ? "Cloud Override Aktif." : "Mode MANUAL terkunci otomatis saat jadwal berakhir."}
           </p>
        </div>
        <div className="text-sm font-mono flex items-center gap-2 dark:text-slate-300">
          <Clock size={14} /> {currentTime.toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}