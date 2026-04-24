"use client";

import React from "react";

interface ScheduleFormProps {
  form: { name: string; timeOpen: string; timeClose: string };
  setForm: React.Dispatch<React.SetStateAction<{ name: string; timeOpen: string; timeClose: string }>>;
  onSubmit: () => void;
  errorMessage: string;
}

export const ScheduleForm = ({ form, setForm, onSubmit, errorMessage }: ScheduleFormProps) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
    <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
      Jadwal Baru
    </h2>
    <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
      <input
        type="text"
        value={form.name}
        onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
        placeholder="Nama jadwal"
        className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-green-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
      />
      <input
        type="time"
        value={form.timeOpen}
        onChange={(e) => setForm((prev) => ({ ...prev, timeOpen: e.target.value }))}
        className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-green-500 dark:border-slate-700 dark:bg-slate-950"
      />
      <input
        type="time"
        value={form.timeClose}
        onChange={(e) => setForm((prev) => ({ ...prev, timeClose: e.target.value }))}
        className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-green-500 dark:border-slate-700 dark:bg-slate-950"
      />
    </div>
    {errorMessage && <p className="mt-3 text-xs font-semibold text-red-600 dark:text-red-400">{errorMessage}</p>}
    <div className="mt-4 flex justify-end">
      <button onClick={onSubmit} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white dark:bg-slate-100 dark:text-slate-900">
        Simpan Jadwal
      </button>
    </div>
  </div>
);