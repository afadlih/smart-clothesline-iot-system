import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const inputPath = process.argv[2];
const outputPath = process.argv[3] ?? path.resolve(process.cwd(), "public/bigdata-reports/daily-summary.generated.json");

if (!inputPath) {
  console.error("Usage: node scripts/bigdata/convert-mapreduce-output-to-json.mjs <input-file> [output-file]");
  process.exit(1);
}

function parseLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return null;
  const [keyPart, valuePart] = trimmed.split(/\s+/);
  if (!keyPart || !valuePart) return null;

  const [date, deviceId] = keyPart.split(",");
  const [totalRecords, avgTemperature, avgHumidity, avgLight, rainCount, openCount, closedCount] = valuePart
    .split(",")
    .map((v) => Number(v));

  return {
    date,
    deviceId,
    totalRecords,
    avgTemperature,
    avgHumidity,
    avgLight,
    rainCount,
    openCount,
    closedCount,
  };
}

const text = await readFile(path.resolve(process.cwd(), inputPath), "utf-8");
const parsed = text
  .split(/\r?\n/)
  .map(parseLine)
  .filter(Boolean);

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(parsed, null, 2)}\n`, "utf-8");

console.log(`[bigdata] Converted ${parsed.length} rows -> ${outputPath}`);
