"use client";

import type { SystemEvent } from "@/models/SystemEvent";

function timeAgo(timestamp: number): string {
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

function badgeByType(type: SystemEvent["type"]): string {
  if (type === "ALERT") return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300";
  if (type === "COMMAND") return "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300";
  if (type === "CONFIG") return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";
  if (type === "STATUS") return "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300";
  return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
}

export default function EventTimeline({ events }: { events: SystemEvent[] }) {
  const alerts = events.filter((event) => event.type === "ALERT");
  const logs = events.filter((event) => event.type !== "ALERT");

  const renderRows = (items: SystemEvent[]) => (
    <div className="space-y-2">
      {items.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-slate-400">No events.</p>
      ) : (
        items.slice(0, 20).map((event) => (
          <div key={event.id} className="rounded-lg border border-gray-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between gap-2">
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${badgeByType(event.type)}`}>
                {event.type}
              </span>
              <span className="text-xs text-gray-500 dark:text-slate-400">{timeAgo(event.timestamp)}</span>
            </div>
            <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-slate-100">{event.title}</p>
            <p className="mt-1 text-xs text-gray-600 dark:text-slate-300">{event.description}</p>
          </div>
        ))
      )}
    </div>
  );

  return (
    <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="rounded-2xl border border-red-200 bg-red-50/60 p-4 dark:border-red-900/30 dark:bg-red-900/10">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-red-700 dark:text-red-300">Alerts</h3>
        <div className="mt-3">{renderRows(alerts)}</div>
      </div>
      <div className="rounded-2xl border border-gray-200 bg-gray-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/30">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-700 dark:text-slate-200">Logs</h3>
        <div className="mt-3">{renderRows(logs)}</div>
      </div>
    </section>
  );
}
