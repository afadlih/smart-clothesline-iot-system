import type { FirebaseScheduleItem } from "@/services/ScheduleService";
import { isWithinSchedule } from "@/features/system/ScheduleEngine";

export type ScheduleRuntimeState = "ACTIVE" | "INACTIVE";

export type ScheduleRuntimeDecision = {
  shouldPublish: boolean;
  command: "OPEN" | "CLOSE" | null;
  nextState: ScheduleRuntimeState;
  activeScheduleId: string | null;
  reason: string;
};

export function getCurrentHourFloat(now: Date): number {
  return now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
}

export function evaluateScheduleTransition(input: {
  now: number;
  schedules: FirebaseScheduleItem[];
  lastRuntimeState: ScheduleRuntimeState | null;
  currentStatus: "OPEN" | "CLOSED" | "MOVING" | "FAULT" | "RESTARTING" | "UNKNOWN" | null;
  mode: "AUTO" | "MANUAL" | "SCHEDULE" | "UNKNOWN" | null;
  rain: boolean | null;
  mqttConnected: boolean;
  telemetryFresh: boolean;
}): ScheduleRuntimeDecision {
  const date = new Date(input.now);
  const currentHour = getCurrentHourFloat(date);
  
  // Find an active enabled schedule
  const activeSchedule = input.schedules.find(s => 
    s.enabled && isWithinSchedule({ id: s.id, startHour: s.startHour, endHour: s.endHour, enabled: s.enabled }, currentHour)
  ) ?? null;

  const nextState: ScheduleRuntimeState = activeSchedule ? "ACTIVE" : "INACTIVE";
  const activeScheduleId = activeSchedule ? activeSchedule.id : null;

  // Rule: If mode is MANUAL, do not schedule-publish.
  // Return reason: "Schedule active, but device is in MANUAL mode."
  if (input.mode === "MANUAL") {
    return {
      shouldPublish: false,
      command: null,
      nextState,
      activeScheduleId,
      reason: "Schedule active, but device is in MANUAL mode."
    };
  }

  // Guards for blocking command publishing:
  if (!input.mqttConnected) {
    return {
      shouldPublish: false,
      command: null,
      nextState,
      activeScheduleId,
      reason: "MQTT disconnected; schedule command not sent."
    };
  }

  if (!input.telemetryFresh) {
    return {
      shouldPublish: false,
      command: null,
      nextState,
      activeScheduleId,
      reason: "Telemetry stale; schedule command not sent."
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
      nextState,
      activeScheduleId,
      reason: `Device status is ${input.currentStatus || "UNKNOWN"}; schedule command blocked.`
    };
  }

  // Deduplication check: transition check
  if (input.lastRuntimeState === nextState) {
    return {
      shouldPublish: false,
      command: null,
      nextState,
      activeScheduleId,
      reason: "No schedule transition detected."
    };
  }

  // Transition: INACTIVE -> ACTIVE (Schedule Window Started)
  if (nextState === "ACTIVE" && (input.lastRuntimeState === "INACTIVE" || input.lastRuntimeState === null)) {
    // If rain is true, command would be OPEN but is blocked.
    if (input.rain === true) {
      return {
        shouldPublish: false,
        command: null,
        nextState,
        activeScheduleId,
        reason: "Rain detected; OPEN blocked."
      };
    }
    return {
      shouldPublish: true,
      command: "OPEN",
      nextState,
      activeScheduleId,
      reason: "Schedule window started."
    };
  }

  // Transition: ACTIVE -> INACTIVE (Schedule Window Ended)
  if (nextState === "INACTIVE" && input.lastRuntimeState === "ACTIVE") {
    return {
      shouldPublish: true,
      command: "CLOSE",
      nextState,
      activeScheduleId,
      reason: "Schedule window ended."
    };
  }

  return {
    shouldPublish: false,
    command: null,
    nextState,
    activeScheduleId,
    reason: "No active schedule command triggered."
  };
}
