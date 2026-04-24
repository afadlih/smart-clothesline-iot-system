// features/system/ScheduleManager.ts

import { normalizeSchedules } from "@/features/system/ScheduleEngine";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  query,
  orderBy,
  DocumentData, // Import ini untuk pengganti 'any'
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

  // ==============================
  // UPDATE GLOBAL MODE
  // Sesuai screenshot: system_settings/global -> controlMode
  // ==============================
  static async updateSystemMode(mode: "AUTO" | "MANUAL") {
    try {
      const statusDoc = doc(db, "system_settings", "global");
      await updateDoc(statusDoc, { 
        controlMode: mode,
        updatedAt: new Date().toISOString() 
      });
    } catch (error) {
      console.error("Gagal update mode sistem:", error);
    }
  }

  static normalizeTime(value: string | undefined): string {
    const clean = (value || "00:00").trim();
    const parts = clean.split(":");
    if (parts.length !== 2) return "00:00";
    const hour = parts[0].padStart(2, "0");
    const minute = parts[1].padStart(2, "0");
    return `${hour}:${minute}`;
  }

  static toMinutes(time: string): number {
    const fixed = this.normalizeTime(time);
    const [h, m] = fixed.split(":").map(Number);
    return h * 60 + m;
  }

  static isValidRange(start: string, end: string): boolean {
    return this.toMinutes(start) < this.toMinutes(end);
  }

  // ==============================
  // LOAD FIREBASE (FIXED ANY ERROR)
  // ==============================
  static async loadFromFirebase(): Promise<ScheduleItem[]> {
    try {
      const q = query(this.collectionRef, orderBy("name", "asc"));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map((item) => {
        // Menggunakan DocumentData alih-alih any untuk ESLint
        const data = item.data() as DocumentData; 
        
        return {
          id: item.id,
          name: String(data.name || "Tanpa Nama").trim(),
          timeOpen: this.normalizeTime(data.timeOpen as string),
          timeClose: this.normalizeTime(data.timeClose as string),
          isActive: typeof data.isActive === "boolean" ? data.isActive : true,
        };
      });
    } catch (error) {
      console.error("Error loading schedules:", error);
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
    const scheduleDoc = doc(db, "schedules", docId);
    return await deleteDoc(scheduleDoc);
  }

  static toNormalized(schedules: ScheduleItem[]) {
    return normalizeSchedules(
      schedules.map((item) => ({
        id: item.id || Math.random().toString(),
        timeOpen: this.normalizeTime(item.timeOpen),
        timeClose: this.normalizeTime(item.timeClose),
        isActive: item.isActive,
      }))
    );
  }
}