"use client";

import type { SystemEvent } from "@/models/SystemEvent";

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function badgeByType(type: SystemEvent["type"]): string {
  if (type === "ALERT") return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300";
  if (type === "COMMAND") return "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300";
  if (type === "CONFIG") return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";
  if (type === "STATUS") return "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300";
  return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
}

function formatTimestamp(timestamp: number): string {
  const target = new Date(timestamp);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  if (isSameDay(target, now)) {
    return target.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  }

  if (isSameDay(target, yesterday)) {
    return `Yesterday • ${target.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`;
  }

  return `${target.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  })} • ${target.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`;
}

function groupLabel(timestamp: number): "Today" | "Yesterday" | "Older" {
  const target = new Date(timestamp);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  if (isSameDay(target, now)) return "Today";
  if (isSameDay(target, yesterday)) return "Yesterday";
  return "Older";
}

function isImportantEvent(event: SystemEvent): boolean {
  const message = `${event.title} ${event.description}`.toLowerCase();
  return (
    message.includes("offline") ||
    message.includes("rain") ||
    message.includes("manual") ||
    message.includes("schedule")
  );
}

export default function EventTimeline({ events }: { events: SystemEvent[] }) {
  const sorted = [...events].sort((a, b) => b.timestamp - a.timestamp).slice(0, 30);
  const grouped = {
    Today: sorted.filter((event) => groupLabel(event.timestamp) === "Today"),
    Yesterday: sorted.filter((event) => groupLabel(event.timestamp) === "Yesterday"),
    Older: sorted.filter((event) => groupLabel(event.timestamp) === "Older"),
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
          Timeline & Event Log
        </h3>
        <span className="text-xs text-slate-500 dark:text-slate-400">Latest 30 events</span>
      </div>

      {sorted.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">No events yet.</p>
      ) : (
        <div className="space-y-4">
          {(["Today", "Yesterday", "Older"] as const).map((label) => (
            <div key={label}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
              <div className="space-y-2">
                {grouped[label].length === 0 ? (
                  <p className="rounded-lg border border-dashed border-slate-200 px-3 py-2 text-xs text-slate-400 dark:border-slate-700">
                    No events
                  </p>
                ) : (
                  grouped[label].map((event) => (
                    <div
                      key={event.id}
                      className={`rounded-lg border p-3 transition-colors ${
                        isImportantEvent(event)
                          ? "border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60"
                          : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${badgeByType(event.type)}`}>
                            {event.type}
                          </span>
                          {isImportantEvent(event) && (
                            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                              Priority
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-slate-500 dark:text-slate-400">{formatTimestamp(event.timestamp)}</span>
                      </div>
                      <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{event.title}</p>
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{event.description}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
