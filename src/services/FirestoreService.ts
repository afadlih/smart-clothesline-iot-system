import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  serverTimestamp,
  type QueryConstraint,
  type Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { SensorData } from "@/models/SensorData";
import { LocalStorageQueue, type QueueItem } from "./LocalStorageQueue";

const COLLECTION_NAME = "sensor_data";
const SYSTEM_SETTINGS_COLLECTION = "system_settings";
const SYSTEM_SETTINGS_DOC = "global";

export type SystemSettingsPayload = {
  controlMode: "AUTO" | "MANUAL" | "SCHEDULE";
  activeStartHour: number;
  activeEndHour: number;
};

export type FirestoreSensorPayload = {
  deviceId?: string;
  temperature: number;
  humidity: number;
  light: number;
  rain: boolean;
  status: "OPEN" | "CLOSED";
  mode?: "AUTO" | "MANUAL";
  source?: "STATUS_TOPIC" | "SENSOR_FALLBACK" | "UNKNOWN";
  receivedAt?: number;
  deviceTimestamp?: number;
  deviceUptimeMs?: number;
};

// Queue for sensor data when Firestore is offline
export const sensorDataQueue = new LocalStorageQueue<FirestoreSensorPayload>("sensor_data", 100, 5);

export class FirestoreService {
  private static toFirestoreDoc(data: FirestoreSensorPayload) {
    return {
      deviceId: data.deviceId ?? null,
      temperature: data.temperature,
      humidity: data.humidity,
      light: data.light,
      rain: data.rain,
      status: data.status,
      mode: data.mode ?? null,
      source: data.source ?? "UNKNOWN",
      receivedAt: typeof data.receivedAt === "number" ? data.receivedAt : null,
      deviceTimestamp: typeof data.deviceTimestamp === "number" ? data.deviceTimestamp : null,
      deviceUptimeMs: typeof data.deviceUptimeMs === "number" ? data.deviceUptimeMs : null,
      createdAt: serverTimestamp(),
    };
  }

  static async saveSensorData(data: FirestoreSensorPayload): Promise<void> {
    try {
      await addDoc(collection(db, COLLECTION_NAME), this.toFirestoreDoc(data));

      // Clear any queued items on success
      const queued = sensorDataQueue.getAll();
      for (const item of queued.slice(0, 5)) {
        // Try to flush a few items
        try {
          await addDoc(collection(db, COLLECTION_NAME), this.toFirestoreDoc(item.data));
          sensorDataQueue.remove(item.id);
        } catch (error) {
          console.warn("[Firestore] Failed to sync queued item:", item.id, error);
          // Stop trying if one fails
          break;
        }
      }
    } catch (error) {
      // Queue for later sync
      sensorDataQueue.add(data);
      console.warn("[Firestore] Failed to save sensor data, queued for later:", error);
      throw error;
    }
  }

  static async getSensorHistory(maxItems: number = 20): Promise<SensorData[]> {
    const constraints: QueryConstraint[] = [];

    // Note: Removed orderBy("createdAt") because it filters out documents missing that field.
    // We will sort the results client-side instead to ensure ALL data is included.

    if (maxItems > 0) {
      constraints.push(orderBy("createdAt", "desc"));
      constraints.push(limit(maxItems));
    }

    const q = query(collection(db, COLLECTION_NAME), ...constraints);
    const snapshot = await getDocs(q);

    const sensorDataList = snapshot.docs.map((doc) => {
      const value = doc.data() as {
        temperature?: number;
        humidity?: number;
        light?: number;
        rain?: boolean;
        status?: "OPEN" | "CLOSED" | "TERBUKA" | "TERTUTUP";
        createdAt?: Timestamp;
        receivedAt?: number;
        deviceTimestamp?: number;
      };

      const normalizedStatus =
        value.status === "TERBUKA"
          ? "OPEN"
          : value.status === "TERTUTUP"
            ? "CLOSED"
            : value.status;

      // Fallback timestamp logic: createdAt -> receivedAt -> deviceTimestamp -> now
      let timestamp: string;
      if (value.createdAt) {
        timestamp = value.createdAt.toDate().toISOString();
      } else if (typeof value.receivedAt === "number") {
        timestamp = new Date(value.receivedAt).toISOString();
      } else if (typeof value.deviceTimestamp === "number") {
        timestamp = new Date(value.deviceTimestamp).toISOString();
      } else {
        timestamp = new Date().toISOString();
      }

      return new SensorData({
        temp: value.temperature ?? 0,
        humidity: value.humidity ?? 0,
        light: value.light ?? 0,
        rain: value.rain ? 1 : 0,
        status: normalizedStatus ?? "CLOSED",
        timestamp: timestamp,
      });
    });

    // Client-side sort by timestamp descending
    return sensorDataList.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }

  static async saveSystemSettings(settings: SystemSettingsPayload): Promise<void> {
    const ref = doc(db, SYSTEM_SETTINGS_COLLECTION, SYSTEM_SETTINGS_DOC);
    await setDoc(
      ref,
      {
        ...settings,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  }

  static async getSystemSettings(): Promise<SystemSettingsPayload | null> {
    const ref = doc(db, SYSTEM_SETTINGS_COLLECTION, SYSTEM_SETTINGS_DOC);
    const snapshot = await getDoc(ref);
    if (!snapshot.exists()) {
      return null;
    }

    const value = snapshot.data() as Partial<SystemSettingsPayload>;
    if (
      (value.controlMode !== "AUTO" &&
        value.controlMode !== "MANUAL" &&
        value.controlMode !== "SCHEDULE") ||
      typeof value.activeStartHour !== "number" ||
      typeof value.activeEndHour !== "number"
    ) {
      return null;
    }

    return {
      controlMode: value.controlMode,
      activeStartHour: value.activeStartHour,
      activeEndHour: value.activeEndHour,
    };
  }

  /**
   * Sync queued sensor data from localStorage to Firestore
   * Returns count of synced items
   */
  static async syncQueuedSensorData(): Promise<number> {
    const stats = sensorDataQueue.getStats();
    if (stats.total === 0) {
      return 0;
    }

    console.info("[Firestore] Syncing queued sensor data:", stats);

    const { synced } = await sensorDataQueue.syncWith(async (item: QueueItem<FirestoreSensorPayload>) => {
      try {
        await addDoc(collection(db, COLLECTION_NAME), this.toFirestoreDoc(item.data));
      } catch (error) {
        console.warn("[Firestore] Individual queue item sync failed:", item.id, error);
        throw error;
      }
    });

    return synced;
  }

  /**
   * Get queue status
   */
  static getQueueStats() {
    return sensorDataQueue.getStats();
  }
}
