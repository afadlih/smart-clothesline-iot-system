"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Clock,
  Loader2,
  Lock,
  Plus,
  Power,
  RefreshCw,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { useSystemState } from "@/hooks/useSystemState";
import { isWithinSchedule, type StoredScheduleItem } from "@/features/system/ScheduleEngine";
import { ScheduleService, type FirebaseScheduleItem } from "@/services/ScheduleService";

type FormState = {
  name: string;
  timeOpen: string;
  timeClose: string;
};

const initialForm: FormState = {
  name: "",
  timeOpen: "08:00",
  timeClose: "10:00",
};

function parseHour(value: string): number {
  const [hour] = value.split(":");
  return Number(hour);
}

function isValidTimeRange(start: string, end: string): boolean {
  return start < end;
}

function toStoredSchedules(schedules: FirebaseScheduleItem[]): StoredScheduleItem[] {
  return schedules.map((item) => ({
    id: item.id,
    startHour: item.startHour,
    endHour: item.endHour,
    enabled: item.enabled,
  }));
}

function formatWindow(startHour: number, endHour: number): string {
  return `${String(startHour).padStart(2, "0")}:00-${String(endHour).padStart(2, "0")}:00`;
}

export default function SchedulePage() {
  const { mode, isOnline, decision } = useSystemState();
  const [loading, setLoading] = useState(true);
  const [fromCache, setFromCache] = useState(false);
  const [schedules, setSchedules] = useState<FirebaseScheduleItem[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(initialForm);
  const [errorMessage, setErrorMessage] = useState("");
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [userAllowedAuto, setUserAllowedAuto] = useState(false);
  const [isSettingOverride, setIsSettingOverride] = useState(false);
  const wasActiveRef = useRef<boolean>(false);

  const loadScheduleData = async () => {
    setLoading(true);
    const [scheduleResult, override] = await Promise.all([
      ScheduleService.loadDetailedSchedules(),
      ScheduleService.getSystemOverride(),
    ]);
    setSchedules(scheduleResult.schedules);
    setFromCache(scheduleResult.fromCache);
    setUserAllowedAuto(override);
    setLoading(false);
  };

  useEffect(() => {
    void ScheduleService.migrateLegacyLocalSchedulesOnce().then(() => {
      void loadScheduleData();
    });
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const onScheduleUpdated = () => {
      void loadScheduleData();
    };
    window.addEventListener("schedule-updated", onScheduleUpdated);
    return () => window.removeEventListener("schedule-updated", onScheduleUpdated);
  }, []);

  const storedSchedules = useMemo(() => toStoredSchedules(schedules), [schedules]);

  const isCurrentlyActive = useMemo(() => {
    const currentHour = currentTime.getHours();
    return storedSchedules.some((item) => isWithinSchedule(item, currentHour));
  }, [currentTime, storedSchedules]);

  useEffect(() => {
    if (wasActiveRef.current === true && isCurrentlyActive === false) {
      setUserAllowedAuto(false);
      void ScheduleService.setSystemOverride(false);
    }
    wasActiveRef.current = isCurrentlyActive;
  }, [isCurrentlyActive]);

  const onSubmitSchedule = async () => {
    const trimmedName = form.name.trim();
    if (!trimmedName) {
      setErrorMessage("Schedule name is required.");
      return;
    }
    if (!isValidTimeRange(form.timeOpen, form.timeClose)) {
      setErrorMessage("Start time must be earlier than end time.");
      return;
    }

    try {
      await ScheduleService.addSchedule({
        name: trimmedName,
        startHour: parseHour(form.timeOpen),
        endHour: parseHour(form.timeClose),
        enabled: true,
      });
      setForm(initialForm);
      setIsFormOpen(false);
      setErrorMessage("");
      void loadScheduleData();
    } catch {
      setErrorMessage("Failed to save schedule to Firestore.");
    }
  };

  const onResetToAuto = async () => {
    setIsSettingOverride(true);
    try {
      await ScheduleService.setSystemOverride(true);
      setUserAllowedAuto(true);
    } finally {
      setIsSettingOverride(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col gap-6 bg-slate-50 p-6 dark:bg-slate-950">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold dark:text-slate-100">Schedule Manager</h1>
          <div className="mt-1 flex items-center gap-2">
            <p className="text-sm text-slate-500">Connection: {isOnline ? "Online" : "Offline"}</p>
            <div
              className={`flex items-center gap-1 rounded border px-2 py-0.5 text-[10px] font-mono ${
                mode === "AUTO"
                  ? "border-green-100 bg-green-50 text-green-700"
                  : "border-amber-100 bg-amber-50 text-amber-700"
              }`}
            >
              {mode === "AUTO" ? <ShieldCheck size={10} /> : <Lock size={10} />}
              MODE: {mode ?? "SYNCING..."}
            </div>
            <div
              className={`rounded border px-2 py-0.5 text-[10px] font-semibold ${
                decision.scheduleActive
                  ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 bg-slate-100 text-slate-600"
              }`}
            >
              Schedule {decision.scheduleActive ? "ACTIVE" : "INACTIVE"}
            </div>
            {fromCache && (
              <div className="rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                CACHE FALLBACK
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onResetToAuto}
            disabled={isSettingOverride}
            className="flex items-center gap-2 rounded-lg border bg-white px-4 py-2 text-sm font-medium disabled:opacity-60 dark:bg-slate-800"
          >
            <RefreshCw size={18} className={isSettingOverride ? "animate-spin" : ""} />
            Reset to Auto
          </button>
          <button
            type="button"
            onClick={() => {
              setIsFormOpen((prev) => !prev);
              setErrorMessage("");
            }}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-md"
          >
            <Plus size={18} /> {isFormOpen ? "Close" : "Add"}
          </button>
        </div>
      </div>

      {isFormOpen && (
        <div className="animate-in zoom-in fade-in duration-300 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
            New Schedule
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
            <input
              type="text"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="Schedule name"
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-green-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
            <input
              type="time"
              value={form.timeOpen}
              onChange={(event) => setForm((prev) => ({ ...prev, timeOpen: event.target.value }))}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-green-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              aria-label="Schedule open time"
              title="Schedule open time"
            />
            <input
              type="time"
              value={form.timeClose}
              onChange={(event) => setForm((prev) => ({ ...prev, timeClose: event.target.value }))}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-green-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              aria-label="Schedule close time"
              title="Schedule close time"
            />
          </div>

          {errorMessage && <p className="mt-3 text-xs font-semibold text-red-600 dark:text-red-400">{errorMessage}</p>}

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={onSubmitSchedule}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white dark:bg-slate-100 dark:text-slate-900"
            >
              Save Schedule
            </button>
          </div>
        </div>
      )}

      <div className="w-full space-y-4">
        {loading ? (
          <Loader2 className="mx-auto mt-10 animate-spin text-blue-500" size={32} />
        ) : schedules.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white p-5 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
            No schedules found. Add one to start automation.
          </div>
        ) : (
          schedules.map((schedule) => {
            const stored = storedSchedules.find((item) => item.id === schedule.id);
            const isActiveNow = stored ? isWithinSchedule(stored, currentTime.getHours()) : false;

            return (
              <div
                key={schedule.id}
                className={`group flex items-center justify-between rounded-2xl border bg-white p-5 shadow-sm transition-all dark:bg-slate-900 ${
                  isActiveNow ? "border-green-300 shadow-green-100 dark:border-emerald-700" : "border-slate-100 dark:border-slate-800"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`rounded-xl p-3 ${
                      schedule.enabled
                        ? "bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-300"
                        : "bg-slate-50 text-slate-400 dark:bg-slate-800"
                    }`}
                  >
                    <Clock size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-800 dark:text-slate-100">{schedule.name}</h3>
                      {isActiveNow && (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">
                          ACTIVE NOW
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-sm text-slate-500">
                      <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs dark:bg-slate-800">
                        {formatWindow(schedule.startHour, schedule.endHour)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void ScheduleService.toggleSchedule(schedule.id, schedule.enabled)}
                    className={`rounded-lg border p-2 ${
                      schedule.enabled
                        ? "border-green-100 bg-green-50 text-green-600"
                        : "border-slate-100 text-slate-400 dark:border-slate-700 dark:text-slate-500"
                    }`}
                    aria-label={schedule.enabled ? "Disable schedule" : "Enable schedule"}
                    title={schedule.enabled ? "Disable schedule" : "Enable schedule"}
                  >
                    <Power size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => void ScheduleService.deleteSchedule(schedule.id)}
                    className="rounded-lg p-2 text-slate-400 hover:text-red-500"
                    aria-label="Delete schedule"
                    title="Delete schedule"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="mt-auto flex items-center justify-between rounded-xl border bg-white p-4 dark:bg-slate-900">
        <div className="flex items-center gap-2 text-amber-600">
          <AlertTriangle size={16} />
          <p className="text-[10px] text-slate-500">
            {userAllowedAuto
              ? "Cloud override enabled."
              : "Manual lock is automatically applied when schedule window ends."}
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm font-mono dark:text-slate-300">
          <Clock size={14} /> {currentTime.toLocaleTimeString("en-US")}
        </div>
      </div>
    </div>
  );
}
