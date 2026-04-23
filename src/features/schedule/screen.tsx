"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  Clock,
  Plus,
  Trash2,
  Power,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useSystemState } from "@/hooks/useSystemState";
import {
  SCHEDULE_STORAGE_KEY,
  isWithinSchedule,
  normalizeSchedules,
} from "@/features/system/ScheduleEngine";
import { DryingTimePredictor } from "@/services/DryingTimePredictor";

type ScheduleItem = {
  id: number;
  name: string;
  timeOpen: string;
  timeClose: string;
  isActive: boolean;
};

type NewScheduleForm = {
  name: string;
  timeOpen: string;
  timeClose: string;
};

const initialSchedules: ScheduleItem[] = [
  {
    id: 1,
    name: "Jemur Pagi Rutin",
    timeOpen: "08:00",
    timeClose: "11:00",
    isActive: true,
  },
  {
    id: 2,
    name: "Jemur Ulang Siang",
    timeOpen: "13:00",
    timeClose: "15:30",
    isActive: false,
  },
];

const initialForm: NewScheduleForm = {
  name: "",
  timeOpen: "08:00",
  timeClose: "10:00",
};

function isValidTimeRange(start: string, end: string): boolean {
  return start < end;
}

function toNormalizedSchedules(schedules: ScheduleItem[]) {
  return normalizeSchedules(
    schedules.map((item) => ({
      id: item.id,
      timeOpen: item.timeOpen,
      timeClose: item.timeClose,
      isActive: item.isActive,
    })),
  );
}

export default function SchedulePage() {
  const { sensor, decision } = useSystemState();
  const [schedules, setSchedules] = useState<ScheduleItem[]>(initialSchedules);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState<NewScheduleForm>(initialForm);
  const [errorMessage, setErrorMessage] = useState("");
  const [isHydrated, setIsHydrated] = useState(false);
  const [currentHour, setCurrentHour] = useState(() => new Date().getHours());
  const [autoCloseEnabled, setAutoCloseEnabled] = useState(true);
  const [autoOpenEnabled, setAutoOpenEnabled] = useState(true);
  const [humidityThreshold, setHumidityThreshold] = useState(70);
  const [tempThreshold, setTempThreshold] = useState(25);
  const [showAutoAdjust, setShowAutoAdjust] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(SCHEDULE_STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as ScheduleItem[];
        if (Array.isArray(parsed)) {
          setSchedules(
            parsed.filter(
              (item) =>
                typeof item.id === "number" &&
                typeof item.name === "string" &&
                typeof item.timeOpen === "string" &&
                typeof item.timeClose === "string" &&
                typeof item.isActive === "boolean",
            ),
          );
        }
      } catch {
        localStorage.removeItem(SCHEDULE_STORAGE_KEY);
      }
    }

    setIsHydrated(true);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentHour(new Date().getHours());
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(schedules));
  }, [isHydrated, schedules]);

  const activeSchedulesCount = useMemo(
    () => schedules.filter((item) => item.isActive).length,
    [schedules],
  );

  const normalizedSchedules = useMemo(() => toNormalizedSchedules(schedules), [schedules]);
  const activeScheduleId =
    decision.activeSchedule !== null ? Number(decision.activeSchedule.id) : null;

  const onToggleSchedule = (id: number) => {
    setSchedules((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              isActive: !item.isActive,
            }
          : item,
      ),
    );
  };

  const onDeleteSchedule = (id: number) => {
    setSchedules((prev) => prev.filter((item) => item.id !== id));
  };

  const onSubmitSchedule = () => {
    const trimmedName = form.name.trim();

    if (!trimmedName) {
      setErrorMessage("Nama jadwal wajib diisi.");
      return;
    }

    if (!isValidTimeRange(form.timeOpen, form.timeClose)) {
      setErrorMessage("Jam buka harus lebih kecil dari jam tutup.");
      return;
    }

    const nextId =
      schedules.length === 0
        ? 1
        : Math.max(...schedules.map((item) => item.id)) + 1;

    setSchedules((prev) => [
      {
        id: nextId,
        name: trimmedName,
        timeOpen: form.timeOpen,
        timeClose: form.timeClose,
        isActive: true,
      },
      ...prev,
    ]);

    setForm(initialForm);
    setErrorMessage("");
    setIsFormOpen(false);
  };

  return (
    <div className="flex min-h-screen flex-col gap-6 bg-gradient-to-br from-gray-100 to-gray-200 p-6 text-gray-900 transition-colors duration-300 dark:from-slate-900 dark:to-slate-950 dark:text-slate-100">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            Penjadwalan Otomatis
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Atur waktu operasional jemuran pintar Anda
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setIsFormOpen((prev) => !prev);
            setErrorMessage("");
          }}
          className="flex items-center gap-2 rounded-lg bg-green-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-green-700 dark:bg-emerald-600 dark:hover:bg-emerald-500"
        >
          <Plus size={18} /> {isFormOpen ? "Tutup Form" : "Tambah Jadwal"}
        </button>
      </div>

      {isFormOpen && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
            Jadwal Baru
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
            <input
              type="text"
              value={form.name}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, name: event.target.value }))
              }
              placeholder="Nama jadwal"
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-green-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
            <input
              type="time"
              value={form.timeOpen}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, timeOpen: event.target.value }))
              }
              aria-label="Jam buka jadwal"
              title="Jam buka jadwal"
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-green-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
            <input
              type="time"
              value={form.timeClose}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, timeClose: event.target.value }))
              }
              aria-label="Jam tutup jadwal"
              title="Jam tutup jadwal"
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-green-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>

          {errorMessage && (
            <p className="mt-3 text-xs font-semibold text-red-600 dark:text-red-400">
              {errorMessage}
            </p>
          )}

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={onSubmitSchedule}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
            >
              Simpan Jadwal
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {schedules.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
              Belum ada jadwal. Silakan tambahkan jadwal baru.
            </div>
          ) : (
            schedules.map((schedule) => {
              const normalized = normalizedSchedules.find((item) => Number(item.id) === schedule.id);
              const isActiveNow =
                normalized !== undefined && isWithinSchedule(normalized, currentHour);

              return (
                <div
                  key={schedule.id}
                  className={`group flex items-center justify-between rounded-2xl border bg-white p-5 shadow-sm transition-all dark:bg-slate-900 ${
                    isActiveNow
                      ? "border-green-300 shadow-green-100 dark:border-emerald-700"
                      : "border-slate-100 hover:border-green-200 dark:border-slate-800 dark:hover:border-emerald-700"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`rounded-xl p-3 ${
                        schedule.isActive
                          ? "bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-300"
                          : "bg-slate-50 text-slate-400 dark:bg-slate-800 dark:text-slate-500"
                      }`}
                    >
                      <Clock size={24} />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-slate-800 dark:text-slate-100">
                          {schedule.name}
                        </h3>
                        {isActiveNow && (
                          <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700 dark:bg-green-900/30 dark:text-green-300">
                            ACTIVE NOW
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-sm">
                        <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                          {schedule.timeOpen}
                        </span>
                        <span className="text-slate-300 dark:text-slate-600">-</span>
                        <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                          {schedule.timeClose}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onToggleSchedule(schedule.id)}
                      aria-label={
                        schedule.isActive
                          ? "Nonaktifkan jadwal"
                          : "Aktifkan jadwal"
                      }
                      title={
                        schedule.isActive
                          ? "Nonaktifkan jadwal"
                          : "Aktifkan jadwal"
                      }
                      className={`rounded-lg border p-2 transition-colors ${
                        schedule.isActive
                          ? "border-green-100 bg-green-50 text-green-600 dark:border-green-900/40 dark:bg-green-900/20 dark:text-green-300"
                          : "border-slate-100 text-slate-400 dark:border-slate-700 dark:text-slate-500"
                      }`}
                    >
                      <Power size={18} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteSchedule(schedule.id)}
                      aria-label="Hapus jadwal"
                      title="Hapus jadwal"
                      className="rounded-lg p-2 text-slate-400 transition-all hover:bg-red-50 hover:text-red-500 dark:text-slate-500 dark:hover:bg-red-900/20 dark:hover:text-red-300"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="space-y-6">
          {/* Auto-Adjust Settings */}
          <button
            type="button"
            onClick={() => setShowAutoAdjust(!showAutoAdjust)}
            className="w-full rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-all dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100">
                Auto-Adjust Settings
              </h3>
              {showAutoAdjust ? (
                <ChevronUp size={20} className="text-slate-600 dark:text-slate-400" />
              ) : (
                <ChevronDown size={20} className="text-slate-600 dark:text-slate-400" />
              )}
            </div>

            {showAutoAdjust && (
              <div className="mt-6 space-y-6 border-t border-slate-100 pt-6 dark:border-slate-800">
                {/* Humidity-Based Auto-Close */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Auto-Close at High Humidity
                    </label>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setAutoCloseEnabled(!autoCloseEnabled);
                      }}
                      aria-label="Toggle auto-close at high humidity"
                      title="Toggle auto-close at high humidity"
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        autoCloseEnabled
                          ? "bg-green-500"
                          : "bg-slate-300 dark:bg-slate-600"
                      }`}
                    >
                      <span className="sr-only">Toggle auto-close at high humidity</span>
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          autoCloseEnabled ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                  {autoCloseEnabled && (
                    <div className="space-y-2">
                      <input
                        type="range"
                        min="30"
                        max="90"
                        value={humidityThreshold}
                        onChange={(e) => setHumidityThreshold(Number(e.target.value))}
                        onClick={(e) => e.stopPropagation()}
                        aria-label="Humidity threshold"
                        title="Humidity threshold"
                        className="w-full"
                      />
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600 dark:text-slate-400">
                          Close when humidity &gt; {humidityThreshold}%
                        </span>
                        <span className="font-mono font-semibold text-slate-800 dark:text-slate-100">
                          {humidityThreshold}%
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Info: Prevents mold and mildew by closing during high humidity
                      </p>
                    </div>
                  )}
                </div>

                {/* Temperature-Based Auto-Open */}
                <div className="space-y-3 border-t border-slate-100 pt-4 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Auto-Open at High Temperature
                    </label>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setAutoOpenEnabled(!autoOpenEnabled);
                      }}
                      aria-label="Toggle auto-open at high temperature"
                      title="Toggle auto-open at high temperature"
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        autoOpenEnabled
                          ? "bg-green-500"
                          : "bg-slate-300 dark:bg-slate-600"
                      }`}
                    >
                      <span className="sr-only">Toggle auto-open at high temperature</span>
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          autoOpenEnabled ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                  {autoOpenEnabled && (
                    <div className="space-y-2">
                      <input
                        type="range"
                        min="15"
                        max="35"
                        value={tempThreshold}
                        onChange={(e) => setTempThreshold(Number(e.target.value))}
                        onClick={(e) => e.stopPropagation()}
                        aria-label="Temperature threshold"
                        title="Temperature threshold"
                        className="w-full"
                      />
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600 dark:text-slate-400">
                          Open when temp &gt; {tempThreshold} C
                        </span>
                        <span className="font-mono font-semibold text-slate-800 dark:text-slate-100">
                          {tempThreshold} C
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Info: Optimizes drying by opening during warm weather
                      </p>
                    </div>
                  )}
                </div>

                {/* Drying Time Estimate */}
                {sensor && (
                  <div className="space-y-2 border-t border-slate-100 pt-4 dark:border-slate-800">
                    {(() => {
                      const estimate = DryingTimePredictor.getDryingEstimate(
                        sensor.humidity,
                        sensor.temperature
                      );
                      return (
                        <>
                          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                            Estimated Drying Time
                          </p>
                          <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
                            <p className="text-sm font-bold text-blue-900 dark:text-blue-200">
                              {estimate.message}
                            </p>
                            {estimate.readyTime && (
                              <p className="mt-1 text-xs text-blue-700 dark:text-blue-300">
                                Ready at: {estimate.readyTime.toLocaleTimeString("id-ID", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </p>
                            )}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}

                {/* Current Conditions */}
                {sensor && (
                  <div className="space-y-2 border-t border-slate-100 pt-4 dark:border-slate-800">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Current Conditions
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded bg-slate-100 p-2 text-sm dark:bg-slate-800">
                        <p className="text-xs text-slate-600 dark:text-slate-400">Humidity</p>
                        <p className="font-bold text-slate-900 dark:text-slate-100">
                          {sensor.humidity.toFixed(1)}%
                        </p>
                      </div>
                      <div className="rounded bg-slate-100 p-2 text-sm dark:bg-slate-800">
                        <p className="text-xs text-slate-600 dark:text-slate-400">Temperature</p>
                        <p className="font-bold text-slate-900 dark:text-slate-100">
                          {sensor.temperature.toFixed(1)} C
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </button>

          <div className="relative overflow-hidden rounded-2xl bg-slate-900 p-6 text-white shadow-lg dark:bg-slate-950">
            <div className="relative z-10">
              <div className="mb-4 flex items-center gap-2 text-green-400">
                <AlertCircle size={20} />
                <h3 className="font-semibold">Sistem Prioritas</h3>
              </div>
              <p className="mb-6 text-sm leading-relaxed text-slate-300">
                Prioritas keputusan: Manual, Safety, Schedule, lalu Auto fallback.
              </p>
              <div className="space-y-3 rounded-xl border border-white/10 bg-white/10 p-4">
                <div className="flex items-center justify-between text-sm">
                  <span>Decision Source</span>
                  <span className="rounded bg-white/10 px-2 py-1 text-[10px] font-bold">
                    {decision.decisionSource}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Schedule Active</span>
                  <span
                    className={`rounded px-2 py-1 text-[10px] font-bold ${
                      decision.scheduleActive
                        ? "bg-green-500 text-white"
                        : "bg-slate-700 text-slate-100"
                    }`}
                  >
                    {decision.scheduleActive ? "ACTIVE" : "INACTIVE"}
                  </span>
                </div>
                {decision.overriddenBySafety && (
                  <p className="text-xs font-semibold text-amber-300">
                    SCHEDULE OVERRIDDEN BY SAFETY
                  </p>
                )}
              </div>
            </div>
            <div className="absolute -bottom-4 -right-4 h-24 w-24 rounded-full bg-green-500/10 blur-2xl" />
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100">
              Ringkasan Jadwal
            </h3>
            <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
              <div className="flex items-center justify-between">
                <span>Total jadwal</span>
                <span className="font-semibold text-slate-800 dark:text-slate-100">
                  {schedules.length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Jadwal aktif</span>
                <span className="font-semibold text-green-600 dark:text-green-300">
                  {activeSchedulesCount}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Aktif sekarang</span>
                <span className="font-semibold text-slate-800 dark:text-slate-100">
                  {activeScheduleId !== null ? `#${activeScheduleId}` : "Tidak ada"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Cuaca saat ini</span>
                <span className="font-semibold text-slate-800 dark:text-slate-100">
                  {sensor ? sensor.getWeatherStatus() : "N/A"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Final decision</span>
                <span className="font-semibold text-slate-800 dark:text-slate-100">
                  {decision.recommendedStatus}
                </span>
              </div>
            </div>
            <div className="mt-4 rounded-lg bg-slate-50 p-3 text-xs italic text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              {decision.reason}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
              <Calendar size={16} className="text-green-600" />
              Tips Operasional
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Hindari jadwal setelah pukul 17:00 untuk meminimalkan risiko embun
              dan kelembapan tinggi.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
