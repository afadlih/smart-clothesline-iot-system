'use client';

import React from 'react';

interface StatusBadgeProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueClass: string;
  dotClass: string;
  dotPulseClass?: string;
  iconBgClass: string;
  iconTextClass: string;
  title?: string;
}

export default function StatusBadge({
  icon,
  label,
  value,
  valueClass,
  dotClass,
  dotPulseClass = '',
  iconBgClass,
  iconTextClass,
  title,
}: StatusBadgeProps) {
  return (
    <div
      className="flex items-center gap-3 rounded-xl"
      title={title}
    >
      <div
        className={`flex h-9 w-9 items-center justify-center rounded-2xl shadow-sm ${iconBgClass} ${iconTextClass}`}
      >
        {icon}
      </div>
      <div className="pt-[2px] min-w-0 flex flex-col">
        <p className="-mt-[2px] text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {label}
        </p>
        <p className={`inline-flex items-center gap-2 text-sm font-semibold ${valueClass}`}>
          <span
            className={`h-2 w-2 rounded-full ${dotClass} ${dotPulseClass}`}
            aria-hidden="true"
          />
          {value}
        </p>
      </div>
    </div>
  );
}