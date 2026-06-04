import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, orderBy } from "firebase/firestore";

const EXPORT_DIR = path.resolve(process.cwd(), "exports");
const CSV_OUTPUT = path.join(EXPORT_DIR, "sensor-data.csv");
const JSON_OUTPUT = path.join(EXPORT_DIR, "sensor-data.json");

// Helper untuk membaca file .env.local secara manual di Node.js environment
async function loadEnv() {
  try {
    const envPath = path.resolve(process.cwd(), ".env.local");
    const content = await readFile(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const index = trimmed.indexOf("=");
      if (index === -1) continue;
      const key = trimmed.slice(0, index).trim();
      const val = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, "");
      process.env[key] = val;
    }
    console.log("[bigdata] Loaded environment variables from .env.local");
  } catch (error) {
    console.log("[bigdata] .env.local not found, reading from default environment variables.");
  }
}

// Menghasilkan string CSV sesuai kontrak data di halaman 4 PDF
function toCsv(rows) {
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

// Menjalankan fallback data dummy jika koneksi firebase gagal atau tidak ada kredensial
async function runSampleMode() {
  console.log("[bigdata] Generating sample sensor data for verification...");
  
  const sampleRows = [
    {
      deviceId: "wokwi-default",
      receivedAt: 1779167140069,
      date: "2026-05-19",
      hour: 14,
      temperature: 30.7,
      humidity: 73,
      light: 1200,
      rain: true,
      status: "CLOSED",
      mode: "AUTO",
      source: "WOKWI"
    },
    {
      deviceId: "wokwi-default",
      receivedAt: 1779167200069,
      date: "2026-05-19",
      hour: 14,
      temperature: 31.1,
      humidity: 74,
      light: 1400,
      rain: true,
      status: "CLOSED",
      mode: "AUTO",
      source: "WOKWI"
    },
    {
      deviceId: "esp32-demo-01",
      receivedAt: 1779167260069,
      date: "2026-05-19",
      hour: 15,
      temperature: 29.8,
      humidity: 70,
      light: 6200,
      rain: false,
      status: "OPEN",
      mode: "AUTO",
      source: "DEVICE"
    }
  ];

  await mkdir(EXPORT_DIR, { recursive: true });
  await writeFile(CSV_OUTPUT, toCsv(sampleRows), "utf-8");
  await writeFile(JSON_OUTPUT, JSON.stringify(sampleRows, null, 2), "utf-8");
  
  console.log(`[bigdata] [Sample] CSV written to: ${CSV_OUTPUT}`);
  console.log(`[bigdata] [Sample] JSON written to: ${JSON_OUTPUT}`);
}

async function runFirestoreMode() {
  await loadEnv();

  // Ambil config dari environment variables
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY;
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || process.env.FIREBASE_AUTH_DOMAIN;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
  const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET;
  const messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || process.env.FIREBASE_MESSAGING_SENDER_ID;
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID || process.env.FIREBASE_APP_ID;

  if (!projectId || projectId === "build-placeholder") {
    console.log("[bigdata] Missing Firebase credentials. Falling back to sample mode.");
    return runSampleMode();
  }

  console.log(`[bigdata] Connecting to Firestore project: ${projectId}...`);
  
  try {
    const app = initializeApp({
      apiKey,
      authDomain,
      projectId,
      storageBucket,
      messagingSenderId,
      appId,
    });

    const db = getFirestore(app);
    const sensorCollection = collection(db, "sensor_data");
    const q = query(sensorCollection, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      console.log("[bigdata] Firestore collection 'sensor_data' is empty. Using sample fallback.");
      return runSampleMode();
    }

    console.log(`[bigdata] Found ${snapshot.size} records in Firestore. Processing...`);

    const rows = snapshot.docs.map((doc) => {
      const data = doc.data();

      // Dapatkan receivedAt timestamp
      let receivedAt = Date.now();
      if (data.receivedAt) {
        receivedAt = Number(data.receivedAt);
      } else if (data.createdAt && typeof data.createdAt.toMillis === "function") {
        receivedAt = data.createdAt.toMillis();
      } else if (data.deviceTimestamp) {
        receivedAt = Number(data.deviceTimestamp);
      }

      const dateObj = new Date(receivedAt);
      
      // Ambil string format YYYY-MM-DD
      const date = dateObj.toISOString().slice(0, 10);
      
      // Ambil jam (0-23)
      const hour = dateObj.getHours();

      return {
        deviceId: data.deviceId || "unknown-device",
        receivedAt: receivedAt,
        date: date,
        hour: hour,
        temperature: typeof data.temperature === "number" ? data.temperature : 0,
        humidity: typeof data.humidity === "number" ? data.humidity : 0,
        light: typeof data.light === "number" ? data.light : 0,
        rain: typeof data.rain === "boolean" ? data.rain : false,
        status: data.status || "CLOSED",
        mode: data.mode || "AUTO",
        source: data.source || "UNKNOWN",
      };
    });

    // Urutkan berdasarkan waktu masuk terlama agar susunan log kronologis
    rows.sort((a, b) => a.receivedAt - b.receivedAt);

    await mkdir(EXPORT_DIR, { recursive: true });
    
    // Tulis ke CSV
    await writeFile(CSV_OUTPUT, toCsv(rows), "utf-8");
    
    // Tulis ke JSON
    await writeFile(JSON_OUTPUT, JSON.stringify(rows, null, 2), "utf-8");

    console.log(`[bigdata] Export completed successfully!`);
    console.log(`[bigdata] -> CSV Output: ${CSV_OUTPUT}`);
    console.log(`[bigdata] -> JSON Output: ${JSON_OUTPUT}`);

  } catch (error) {
    console.error("[bigdata] Firestore fetch failed. Falling back to sample mode.", error);
    await runSampleMode();
  }
}

runFirestoreMode().catch((error) => {
  console.error("[bigdata] Unexpected script failure:", error);
  process.exit(1);
});
