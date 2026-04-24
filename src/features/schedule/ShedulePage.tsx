"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Plus, RefreshCw, Loader2, Clock } from "lucide-react";
import { useSystemState } from "@/hooks/useSystemState";
import { mqttService, COMMAND_TOPIC } from "@/services/MQTTService";
import { ScheduleManager, ScheduleItem } from "../system/ScheduleManager";
import { ScheduleCard } from "@/components/cards/ScheduleCards";
import { ScheduleForm } from "@/components/form/ScheduleForm";

// ==============================
// SENSOR TYPE
// ==============================
interface LocalSensorData {
  status?: string;
  mode?: string; // Berisi "AUTO" atau "MANUAL" dari ESP32/Firebase
}

// ==============================
// HELPER: Cek Waktu
// ==============================
const isWithinSchedule = (schedule: ScheduleItem, now: Date): boolean => {
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const start = ScheduleManager.toMinutes(schedule.timeOpen);
  const end = ScheduleManager.toMinutes(schedule.timeClose);
  return nowMin >= start && nowMin < end;
};

// ==============================
// PAGE COMPONENT
// ==============================
export default function SchedulePage() {
  const { sensor: rawSensor } = useSystemState();
  const sensor = rawSensor as unknown as LocalSensorData;

  // --- STATE ---
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isHydrated, setIsHydrated] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    timeOpen: "08:00",
    timeClose: "10:00",
  });
  const [errorMessage, setErrorMessage] = useState("");

  // Ref untuk mengunci agar perintah tidak loop terus menerus
  const hasLockedManual = useRef(false);

  // --- LOAD JADWAL ---
  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const data = await ScheduleManager.loadFromFirebase();
      setSchedules(data);
    } catch (error) {
      console.error("Load Error:", error);
    } finally {
      setLoading(false);
      setIsHydrated(true);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  // --- LIVE CLOCK ---
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // --- MEMO: APAKAH ADA JADWAL AKTIF SEKARANG? ---
  const isScheduleActive = useMemo(() => {
    if (schedules.length === 0) return false;
    return schedules.some(
      (item) => item.isActive && isWithinSchedule(item, currentTime)
    );
  }, [schedules, currentTime]);

  // ==============================
  // LOGIKA UTAMA: MQTT & AUTO-LOCK
  // ==============================
  useEffect(() => {
    if (!isHydrated || !sensor || schedules.length === 0) return;

    const status = String(sensor.status || "").toUpperCase();
    const mode = String(sensor.mode || "MANUAL").toUpperCase();
    const isOpen = status === "OPEN" || status === "TERBUKA";

    // 1. JIKA JADWAL SEDANG AKTIF
    if (isScheduleActive) {
      // Buka kunci manual karena sudah masuk periode jadwal lagi
      hasLockedManual.current = false; 
      
      // HANYA buka jika alat di mode AUTO dan statusnya sedang tertutup
      if (!isOpen && mode === "AUTO") {
        console.log("LOG: Jadwal Aktif & Mode AUTO -> OPEN Command");
        mqttService.publish(COMMAND_TOPIC, { command: "OPEN" });
      }
    } 
    
    // 2. JIKA JADWAL SUDAH SELESAI
    else {
      // Jika mode masih AUTO, artinya jadwal baru saja habis
      if (mode === "AUTO" && !hasLockedManual.current) {
        console.log("LOG: Jadwal HABIS! Paksa ke MANUAL Mode");
        
        // URUTAN EKSEKUSI:
        // 1. Matikan AUTO dulu
        mqttService.publish(COMMAND_TOPIC, { command: "MANUAL" });

        // 2. Baru tutup
        mqttService.publish(COMMAND_TOPIC, { command: "CLOSE" });
        
        // C. Simpan status di Database (system_settings/global)
        ScheduleManager.updateSystemMode("MANUAL");

        // Kunci agar tidak kirim perintah berkali-kali setiap detik
        hasLockedManual.current = true;
      }
    }
  }, [isScheduleActive, sensor.mode, sensor.status, schedules.length, isHydrated]);

  // --- ACTION: RESET KE AUTO ---
  const handleResetToAuto = async () => {
    hasLockedManual.current = false;
    
    // 1. Update Firebase
    await ScheduleManager.updateSystemMode("AUTO");
    
    // 2. Kirim MQTT agar ESP32 kembali ke logika sensor
    mqttService.publish(COMMAND_TOPIC, { command: "AUTO" });
  };

  // --- ACTION: SUBMIT JADWAL BARU ---
  const onSubmitSchedule = async () => {
    setErrorMessage("");
    if (!form.name.trim()) {
      setErrorMessage("Nama wajib diisi.");
      return;
    }
    if (!ScheduleManager.isValidRange(form.timeOpen, form.timeClose)) {
      setErrorMessage("Waktu tidak valid (Buka harus < Tutup).");
      return;
    }

    await ScheduleManager.addSchedule({ ...form, isActive: true });
    setForm({ name: "", timeOpen: "08:00", timeClose: "10:00" });
    setIsFormOpen(false);
    fetchSchedules();
  };

  return (
    <div className="flex min-h-screen flex-col gap-6 p-6 bg-slate-50">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Penjadwalan Alat</h1>
          <p className="text-sm text-slate-500">
            Mode akan terkunci ke <b>MANUAL</b> saat jadwal berakhir.
          </p>
        </div>

        <div className="flex gap-3">
          {/* Tombol Reset */}
          <button
            onClick={handleResetToAuto}
            className={`flex items-center gap-2 px-4 py-2 border rounded-lg shadow-sm text-sm font-medium transition-all ${
              sensor?.mode === "AUTO"
                ? "bg-green-50 border-green-200 text-green-700"
                : "bg-white text-slate-700 hover:bg-slate-100"
            }`}
          >
            <RefreshCw size={16} className={sensor?.mode === "AUTO" ? "animate-spin-slow" : "text-blue-500"} />
            {sensor?.mode === "AUTO" ? "Mode AUTO Aktif" : "Reset ke AUTO"}
          </button>

          <button
            onClick={() => setIsFormOpen(!isFormOpen)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm text-sm font-medium"
          >
            <Plus size={16} /> Tambah
          </button>
        </div>
      </div>

      <hr className="border-slate-200" />

      {/* FORM MODAL-LIKE */}
      {isFormOpen && (
        <ScheduleForm
          form={form}
          setForm={setForm}
          onSubmit={onSubmitSchedule}
          errorMessage={errorMessage}
        />
      )}

      {/* DAFTAR JADWAL */}
      <div className="grid gap-4">
        {loading ? (
          <div className="flex flex-col items-center py-10">
            <Loader2 className="animate-spin text-blue-500" size={32} />
          </div>
        ) : (
          schedules.map((item) => (
            <ScheduleCard
              key={item.id}
              schedule={item}
              isActiveNow={isWithinSchedule(item, currentTime)}
              onToggle={() =>
                ScheduleManager.toggleStatus(item.id!, item.isActive).then(fetchSchedules)
              }
              onDelete={() =>
                ScheduleManager.deleteSchedule(item.id!).then(fetchSchedules)
              }
            />
          ))
        )}
      </div>

      {/* FOOTER STATUS BAR */}
      <div className="mt-auto p-4 bg-white border border-slate-200 rounded-lg flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4 text-sm font-medium">
          <div className="flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full ${
                isScheduleActive ? "bg-green-500 animate-pulse" : "bg-slate-300"
              }`}
            />
            {isScheduleActive ? "Jadwal Sedang Berjalan" : "Tidak Ada Jadwal"}
          </div>

          <div
            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
              sensor?.mode === "AUTO"
                ? "bg-green-100 text-green-700"
                : "bg-orange-100 text-orange-700"
            }`}
          >
            MODE: {sensor?.mode || "OFFLINE"}
          </div>
        </div>

        <div className="text-sm text-slate-500 font-mono flex items-center gap-2 bg-slate-100 px-3 py-1 rounded border border-slate-200">
          <Clock size={14} />
          {currentTime.toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}