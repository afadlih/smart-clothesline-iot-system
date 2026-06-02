import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const EXPORT_DIR = path.resolve(process.cwd(), "exports");
const SAMPLE_OUTPUT = path.join(EXPORT_DIR, `sensor_${new Date().toISOString().slice(0, 10)}.csv`);

function toCsv(rows) {
  const header = ["timestamp", "deviceId", "temperature", "humidity", "light", "rain", "status", "mode", "source"];
  const lines = [header.join(",")];
  for (const row of rows) {
    lines.push([
      row.timestamp,
      row.deviceId,
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

async function runSampleMode() {
  const samplePath = path.resolve(process.cwd(), "data/sample/sensor_sample.csv");
  const sample = await readFile(samplePath, "utf-8");
  await mkdir(EXPORT_DIR, { recursive: true });
  await writeFile(SAMPLE_OUTPUT, sample, "utf-8");
  console.log(`[bigdata] Sample export written: ${SAMPLE_OUTPUT}`);
}

async function runFirestoreMode() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    console.log("[bigdata] Firebase Admin env vars are missing. Falling back to sample mode.");
    console.log("[bigdata] Required vars: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY");
    return runSampleMode();
  }

  console.log("[bigdata] TODO: Implement Firebase Admin query for sensor_data export.");
  console.log("[bigdata] Using scaffold mode to avoid requiring credentials in normal development.");

  const rows = [
    {
      timestamp: Date.now(),
      deviceId: "ESP32-01",
      temperature: 30.4,
      humidity: 72.8,
      light: 6200,
      rain: true,
      status: "CLOSED",
      mode: "AUTO",
      source: "mqtt",
    },
  ];

  await mkdir(EXPORT_DIR, { recursive: true });
  await writeFile(SAMPLE_OUTPUT, toCsv(rows), "utf-8");
  console.log(`[bigdata] Scaffold export written: ${SAMPLE_OUTPUT}`);
}

runFirestoreMode().catch((error) => {
  console.error("[bigdata] export failed", error);
  process.exit(1);
});
