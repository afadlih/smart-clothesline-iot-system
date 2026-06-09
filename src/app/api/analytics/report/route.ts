export const dynamic = "force-dynamic";

import { NextResponse, NextRequest } from "next/server";
import { HadoopService } from "@/features/analytics/services/HadoopServices";
import path from "path";
import { promises as fs } from "fs";

// Helper untuk mengubah string CSV dari Hadoop kembali menjadi Array Objek JSON
function parseCsvToJson(csvText: string): any[] {
  const lines = csvText.split("\n").map(line => line.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(",");
  const result: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i]) continue; // Lewati baris kosong
    const currentLine = lines[i].split(",");

    // Pastikan panjang kolom sesuai dengan header
    if (currentLine.length !== headers.length) continue;

    const obj: any = {};
    headers.forEach((header, index) => {
      const value = currentLine[index];

      // Konversi tipe data string ke tipe data asli (number/boolean)
      if (header === "receivedAt" || header === "temperature" || header === "humidity" || header === "light" || header === "hour") {
        obj[header] = Number(value);
      } else if (header === "rain") {
        obj[header] = value === "true";
      } else {
        obj[header] = value;
      }
    });
    result.push(obj);
  }

  return result;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get("deviceId");
    if (!deviceId) {
      return NextResponse.json(
        { success: false, error: "Parameter 'deviceId' wajib disertakan." },
        { status: 400 }
      );
    }
    const HDFS_BACKUP_DIR = "/backup/sensors";
    let allParsedData: any[] = [];
    let usingFallback = false;
    // 1. COBA HUBUGNI HADOOP TERLEBIH DAHULU
    try {
      console.log(`[Analytics-Report] Mencari daftar file di HDFS: ${HDFS_BACKUP_DIR}...`);
      const fileList = await HadoopService.listDirectory(HDFS_BACKUP_DIR);
      const csvFiles = fileList.filter((file: any) => file.pathSuffix.endsWith(".csv"));
      if (csvFiles.length > 0) {
        for (const file of csvFiles) {
          const filePath = `${HDFS_BACKUP_DIR}/${file.pathSuffix}`;
          const csvContent = await HadoopService.readFromHadoop(filePath);
          const parsedRows = parseCsvToJson(csvContent);
          const filteredRows = parsedRows.filter((row: any) => row.deviceId === deviceId);
          allParsedData = allParsedData.concat(filteredRows);
        }
      }
    } catch (hadoopError) {
      // 2. JIKA HADOOP gagal/offline, AKTIFKAN FALLBACK LOKAL
      console.warn("[Analytics-Report] Gagal terhubung ke Hadoop Cluster. Mengalihkan ke lokal fallback (sensor-data.csv)...", hadoopError);
      usingFallback = true;
    }
    // 3. JALANKAN LOGIKA FALLBACK (MEMBACA DARI EXPORTS/SENSOR-DATA.CSV)
    if (usingFallback || allParsedData.length === 0) {
      try {
        const localCsvPath = path.join(process.cwd(), "exports", "sensor-data.csv");
        const csvContent = await fs.readFile(localCsvPath, "utf-8");
        const parsedRows = parseCsvToJson(csvContent);

        // Saring data berdasarkan deviceId yang diminta client
        allParsedData = parsedRows.filter((row: any) => row.deviceId === deviceId);

        console.log(`[Analytics-Report] Fallback Sukses! Berhasil membaca ${allParsedData.length} baris data dari local sensor-data.csv.`);
      } catch (localError) {
        console.error("[Analytics-Report] Gagal membaca berkas lokal:", localError);
        throw new Error("Hadoop Offline dan Gagal membaca cadangan lokal (sensor-data.csv).");
      }
    }
    // Urutkan data berdasarkan waktu (chronological order)
    allParsedData.sort((a, b) => a.receivedAt - b.receivedAt);
    return NextResponse.json({
      success: true,
      data: allParsedData,
      source: usingFallback ? "local_fallback" : "hadoop"
    });
  } catch (error: any) {
    console.error("[Analytics-Report] Gagal memuat data:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Gagal memproses data laporan." },
      { status: 500 }
    );
  }
}