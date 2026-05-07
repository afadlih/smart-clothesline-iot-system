import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { normalizeSchedules, isWithinSchedule, SCHEDULE_STORAGE_KEY } from "@/features/system/ScheduleEngine";
import { mqttService, COMMAND_TOPIC } from "@/services/MQTTService"; 

const SCHEDULE_COLLECTION = "schedules";
const SYSTEM_SETTINGS_COLLECTION = "system_settings";
const SYSTEM_SETTINGS_DOC = "global";
const SCHEDULE_MIGRATION_KEY = "smart-clothesline-schedule-migrated-v1";
const SCHEDULE_CACHE_KEY = "smart-clothesline-schedules-cache-v1";
const SCHEDULE_CACHE_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 14; // 14 days

export type FirebaseScheduleItem = { id: string; name: string; startHour: number; endHour: number; enabled: boolean; };

export interface ScheduleSummary {
  totalCount: number;
  activeCount: number;
  isActiveNow: boolean;
  activeWindow: string | null;
}

function hourLabel(value: number): string {
  const h = Math.floor(value);
  const m = Math.round((value - h) * 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function safeGetLocalStorage(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

function readScheduleCache(): FirebaseScheduleItem[] | null {
  const storage = safeGetLocalStorage();
  if (!storage) return null;

  try {
    const raw = storage.getItem(SCHEDULE_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      savedAt?: number;
      schedules?: unknown;
    };
    if (typeof parsed.savedAt !== "number") return null;
    if (Date.now() - parsed.savedAt > SCHEDULE_CACHE_MAX_AGE_MS) return null;
    if (!Array.isArray(parsed.schedules)) return null;

    return parsed.schedules
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const candidate = item as Partial<FirebaseScheduleItem>;
        if (typeof candidate.id !== "string") return null;
        if (typeof candidate.name !== "string") return null;
        if (typeof candidate.startHour !== "number") return null;
        if (typeof candidate.endHour !== "number") return null;
        if (typeof candidate.enabled !== "boolean") return null;
        return {
          id: candidate.id,
          name: candidate.name,
          startHour: candidate.startHour,
          endHour: candidate.endHour,
          enabled: candidate.enabled,
        } satisfies FirebaseScheduleItem;
      })
      .filter((item): item is FirebaseScheduleItem => item !== null);
  } catch {
    return null;
  }
}

function writeScheduleCache(schedules: FirebaseScheduleItem[]) {
  const storage = safeGetLocalStorage();
  if (!storage) return;
  try {
    storage.setItem(
      SCHEDULE_CACHE_KEY,
      JSON.stringify({
        savedAt: Date.now(),
        schedules,
      }),
    );
  } catch {
    // ignore cache errors
  }
}

async function getFirestoreSchedulesRaw(): Promise<FirebaseScheduleItem[]> {
  const q = query(collection(db, SCHEDULE_COLLECTION), orderBy("name", "asc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((item) => {
    const value = item.data() as Record<string, unknown>;
    const normalized = normalizeSchedules([{
      id: item.id, startHour: value.startHour, endHour: value.endHour, enabled: value.enabled,
      timeOpen: value.timeOpen, timeClose: value.timeClose, isActive: value.isActive,
    }])[0];
    if (!normalized) return null;
    return {
      id: item.id,
      name: typeof value.name === "string" && value.name.trim() ? value.name.trim() : `Schedule ${item.id.slice(0, 4)}`,
      startHour: normalized.startHour, endHour: normalized.endHour, enabled: normalized.enabled,
    } satisfies FirebaseScheduleItem;
  }).filter((item): item is FirebaseScheduleItem => item !== null);
}

export class ScheduleService {
  static parseTimeToFloat(value: string): number {
    const [h, m] = value.split(":").map(Number);
    return h + (m || 0) / 60;
  }

  static async loadSchedules(): Promise<{ schedules: FirebaseScheduleItem[]; fromCache: boolean }> {
    try {
      const schedules = await getFirestoreSchedulesRaw();
      writeScheduleCache(schedules);
      return { schedules, fromCache: false };
    } catch {
      const cached = readScheduleCache();
      return { schedules: cached ?? [], fromCache: true };
    }
  }

  static getSummary(schedules: FirebaseScheduleItem[], currentHourFloat: number): ScheduleSummary {
    const totalCount = schedules.length;
    const enabledSchedules = schedules.filter(s => s.enabled);
    
    const runningNow = enabledSchedules.find(s => 
      isWithinSchedule(
        { id: s.id, startHour: s.startHour, endHour: s.endHour, enabled: s.enabled }, 
        currentHourFloat
      )
    );

    return {
      totalCount,
      activeCount: enabledSchedules.length,
      isActiveNow: !!runningNow,
      activeWindow: runningNow 
        ? `${hourLabel(runningNow.startHour)} - ${hourLabel(runningNow.endHour)}` 
        : null
    };
  }

  static async addSchedule(input: { name: string; startHour: number; endHour: number; enabled?: boolean }): Promise<void> {
    await addDoc(collection(db, SCHEDULE_COLLECTION), {
      name: input.name.trim(), startHour: input.startHour, endHour: input.endHour, enabled: input.enabled ?? true,
      timeOpen: hourLabel(input.startHour), timeClose: hourLabel(input.endHour), isActive: input.enabled ?? true,
    });
    window.dispatchEvent(new Event("schedule-updated"));
  }

  static async toggleSchedule(id: string, currentEnabled: boolean): Promise<void> {
    try {
      const newStatus = !currentEnabled;
      await updateDoc(doc(db, SCHEDULE_COLLECTION, id), { 
        enabled: newStatus, 
        isActive: newStatus 
      });
      window.dispatchEvent(new Event("schedule-updated"));
    } catch (err) {
      console.error("Failed to toggle schedule:", err);
    }
  }

  static async deleteSchedule(id: string): Promise<void> {
    await deleteDoc(doc(db, SCHEDULE_COLLECTION, id));
    window.dispatchEvent(new Event("schedule-updated"));
  }

  static async getSystemOverride(): Promise<boolean> {
    try {
      const snapshot = await getDoc(doc(db, SYSTEM_SETTINGS_COLLECTION, SYSTEM_SETTINGS_DOC));
      return snapshot.exists() ? Boolean(snapshot.data().userAllowedAuto) : false;
    } catch { return false; }
  }

  static async setSystemOverride(status: boolean): Promise<void> {
    const wokwiCommand = status ? "AUTO" : "CLOSE";
    
    await setDoc(doc(db, SYSTEM_SETTINGS_COLLECTION, SYSTEM_SETTINGS_DOC), { 
      userAllowedAuto: status, 
      command: wokwiCommand,
      updatedAt: new Date().toISOString() 
    }, { merge: true });

    mqttService.publish(COMMAND_TOPIC, { command: wokwiCommand });
    
    window.dispatchEvent(new Event("schedule-updated"));
    console.info(`[MQTT] Published ${wokwiCommand} to ${COMMAND_TOPIC}`);
  }

  static async migrateLegacyLocalSchedulesOnce(): Promise<void> {
    const storage = safeGetLocalStorage();
    if (!storage) return;

    try {
      if (storage.getItem(SCHEDULE_MIGRATION_KEY) === "done") {
        return;
      }

      const raw = storage.getItem(SCHEDULE_STORAGE_KEY);
      if (!raw) {
        storage.setItem(SCHEDULE_MIGRATION_KEY, "done");
        return;
      }

      const legacySchedules = normalizeSchedules(JSON.parse(raw));
      if (legacySchedules.length === 0) {
        storage.setItem(SCHEDULE_MIGRATION_KEY, "done");
        return;
      }

      // Avoid duplicating if Firestore already has schedules.
      const existing = await getFirestoreSchedulesRaw();
      if (existing.length > 0) {
        storage.setItem(SCHEDULE_MIGRATION_KEY, "done");
        return;
      }

      for (let index = 0; index < legacySchedules.length; index += 1) {
        const schedule = legacySchedules[index];
        await addDoc(collection(db, SCHEDULE_COLLECTION), {
          name: `Schedule ${index + 1}`,
          startHour: schedule.startHour,
          endHour: schedule.endHour,
          enabled: schedule.enabled,
          timeOpen: hourLabel(schedule.startHour),
          timeClose: hourLabel(schedule.endHour),
          isActive: schedule.enabled,
        });
      }

      storage.setItem(SCHEDULE_MIGRATION_KEY, "done");
      window.dispatchEvent(new Event("schedule-updated"));
    } catch (error) {
      console.warn("[ScheduleMigration] Failed to migrate legacy schedules:", error);
      // Intentionally do not mark as done; try again next time.
    }
  }
}
