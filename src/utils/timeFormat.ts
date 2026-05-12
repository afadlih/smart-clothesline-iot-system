const DEFAULT_TIMEZONE = "Asia/Jakarta";
const DEFAULT_LOCALE = "en-US";

export function formatDateTime(value: number | string | Date, options?: { timezone?: string }): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "-";
  return date.toLocaleString(DEFAULT_LOCALE, {
    hour12: false,
    timeZone: options?.timezone ?? DEFAULT_TIMEZONE,
  });
}

export function formatClock(value: number | string | Date, options?: { timezone?: string }): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "-";
  return date.toLocaleTimeString(DEFAULT_LOCALE, {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: options?.timezone ?? DEFAULT_TIMEZONE,
  });
}

export function formatTime(value: number | string | Date, options?: { timezone?: string }): string {
  return formatClock(value, options);
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function formatTimelineTimestamp(value: number): string {
  const target = new Date(value);
  if (!Number.isFinite(target.getTime())) return "-";
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  if (isSameDay(target, now)) {
    return formatClock(target);
  }
  if (isSameDay(target, yesterday)) {
    return `Yesterday • ${formatClock(target)}`;
  }
  return `${target.toLocaleDateString(DEFAULT_LOCALE, {
    month: "short",
    day: "2-digit",
    year: "numeric",
    timeZone: DEFAULT_TIMEZONE,
  })} • ${formatClock(target)}`;
}
