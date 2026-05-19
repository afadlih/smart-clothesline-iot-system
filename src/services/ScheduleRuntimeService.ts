import { StoredScheduleItem, isWithinSchedule } from "@/features/system/ScheduleEngine";

export type ScheduleRuntimeDecision = {
  shouldPublish: boolean;
  command: "OPEN" | "CLOSE" | null;
  reason: string;
  activeScheduleId: string | null;
};

export function evaluateScheduleTransition(input: {
  now: number;
  currentStatus: "OPEN" | "CLOSED" | "MOVING" | "FAULT" | "RESTARTING" | "UNKNOWN" | null;
  mode: "AUTO" | "MANUAL" | null;
  schedules: StoredScheduleItem[];
  sensorRain: boolean;
  isDark: boolean;
  lastPublishedScheduleState: "ACTIVE" | "INACTIVE" | null;
}): ScheduleRuntimeDecision {
  const date = new Date(input.now);
  const currentHour = date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;
  
  const activeSchedule = input.schedules.find((s) => isWithinSchedule(s, currentHour)) ?? null;
  const scheduleActive = activeSchedule !== null;
  const activeScheduleId = activeSchedule ? activeSchedule.id : null;
  const currentScheduleState = scheduleActive ? "ACTIVE" : "INACTIVE";

  if (input.mode === "MANUAL") {
    return {
      shouldPublish: false,
      command: null,
      reason: "Blocked: Device is in MANUAL mode.",
      activeScheduleId,
    };
  }

  if (
    input.currentStatus === "MOVING" ||
    input.currentStatus === "FAULT" ||
    input.currentStatus === "RESTARTING"
  ) {
    return {
      shouldPublish: false,
      command: null,
      reason: `Blocked: Device status is ${input.currentStatus || "UNKNOWN"}.`,
      activeScheduleId,
    };
  }

  // Deduplication check: only act on state transitions (ACTIVE <-> INACTIVE)
  if (input.lastPublishedScheduleState === currentScheduleState) {
    return {
      shouldPublish: false,
      command: null,
      reason: `No transition. Schedule remains ${currentScheduleState}.`,
      activeScheduleId,
    };
  }

  // Transition: Inactive -> Active
  if (input.lastPublishedScheduleState !== "ACTIVE" && scheduleActive) {
    if (input.sensorRain) {
      return {
        shouldPublish: true,
        command: "CLOSE",
        reason: `Schedule active, but command forced CLOSE because rain is detected.`,
        activeScheduleId,
      };
    }
    if (input.isDark) {
      return {
        shouldPublish: true,
        command: "CLOSE",
        reason: `Schedule active, but command forced CLOSE because low light (darkness) is detected.`,
        activeScheduleId,
      };
    }
    return {
      shouldPublish: true,
      command: "OPEN",
      reason: `Schedule active. Command OPEN sent.`,
      activeScheduleId,
    };
  }

  // Transition: Active -> Inactive
  if (input.lastPublishedScheduleState === "ACTIVE" && !scheduleActive) {
    return {
      shouldPublish: true,
      command: "CLOSE",
      reason: `Schedule became inactive. Command CLOSE sent.`,
      activeScheduleId,
    };
  }

  return {
    shouldPublish: false,
    command: null,
    reason: "No transition or action required.",
    activeScheduleId,
  };
}
