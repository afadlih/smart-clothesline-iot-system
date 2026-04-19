"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
    Calendar,
    Clock,
    Plus,
    Trash2,
    Power,
    AlertCircle,
} from "lucide-react";
import { useSensor } from "@/hooks/useSensor";

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

const SCHEDULE_STORAGE_KEY = "smart-clothesline-schedules-v1";

function isValidTimeRange(start: string, end: string): boolean {
    return start < end;
}

export default function SchedulePage() {
    const { sensor } = useSensor();
    const [schedules, setSchedules] = useState<ScheduleItem[]>(initialSchedules);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [form, setForm] = useState<NewScheduleForm>(initialForm);
    const [errorMessage, setErrorMessage] = useState("");
    const [isHydrated, setIsHydrated] = useState(false);

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
        if (!isHydrated) {
            return;
        }

        localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(schedules));
    }, [isHydrated, schedules]);

    const isWeatherBlocking = Boolean(sensor?.isRaining() || sensor?.isDark());

    const activeSchedulesCount = useMemo(
        () => schedules.filter((item) => item.isActive).length,
        [schedules],
    );

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
                    className="flex items-center gap-2 rounded-lg bg-[#22C55E] px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-green-700 dark:bg-emerald-600 dark:hover:bg-emerald-500"
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
                        schedules.map((schedule) => (
                            <div
                                key={schedule.id}
                                className="group flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all hover:border-green-200 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-emerald-700"
                            >
                                <div className="flex items-center gap-4">
                                    <div
                                        className={`rounded-xl p-3 ${schedule.isActive
                                                ? "bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-300"
                                                : "bg-slate-50 text-slate-400 dark:bg-slate-800 dark:text-slate-500"
                                            }`}
                                    >
                                        <Clock size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-800 dark:text-slate-100">
                                            {schedule.name}
                                        </h3>
                                        <div className="mt-1 flex items-center gap-3 text-sm">
                                            <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                                                {schedule.timeOpen}
                                            </span>
                                            <span className="text-slate-300 dark:text-slate-600">—</span>
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
                                        className={`rounded-lg border p-2 transition-colors ${schedule.isActive
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
                        ))
                    )}
                </div>

                <div className="space-y-6">
                    <div className="relative overflow-hidden rounded-2xl bg-[#0F172A] p-6 text-white shadow-lg">
                        <div className="relative z-10">
                            <div className="mb-4 flex items-center gap-2 text-green-400">
                                <AlertCircle size={20} />
                                <h3 className="font-semibold">Sistem Prioritas</h3>
                            </div>
                            <p className="mb-6 text-sm leading-relaxed text-slate-300">
                                Jadwal otomatis akan ditangguhkan jika sensor mendeteksi hujan
                                atau kondisi gelap.
                            </p>
                            <div className="rounded-xl border border-white/10 bg-white/10 p-4">
                                <div className="flex items-center justify-between text-sm">
                                    <span>Auto-Override</span>
                                    <span
                                        className={`rounded px-2 py-1 text-[10px] font-bold ${isWeatherBlocking
                                                ? "bg-amber-500 text-slate-900"
                                                : "bg-green-500 text-white"
                                            }`}
                                    >
                                        {isWeatherBlocking ? "SEDANG AKTIF" : "STANDBY"}
                                    </span>
                                </div>
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
                                <span>Cuaca saat ini</span>
                                <span className="font-semibold text-slate-800 dark:text-slate-100">
                                    {sensor ? sensor.getWeatherStatus() : "N/A"}
                                </span>
                            </div>
                        </div>
                        <div className="mt-4 rounded-lg bg-slate-50 p-3 text-xs italic text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                            Gunakan mode manual di dashboard jika ingin override jadwal
                            sementara.
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
