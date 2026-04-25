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
import {
  SCHEDULE_STORAGE_KEY,
  isWithinSchedule,
  loadSchedulesFromStorage,
  normalizeSchedules,
  type StoredScheduleItem,
} from "@/features/system/ScheduleEngine";

const SCHEDULE_COLLECTION = "schedules";
const SYSTEM_SETTINGS_COLLECTION = "system_settings";
const SYSTEM_SETTINGS_DOC = "global";
const SCHEDULE_MIGRATION_KEY = "smart-clothesline-schedule-migrated-v1";

export type FirebaseScheduleItem = {
  id: string;
  name: string;
  startHour: number;
  endHour: number;
  enabled: boolean;
};

export type ScheduleSummary = {
  totalCount: number;
  activeCount: number;
  isActiveNow: boolean;
  activeWindow: string | null;
};

type LoadScheduleResult = {
  schedules: StoredScheduleItem[];
  fromCache: boolean;
};

function hourLabel(value: number): string {
  return String(value).padStart(2, "0");
}

function formatWindow(schedule: StoredScheduleItem | null): string | null {
  if (!schedule) {
    return null;
  }

  return `${hourLabel(schedule.startHour)}:00-${hourLabel(schedule.endHour)}:00`;
}

function getStorage(): Storage | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }
  return window.localStorage;
}

function notifyScheduleUpdated(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new Event("schedule-updated"));
}

function toLegacyTime(hour: number): string {
  return `${hourLabel(hour)}:00`;
}

function toStored(item: FirebaseScheduleItem): StoredScheduleItem {
  return {
    id: item.id,
    startHour: item.startHour,
    endHour: item.endHour,
    enabled: item.enabled,
  };
}

async function getFirestoreSchedulesRaw(): Promise<FirebaseScheduleItem[]> {
  const scheduleQuery = query(collection(db, SCHEDULE_COLLECTION), orderBy("name", "asc"));
  const snapshot = await getDocs(scheduleQuery);

  return snapshot.docs
    .map((item) => {
      const value = item.data() as {
        name?: string;
        startHour?: number;
        endHour?: number;
        enabled?: boolean;
        timeOpen?: string;
        timeClose?: string;
        isActive?: boolean;
      };

      const normalized = normalizeSchedules([
        {
          id: item.id,
          startHour: value.startHour,
          endHour: value.endHour,
          enabled: value.enabled,
          timeOpen: value.timeOpen,
          timeClose: value.timeClose,
          isActive: value.isActive,
        },
      ])[0];

      if (!normalized) {
        return null;
      }

      return {
        id: item.id,
        name: value.name?.trim() ? value.name.trim() : `Schedule ${item.id.slice(0, 4)}`,
        startHour: normalized.startHour,
        endHour: normalized.endHour,
        enabled: normalized.enabled,
      } satisfies FirebaseScheduleItem;
    })
    .filter((item): item is FirebaseScheduleItem => item !== null);
}

function cacheSchedules(items: StoredScheduleItem[]): void {
  const storage = getStorage();
  if (!storage) {
    return;
  }
  storage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(items));
}

export class ScheduleService {
  static async migrateLegacyLocalSchedulesOnce(): Promise<void> {
    const storage = getStorage();
    if (!storage) {
      return;
    }

    if (storage.getItem(SCHEDULE_MIGRATION_KEY) === "done") {
      return;
    }

    try {
      const legacySchedules = loadSchedulesFromStorage(storage);
      if (legacySchedules.length === 0) {
        storage.setItem(SCHEDULE_MIGRATION_KEY, "done");
        return;
      }

      const existing = await getFirestoreSchedulesRaw();
      if (existing.length === 0) {
        for (const schedule of legacySchedules) {
          await addDoc(collection(db, SCHEDULE_COLLECTION), {
            name: `Imported Schedule ${schedule.id}`,
            startHour: schedule.startHour,
            endHour: schedule.endHour,
            enabled: schedule.enabled,
            timeOpen: toLegacyTime(schedule.startHour),
            timeClose: toLegacyTime(schedule.endHour),
            isActive: schedule.enabled,
          });
        }
      }

      storage.setItem(SCHEDULE_MIGRATION_KEY, "done");
    } catch (error) {
      console.error("[ScheduleService] Failed to migrate legacy schedules:", error);
    }
  }

  static async loadSchedules(): Promise<LoadScheduleResult> {
    try {
      const firestoreSchedules = await getFirestoreSchedulesRaw();
      const schedules = firestoreSchedules.map(toStored);
      cacheSchedules(schedules);
      return {
        schedules,
        fromCache: false,
      };
    } catch (error) {
      console.warn("[ScheduleService] Firestore read failed, fallback to local cache:", error);
      return {
        schedules: loadSchedulesFromStorage(getStorage()),
        fromCache: true,
      };
    }
  }

  static async loadDetailedSchedules(): Promise<{ schedules: FirebaseScheduleItem[]; fromCache: boolean }> {
    try {
      const schedules = await getFirestoreSchedulesRaw();
      cacheSchedules(schedules.map(toStored));
      return {
        schedules,
        fromCache: false,
      };
    } catch (error) {
      console.warn("[ScheduleService] Firestore detailed read failed, fallback to cache:", error);
      const cached = loadSchedulesFromStorage(getStorage()).map((item) => ({
        id: item.id,
        name: `Cached ${item.id}`,
        startHour: item.startHour,
        endHour: item.endHour,
        enabled: item.enabled,
      }));
      return {
        schedules: cached,
        fromCache: true,
      };
    }
  }

  static async addSchedule(input: {
    name: string;
    startHour: number;
    endHour: number;
    enabled?: boolean;
  }): Promise<void> {
    const enabled = input.enabled ?? true;
    await addDoc(collection(db, SCHEDULE_COLLECTION), {
      name: input.name.trim(),
      startHour: input.startHour,
      endHour: input.endHour,
      enabled,
      timeOpen: toLegacyTime(input.startHour),
      timeClose: toLegacyTime(input.endHour),
      isActive: enabled,
    });
    notifyScheduleUpdated();
  }

  static async updateSchedule(
    id: string,
    patch: Partial<Pick<FirebaseScheduleItem, "name" | "startHour" | "endHour" | "enabled">>,
  ): Promise<void> {
    const scheduleRef = doc(db, SCHEDULE_COLLECTION, id);
    const nextPayload: Record<string, unknown> = {};
    if (typeof patch.name === "string") {
      nextPayload.name = patch.name.trim();
    }
    if (typeof patch.startHour === "number") {
      nextPayload.startHour = patch.startHour;
      nextPayload.timeOpen = toLegacyTime(patch.startHour);
    }
    if (typeof patch.endHour === "number") {
      nextPayload.endHour = patch.endHour;
      nextPayload.timeClose = toLegacyTime(patch.endHour);
    }
    if (typeof patch.enabled === "boolean") {
      nextPayload.enabled = patch.enabled;
      nextPayload.isActive = patch.enabled;
    }

    await updateDoc(scheduleRef, nextPayload);
    notifyScheduleUpdated();
  }

  static async toggleSchedule(id: string, currentEnabled: boolean): Promise<void> {
    await this.updateSchedule(id, { enabled: !currentEnabled });
  }

  static async deleteSchedule(id: string): Promise<void> {
    await deleteDoc(doc(db, SCHEDULE_COLLECTION, id));
    notifyScheduleUpdated();
  }

  static async getSystemOverride(): Promise<boolean> {
    try {
      const docRef = doc(db, SYSTEM_SETTINGS_COLLECTION, SYSTEM_SETTINGS_DOC);
      const snapshot = await getDoc(docRef);
      if (!snapshot.exists()) {
        return false;
      }
      return Boolean(snapshot.data().userAllowedAuto);
    } catch {
      return false;
    }
  }

  static async setSystemOverride(status: boolean): Promise<void> {
    const docRef = doc(db, SYSTEM_SETTINGS_COLLECTION, SYSTEM_SETTINGS_DOC);
    await setDoc(
      docRef,
      {
        userAllowedAuto: status,
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );
  }

  static getSummary(schedules: StoredScheduleItem[], currentHour: number): ScheduleSummary {
    const enabledSchedules = schedules.filter((item) => item.enabled);
    const activeSchedule =
      enabledSchedules.find((item) => isWithinSchedule(item, currentHour)) ?? null;

    return {
      totalCount: schedules.length,
      activeCount: enabledSchedules.length,
      isActiveNow: activeSchedule !== null,
      activeWindow: formatWindow(activeSchedule),
    };
  }
}
