import { SensorData } from "@/models/SensorData";

export type DecisionSource = "MANUAL" | "SAFETY" | "SCHEDULE" | "AUTO";
export type DecisionStatus = "OPEN" | "CLOSED";
export type StoredScheduleItem = {
  id: string;
  startHour: number;
  endHour: number;
  enabled: boolean;
};

export type ScheduleDecision = {
  activeSchedule: StoredScheduleItem | null;
  scheduleActive: boolean;
  overriddenBySafety: boolean;
  decisionSource: DecisionSource;
  recommendedStatus: DecisionStatus;
  reason: string;
};

export const SCHEDULE_STORAGE_KEY = "smart-clothesline-schedules-v1";

type LegacyScheduleItem = {
  id?: number | string;
  timeOpen?: string;
  timeClose?: string;
  isActive?: boolean;
};

function parseTimeToFloat(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return (value >= 0 && value <= 24) ? value : null;
  }
  if (typeof value === "string") {
    const match = value.match(/^(\d{1,2})(?::(\d{2}))?$/);
    if (!match) return null;
    const hour = Number(match[1]);
    const minute = match[2] ? Number(match[2]) : 0;
    if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
      return hour + minute / 60;
    }
  }
  return null;
}

export function isWithinSchedule(schedule: StoredScheduleItem, currentHour: number): boolean {
  if (!schedule.enabled) return false;
  if (schedule.startHour === schedule.endHour) return true;
  if (schedule.startHour < schedule.endHour) {
    return currentHour >= schedule.startHour && currentHour < schedule.endHour;
  }
  return currentHour >= schedule.startHour || currentHour < schedule.endHour;
}

export function normalizeSchedules(input: unknown): StoredScheduleItem[] {
  if (!Array.isArray(input)) return [];
  return input.map((item, index) => {
    if (!item || typeof item !== "object") return null;
    const candidate = item as Partial<StoredScheduleItem & LegacyScheduleItem>;
    const startHour = parseTimeToFloat(candidate.startHour ?? candidate.timeOpen);
    const endHour = parseTimeToFloat(candidate.endHour ?? candidate.timeClose);
    if (startHour === null || endHour === null) return null;
    return {
      id: String(candidate.id ?? `schedule-${index}`),
      startHour,
      endHour,
      enabled: candidate.enabled ?? candidate.isActive ?? true,
    } satisfies StoredScheduleItem;
  }).filter((item): item is StoredScheduleItem => item !== null);
}

export function loadSchedulesFromStorage(storage?: Storage): StoredScheduleItem[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(SCHEDULE_STORAGE_KEY);
    return raw ? normalizeSchedules(JSON.parse(raw)) : [];
  } catch { return []; }
}

export function getFinalState({
  sensor,
  schedules,
  pendingManual,
  currentHour,
  safetyConfig,
}: {
  sensor: SensorData | null;
  schedules: StoredScheduleItem[];
  pendingManual: "OPEN" | "CLOSED" | "AUTO" | "RESTART" | null;
  currentHour: number;
  safetyConfig?: {
    lightThreshold: number;
    autoCloseOnRain: boolean;
    autoCloseOnDark: boolean;
  };
}): ScheduleDecision {
  const activeSchedule = schedules.find((s) => isWithinSchedule(s, currentHour)) ?? null;
  const scheduleActive = activeSchedule !== null;
  const lightThreshold = safetyConfig?.lightThreshold ?? 200;
  const autoCloseOnRain = safetyConfig?.autoCloseOnRain ?? true;
  const autoCloseOnDark = safetyConfig?.autoCloseOnDark ?? true;
  const rainTriggered = sensor ? autoCloseOnRain && sensor.isRaining() : false;
  const darkTriggered = sensor ? autoCloseOnDark && sensor.isDark(lightThreshold) : false;
  const safetyTriggered = rainTriggered || darkTriggered;

  const formatH = (val: number) => {
    const h = Math.floor(val);
    const m = Math.round((val - h) * 60);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };

  if (pendingManual === "OPEN" || pendingManual === "CLOSED") {
    return {
      activeSchedule,
      scheduleActive,
      overriddenBySafety: false,
      decisionSource: "MANUAL",
      recommendedStatus: pendingManual === "OPEN" ? "OPEN" : "CLOSED",
      reason: `Manual command ${pendingManual} active.`,
    };
  }

  if (safetyTriggered) {
    const safetyReason = rainTriggered
      ? "Rain detected (auto close on rain enabled)"
      : `Low light detected (light < ${lightThreshold})`;

    return {
      activeSchedule,
      scheduleActive,
      overriddenBySafety: scheduleActive,
      decisionSource: "SAFETY",
      recommendedStatus: "CLOSED",
      reason: safetyReason,
    };
  }

  if (scheduleActive) {
    return {
      activeSchedule,
      scheduleActive: true,
      overriddenBySafety: false,
      decisionSource: "SCHEDULE",
      recommendedStatus: "OPEN",
      reason: `Schedule active ${formatH(activeSchedule.startHour)}-${formatH(activeSchedule.endHour)}`,
    };
  }

  return {
    activeSchedule,
    scheduleActive: false,
    overriddenBySafety: false,
    decisionSource: "AUTO",
    recommendedStatus: (sensor && !rainTriggered && !darkTriggered) ? "OPEN" : "CLOSED",
    reason: `Auto fallback (rainClose=${autoCloseOnRain ? "on" : "off"}, darkClose=${autoCloseOnDark ? "on" : "off"}, lightThreshold=${lightThreshold})`,
  };
}
