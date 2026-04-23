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

function parseHour(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    const normalized = Math.trunc(value);
    if (normalized >= 0 && normalized <= 23) {
      return normalized;
    }
  }

  if (typeof value === "string") {
    const match = value.match(/^(\d{1,2})(?::\d{2})?$/);
    if (!match) {
      return null;
    }

    const parsed = Number(match[1]);
    if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 23) {
      return parsed;
    }
  }

  return null;
}

export function isWithinSchedule(schedule: StoredScheduleItem, currentHour: number): boolean {
  if (!schedule.enabled) {
    return false;
  }

  if (schedule.startHour === schedule.endHour) {
    return true;
  }

  if (schedule.startHour < schedule.endHour) {
    return currentHour >= schedule.startHour && currentHour < schedule.endHour;
  }

  return currentHour >= schedule.startHour || currentHour < schedule.endHour;
}

export function normalizeSchedules(input: unknown): StoredScheduleItem[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .map((item, index) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const candidate = item as Partial<StoredScheduleItem & LegacyScheduleItem>;
      const startHour = parseHour(candidate.startHour ?? candidate.timeOpen);
      const endHour = parseHour(candidate.endHour ?? candidate.timeClose);
      if (startHour === null || endHour === null) {
        return null;
      }

      const rawId = candidate.id ?? `schedule-${index}`;
      return {
        id: String(rawId),
        startHour,
        endHour,
        enabled: candidate.enabled ?? candidate.isActive ?? true,
      } satisfies StoredScheduleItem;
    })
    .filter((item): item is StoredScheduleItem => item !== null);
}

export function loadSchedulesFromStorage(storage?: Storage): StoredScheduleItem[] {
  if (!storage) {
    return [];
  }

  try {
    const raw = storage.getItem(SCHEDULE_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    return normalizeSchedules(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function getFinalState({
  sensor,
  schedules,
  pendingManual,
  currentHour,
}: {
  sensor: SensorData | null;
  schedules: StoredScheduleItem[];
  pendingManual: "OPEN" | "CLOSE" | "AUTO" | null;
  currentHour: number;
}): ScheduleDecision {
  const activeSchedule =
    schedules.find((schedule) => isWithinSchedule(schedule, currentHour)) ?? null;
  const scheduleActive = activeSchedule !== null;
  const safetyTriggered = sensor ? sensor.isRaining() || sensor.isDark() : false;

  if (pendingManual === "OPEN" || pendingManual === "CLOSE") {
    return {
      activeSchedule,
      scheduleActive,
      overriddenBySafety: false,
      decisionSource: "MANUAL",
      recommendedStatus: pendingManual === "OPEN" ? "OPEN" : "CLOSED",
      reason: `Manual command ${pendingManual} sedang menunggu ACK device.`,
    };
  }

  if (safetyTriggered) {
    const reason = sensor?.isRaining()
      ? "Rain detected"
      : "Low light detected";
    return {
      activeSchedule,
      scheduleActive,
      overriddenBySafety: scheduleActive,
      decisionSource: "SAFETY",
      recommendedStatus: "CLOSED",
      reason,
    };
  }

  if (scheduleActive) {
    return {
      activeSchedule,
      scheduleActive: true,
      overriddenBySafety: false,
      decisionSource: "SCHEDULE",
      recommendedStatus: "OPEN",
      reason: `Schedule active ${String(activeSchedule.startHour).padStart(2, "0")}:00-${String(activeSchedule.endHour).padStart(2, "0")}:00`,
    };
  }

  const autoOpen = sensor ? !sensor.isRaining() && !sensor.isDark() : false;
  return {
    activeSchedule,
    scheduleActive: false,
    overriddenBySafety: false,
    decisionSource: "AUTO",
    recommendedStatus: autoOpen ? "OPEN" : "CLOSED",
    reason: sensor ? (autoOpen ? "Auto fallback: weather clear" : "Auto fallback: safety condition") : "Auto fallback: waiting sensor data",
  };
}
