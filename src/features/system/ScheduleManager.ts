import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  getDoc,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  query,
  orderBy,
  DocumentData,
  setDoc,
} from "firebase/firestore";

export type ScheduleItem = {
  id?: string;
  name: string;
  timeOpen: string;
  timeClose: string;
  isActive: boolean;
};

export class ScheduleManager {
  private static collectionRef = collection(db, "schedules");

  static async getSystemOverride(): Promise<boolean> {
    try {
      const docRef = doc(db, "system_settings", "global");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data().userAllowedAuto || false;
      }
      return false;
    } catch {
      return false;
    }
  }

  static async setSystemOverride(status: boolean): Promise<void> {
    try {
      const docRef = doc(db, "system_settings", "global");
      await setDoc(docRef, { 
        userAllowedAuto: status,
        updatedAt: new Date().toISOString() 
      }, { merge: true });
    } catch (error) {
      console.error("Gagal update override:", error);
    }
  }

  static normalizeTime(value: string | undefined): string {
    const clean = (value || "00:00").trim();
    const parts = clean.split(":");
    if (parts.length !== 2) return "00:00";
    return `${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}`;
  }

  static toMinutes(time: string): number {
    const [h, m] = this.normalizeTime(time).split(":").map(Number);
    return h * 60 + m;
  }

  static async loadFromFirebase(): Promise<ScheduleItem[]> {
    try {
      const q = query(this.collectionRef, orderBy("name", "asc"));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map((item) => {
        const data = item.data() as DocumentData; 
        return {
          id: item.id,
          name: String(data.name || "Tanpa Nama").trim(),
          timeOpen: this.normalizeTime(data.timeOpen as string),
          timeClose: this.normalizeTime(data.timeClose as string),
          isActive: typeof data.isActive === "boolean" ? data.isActive : true,
        };
      });
    } catch {
      return [];
    }
  }

  static async addSchedule(item: Omit<ScheduleItem, "id">) {
    return await addDoc(this.collectionRef, {
      name: item.name.trim(),
      timeOpen: this.normalizeTime(item.timeOpen),
      timeClose: this.normalizeTime(item.timeClose),
      isActive: item.isActive,
    });
  }

  static async toggleStatus(docId: string, currentStatus: boolean) {
    const scheduleDoc = doc(db, "schedules", docId);
    return await updateDoc(scheduleDoc, { isActive: !currentStatus });
  }

  static async deleteSchedule(docId: string) {
    return await deleteDoc(doc(db, "schedules", docId));
  }
}