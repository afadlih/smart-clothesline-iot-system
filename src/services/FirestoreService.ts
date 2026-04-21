import {
  addDoc,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  type QueryConstraint,
  type Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { SensorData } from "@/models/SensorData";
import type { SensorData as MqttSensorData } from "@/lib/mqttClient";

const COLLECTION_NAME = "sensor_data";

export class FirestoreService {
  static async saveSensorData(data: MqttSensorData): Promise<void> {
    await addDoc(collection(db, COLLECTION_NAME), {
      temperature: data.temperature,
      humidity: data.humidity,
      light: data.light,
      rain: data.rain,
      status: data.status,
      createdAt: serverTimestamp(),
    });
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
}
