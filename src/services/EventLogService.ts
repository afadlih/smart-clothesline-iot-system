import {
  addDoc,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  type QueryConstraint,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { EventLog } from "@/models/EventLog";

const COLLECTION_NAME = "events_log";

export class EventLogService {
  static async logEvent(event: EventLog): Promise<void> {
    await addDoc(collection(db, COLLECTION_NAME), event);
  }

  static async getRecentEvents(maxItems: number = 10): Promise<EventLog[]> {
    const constraints: QueryConstraint[] = [orderBy("timestamp", "desc")];
    if (maxItems > 0) {
      constraints.push(limit(maxItems));
    }

    const q = query(collection(db, COLLECTION_NAME), ...constraints);
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => {
      const value = doc.data() as Partial<EventLog>;
      return {
        type:
          value.type === "USER" || value.type === "DEVICE" || value.type === "SYSTEM"
            ? value.type
            : "SYSTEM",
        action: typeof value.action === "string" ? value.action : "UNKNOWN",
        status: value.status === "OPEN" || value.status === "CLOSED" ? value.status : undefined,
        mode: value.mode === "AUTO" || value.mode === "MANUAL" ? value.mode : undefined,
        reason: typeof value.reason === "string" ? value.reason : undefined,
        timestamp: typeof value.timestamp === "number" ? value.timestamp : Date.now(),
      };
    });
  }
}

