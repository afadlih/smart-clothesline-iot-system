const DEFAULT_TIMEZONE = "Asia/Jakarta";
const DEFAULT_LOCALE = "en-US";

export function formatDateTime(value: number | string | Date, options?: { timezone?: string }): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "-";
  
  const tz = options?.timezone ?? DEFAULT_TIMEZONE;
  if (tz === "Asia/Jakarta") {
    const offsetMs = 7 * 60 * 60 * 1000;
    const target = new Date(date.getTime() + offsetMs);
    const yyyy = target.getUTCFullYear();
    const mm = String(target.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(target.getUTCDate()).padStart(2, '0');
    const hh = String(target.getUTCHours()).padStart(2, '0');
    const min = String(target.getUTCMinutes()).padStart(2, '0');
    const ss = String(target.getUTCSeconds()).padStart(2, '0');
    return `${mm}/${dd}/${yyyy}, ${hh}:${min}:${ss}`;
  }
  
  try {
    return date.toLocaleString(DEFAULT_LOCALE, {
      hour12: false,
      timeZone: tz,
    });
  } catch {
    return date.toISOString();
  }
}

export function formatClock(value: number | string | Date, options?: { timezone?: string }): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "-";
  
  const tz = options?.timezone ?? DEFAULT_TIMEZONE;
  if (tz === "Asia/Jakarta") {
    const offsetMs = 7 * 60 * 60 * 1000;
    const target = new Date(date.getTime() + offsetMs);
    const hh = String(target.getUTCHours()).padStart(2, '0');
    const min = String(target.getUTCMinutes()).padStart(2, '0');
    return `${hh}:${min}`;
  }
  
  try {
    return date.toLocaleTimeString(DEFAULT_LOCALE, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: tz,
    });
  } catch {
    const target = new Date(date.getTime());
    const hh = String(target.getHours()).padStart(2, '0');
    const min = String(target.getMinutes()).padStart(2, '0');
    return `${hh}:${min}`;
  }
}

export function formatTime(value: number | string | Date, options?: { timezone?: string }): string {
  return formatClock(value, options);
}

export function formatTimelineTimestamp(value: number): string {
  const target = new Date(value);
  if (!Number.isFinite(target.getTime())) return "-";
  
  const offsetMs = 7 * 60 * 60 * 1000;
  const targetJkt = new Date(target.getTime() + offsetMs);
  const nowJkt = new Date(Date.now() + offsetMs);
  const yesterdayJkt = new Date(Date.now() - 24 * 60 * 60 * 1000 + offsetMs);

  const isSameDayJkt = (a: Date, b: Date) => 
    a.getUTCFullYear() === b.getUTCFullYear() && 
    a.getUTCMonth() === b.getUTCMonth() && 
    a.getUTCDate() === b.getUTCDate();

  if (isSameDayJkt(targetJkt, nowJkt)) {
    return formatClock(target);
  }
  if (isSameDayJkt(targetJkt, yesterdayJkt)) {
    return `Yesterday • ${formatClock(target)}`;
  }
  
  const monthsEn = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const m = monthsEn[targetJkt.getUTCMonth()];
  const d = String(targetJkt.getUTCDate()).padStart(2, '0');
  const y = targetJkt.getUTCFullYear();
  
  return `${m} ${d}, ${y} • ${formatClock(target)}`;
}
