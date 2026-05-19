import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const ROOT = process.cwd();

function read(rel) {
  const file = join(ROOT, rel);
  assert.ok(existsSync(file), `Missing file: ${rel}`);
  return readFileSync(file, "utf-8");
}

test("operational resolver contract exists", () => {
  const content = read("src/services/OperationalStateResolver.ts");
  const required = [
    "SAFE_EXTENDED",
    "RETRACTED",
    "MOVING",
    "RAIN_RETRACTING",
    "OFFLINE",
    "STALE",
    "FAULT",
    "UNKNOWN",
    "resolveOperationalState",
  ];
  for (const token of required) {
    assert.ok(content.includes(token), `Missing token: ${token}`);
  }
});

test("telemetry normalizer alias coverage exists", () => {
  const content = read("src/services/TelemetryNormalizerService.ts");
  const aliases = [
    "device_id",
    "temp",
    "hum",
    "lightValue",
    "ldr",
    "rainDetected",
    "isRaining",
    "clotheslineStatus",
    "operationMode",
    "stateSource",
  ];
  for (const alias of aliases) {
    assert.ok(content.includes(alias), `Missing alias handling: ${alias}`);
  }
});

test("big-data page does not depend on hadoop runtime", () => {
  const content = read("src/app/big-data/page.tsx");
  assert.ok(!content.includes("hdfs"));
  assert.ok(!content.includes("child_process"));
});

test("design states telegram notification-only", () => {
  const designPath = existsSync(join(ROOT, "docs/DESIGN.md")) ? "docs/DESIGN.md" : "docs/design.md";
  const content = read(designPath);
  assert.ok(content.includes("Telegram role: notification-only."));
  assert.ok(content.includes("Dashboard is the only application-level control surface."));
});
