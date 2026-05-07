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
import type { SensorData as MqttSensorData } from "@/lib/mqttClient";
import { LocalStorageQueue, type QueueItem } from "./LocalStorageQueue";

const COLLECTION_NAME = "sensor_data";
const SYSTEM_SETTINGS_COLLECTION = "system_settings";
const SYSTEM_SETTINGS_DOC = "global";

export type SystemSettingsPayload = {
  controlMode: "AUTO" | "MANUAL" | "SCHEDULE";
  activeStartHour: number;
  activeEndHour: number;
};

// Queue for sensor data when Firestore is offline
export const sensorDataQueue = new LocalStorageQueue<MqttSensorData>("sensor_data", 100, 5);

export class FirestoreService {
  static async saveSensorData(data: MqttSensorData): Promise<void> {
    try {
      await addDoc(collection(db, COLLECTION_NAME), {
        temperature: data.temperature,
        humidity: data.humidity,
        light: data.light,
        rain: data.rain,
        status: data.status,
        createdAt: serverTimestamp(),
      });

      // Clear any queued items on success
      const queued = sensorDataQueue.getAll();
      for (const item of queued.slice(0, 5)) {
        // Try to flush a few items
        try {
          await addDoc(collection(db, COLLECTION_NAME), {
            temperature: item.data.temperature,
            humidity: item.data.humidity,
            light: item.data.light,
            rain: item.data.rain,
            status: item.data.status,
            createdAt: serverTimestamp(),
          });
          sensorDataQueue.remove(item.id);
        } catch {
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
    const constraints: QueryConstraint[] = [orderBy("createdAt", "desc")];

    if (maxItems > 0) {
      constraints.push(limit(maxItems));
    }

    const q = query(collection(db, COLLECTION_NAME), ...constraints);
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => {
      const value = doc.data() as {
        temperature?: number;
        humidity?: number;
        light?: number;
        rain?: boolean;
        status?: "TERBUKA" | "TERTUTUP";
        createdAt?: Timestamp;
      };

      return new SensorData({
        temp: value.temperature ?? 0,
        humidity: value.humidity ?? 0,
        light: value.light ?? 0,
        rain: value.rain ? 1 : 0,
        status: value.status ?? "TERTUTUP",
        timestamp: value.createdAt?.toDate().toISOString() ?? new Date().toISOString(),
      });
    });
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

    const { synced } = await sensorDataQueue.syncWith(async (item: QueueItem<MqttSensorData>) => {
      await addDoc(collection(db, COLLECTION_NAME), {
        temperature: item.data.temperature,
        humidity: item.data.humidity,
        light: item.data.light,
        rain: item.data.rain,
        status: item.data.status,
        createdAt: serverTimestamp(),
      });
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
