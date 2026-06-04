export const dynamic = "force-dynamic";

import {
    collection,
    query,
    where,
    getDocs,
    writeBatch,
    doc,
    Timestamp
} from "firebase/firestore";
import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { HadoopService } from "@/features/analytics/services/HadoopServices";

function convertToCsv(rows: any[]): string { // dirubah ke csv untuk mempermudah pembacaan job pada hadoop
    const header = ["deviceId", "receivedAt", "date", "hour", "temperature", "humidity", "light", "rain", "status", "mode", "source"];
    const lines = [header.join(",")];
    for (const row of rows) {
        lines.push([
            row.deviceId,
            row.receivedAt,
            row.date,
            row.hour,
            row.temperature,
            row.humidity,
            row.light,
            row.rain,
            row.status,
            row.mode,
            row.source,
        ].join(","));
    }
    return `${lines.join("\n")}\n`;
}
export async function POST() {
    try {
        const COLLECTION_NAME = "sensor_data";

        // 1. Tentukan batas waktu (7 hari yang lalu)
        const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
        const boundaryTimeMs = Date.now() - SEVEN_DAYS_MS;
        const boundaryDate = new Date(boundaryTimeMs);
        const boundaryTimestamp = Timestamp.fromDate(boundaryDate);
        console.log(`[Backup-Purge] Mencari data Firestore sebelum tanggal: ${boundaryDate.toISOString()}`);
        // 2. Kueri data yang dibuat sebelum batas waktu tersebut
        const sensorCollection = collection(db, COLLECTION_NAME);
        // Kueri berdasarkan field createdAt
        const q = query(sensorCollection, where("createdAt", "<", boundaryTimestamp));
        const snapshot = await getDocs(q);
        if (snapshot.empty) {
            return NextResponse.json({
                success: true,
                message: "Tidak ada data sensor yang berusia lebih dari 7 hari untuk dibackup.",
                backedUpCount: 0
            });
        }
        console.log(`[Backup-Purge] Menemukan ${snapshot.size} data sensor lama untuk dipindahkan.`);
        // 3. Ekstrak data dan format ke baris CSV
        const rows = snapshot.docs.map((docSnap) => {
            const data = docSnap.data();
            const docId = docSnap.id;
            // Ambil timestamp milidetik
            let receivedAt = Date.now();
            if (data.receivedAt) {
                receivedAt = Number(data.receivedAt);
            } else if (data.createdAt && typeof data.createdAt.toMillis === "function") {
                receivedAt = data.createdAt.toMillis();
            }
            const dateObj = new Date(receivedAt);
            const date = dateObj.toISOString().slice(0, 10);
            const hour = dateObj.getHours();
            return {
                docId, // Simpan untuk referensi penghapusan nanti
                deviceId: data.deviceId || "unknown-device",
                receivedAt,
                date,
                hour,
                temperature: typeof data.temperature === "number" ? data.temperature : 0,
                humidity: typeof data.humidity === "number" ? data.humidity : 0,
                light: typeof data.light === "number" ? data.light : 0,
                rain: typeof data.rain === "boolean" ? data.rain : false,
                status: data.status || "CLOSED",
                mode: data.mode || "AUTO",
                source: data.source || "UNKNOWN",
            };
        });
        // 4. Ubah menjadi CSV
        const csvContent = convertToCsv(rows);
        // Buat nama file dinamis berdasarkan tanggal hari ini
        const todayStr = new Date().toISOString().slice(0, 10);
        const hdfsPath = `/backup/sensors/sensor-backup-${todayStr}.csv`;
        console.log(`[Backup-Purge] Mengirim file backup ke HDFS di path: ${hdfsPath}`);
        // 5. Upload berkas CSV ke Hadoop HDFS
        const uploadSuccess = await HadoopService.uploadToHdfs(hdfsPath, csvContent);
        if (!uploadSuccess) {
            throw new Error("Proses unggah file CSV backup ke Hadoop gagal.");
        }
        // 6. Jika upload sukses, hapus data lama tersebut dari Firestore secara batch
        console.log(`[Backup-Purge] Backup sukses. Menghapus data lama dari Firestore...`);

        const CHUNK_SIZE = 500;
        let deletedCount = 0;
        for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
            const chunk = rows.slice(i, i + CHUNK_SIZE);
            const batch = writeBatch(db);
            chunk.forEach((row) => {
                const docRef = doc(db, COLLECTION_NAME, row.docId);
                batch.delete(docRef);
            });
            await batch.commit();
            deletedCount += chunk.length;
            console.log(`[Backup-Purge] Berhasil menghapus batch: ${deletedCount}/${rows.length} dokumen.`);
        }

        console.log(`[Backup-Purge] Selesai! Berhasil membackup dan menghapus ${deletedCount} data.`);
        return NextResponse.json({
            success: true,
            message: `Berhasil mencadangkan ${rows.length} data ke Hadoop HDFS dan membersihkan Firestore.`,
            hdfsPath,
            backedUpCount: rows.length
        });
    } catch (error: any) {
        console.error("[Backup-Purge] Error pada pipeline:", error);
        return NextResponse.json(
            { success: false, error: error.message || "Terjadi kesalahan internal pada server." },
            { status: 500 }
        );
    }
}