"use client";

import React from "react";
import { Clock, Power, Trash2 } from "lucide-react";
import { ScheduleItem } from "../../features/system/ScheduleManager";

interface ScheduleCardProps {
  schedule: ScheduleItem;
  isActiveNow: boolean;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

export const ScheduleCard = ({ schedule, isActiveNow, onToggle, onDelete }: ScheduleCardProps) => (
  <div className={`group flex items-center justify-between rounded-2xl border bg-white p-5 shadow-sm transition-all dark:bg-slate-900 ${
    isActiveNow ? "border-green-300 shadow-green-100 dark:border-emerald-700" : "border-slate-100 dark:border-slate-800"
  }`}>
    <div className="flex items-center gap-4">
      <div className={`rounded-xl p-3 ${schedule.isActive ? "bg-green-50 text-green-600 dark:bg-green-900/30" : "bg-slate-50 text-slate-400"}`}>
        <Clock size={24} />
      </div>
      <div>
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-slate-800 dark:text-slate-100">{schedule.name}</h3>
          {isActiveNow && (
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">ACTIVE NOW</span>
          )}
        </div>
        <div className="mt-1 flex items-center gap-3 text-sm text-slate-500">
          <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs dark:bg-slate-800">{schedule.timeOpen}</span>
          <span>-</span>
          <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs dark:bg-slate-800">{schedule.timeClose}</span>
        </div>
      </div>
    </div>
    <div className="flex items-center gap-2">
      <button onClick={() => schedule.id && onToggle(schedule.id)} className={`rounded-lg border p-2 ${schedule.isActive ? "bg-green-50 text-green-600" : "text-slate-400"}`}>
        <Power size={18} />
      </button>
      <button onClick={() => schedule.id && onDelete(schedule.id)} className="rounded-lg p-2 text-slate-400 hover:text-red-500">
        <Trash2 size={18} />
      </button>
    </div>
  </div>
);