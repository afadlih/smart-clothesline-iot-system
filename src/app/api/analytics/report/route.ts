export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { HadoopService } from "@/features/analytics/services/HadoopServices";

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

export async function GET() {
  try {
    const HDFS_BACKUP_DIR = "/backup/sensors";

    // 1. Dapatkan daftar semua file backup di HDFS
    console.log(`[Analytics-Report] Mencari daftar file di ${HDFS_BACKUP_DIR}...`);
    const fileList = await HadoopService.listDirectory(HDFS_BACKUP_DIR);

    // Filter hanya mengambil file CSV
    const csvFiles = fileList.filter((file: any) => file.pathSuffix.endsWith(".csv"));

    if (csvFiles.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Belum ada file backup di Hadoop HDFS.",
        data: []
      });
    }

    console.log(`[Analytics-Report] Menemukan ${csvFiles.length} berkas backup di Hadoop.`);

    let allParsedData: any[] = [];

    // 2. Baca isi setiap file CSV dan gabungkan datanya
    for (const file of csvFiles) {
      const filePath = `${HDFS_BACKUP_DIR}/${file.pathSuffix}`;
      console.log(`[Analytics-Report] Membaca file: ${filePath}`);
      
      const csvContent = await HadoopService.readFromHadoop(filePath);
      const parsedRows = parseCsvToJson(csvContent);
      
      allParsedData = allParsedData.concat(parsedRows);
    }

    // Urutkan data berdasarkan waktu (chronological order)
    allParsedData.sort((a, b) => a.receivedAt - b.receivedAt);

    console.log(`[Analytics-Report] Sukses menggabungkan ${allParsedData.length} baris data dari Hadoop.`);

    return NextResponse.json({
      success: true,
      data: allParsedData
    });

  } catch (error: any) {
    console.error("[Analytics-Report] Gagal membuat report:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Gagal memproses data laporan dari Hadoop." },
      { status: 500 }
    );
  }
}