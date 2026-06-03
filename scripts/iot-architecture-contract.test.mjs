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
  const content = read(designPath).toLowerCase();
  assert.ok(content.includes("telegram role: notification-only"));
  assert.ok(content.includes("dashboard is the only application-level control surface"));
});

test("user device firestore payload sanitizes undefined fields", () => {
  const content = read("src/services/UserDeviceService.ts");
  assert.ok(content.includes("removeUndefinedFields"), "Expected removeUndefinedFields helper");
  assert.ok(
    !content.includes("setDoc(userDeviceDoc(uid, device.deviceId), device, { merge: true })"),
    "Unsafe raw device setDoc call should not exist",
  );
  assert.ok(
    content.includes("setDoc(userDeviceDoc(uid, device.deviceId), payload, { merge: true})")
      || content.includes("setDoc(userDeviceDoc(uid, device.deviceId), payload, { merge: true })"),
    "pairUserDevice should write sanitized payload",
  );
});

test("Wokwi per-device MQTT hotfix contract validation", () => {
  // Test 1: mqttTopics.ts exports WOKWI_DEFAULT_DEVICE_ID and has functions
  const mqttTopicsContent = read("src/services/mqttTopics.ts");
  assert.ok(mqttTopicsContent.includes("WOKWI_DEFAULT_DEVICE_ID"), "Expected WOKWI_DEFAULT_DEVICE_ID in mqttTopics.ts");
  assert.ok(mqttTopicsContent.includes("LEGACY_TOPICS.sensor"), "Expected getDeviceTelemetryTopics to include LEGACY_TOPICS.sensor");
  assert.ok(mqttTopicsContent.includes("LEGACY_TOPICS.status"), "Expected getDeviceStatusTopics to include LEGACY_TOPICS.status");
  assert.ok(mqttTopicsContent.includes("getPairingDiscoveryTopics"), "Expected getPairingDiscoveryTopics to exist in mqttTopics.ts");
  assert.ok(mqttTopicsContent.includes("getCommandPublishTopics"), "Expected getCommandPublishTopics to exist in mqttTopics.ts");

  // Test 2: useSensor.ts contract
  const useSensorContent = read("src/features/sensor/hooks/useSensor.ts");
  assert.ok(useSensorContent.includes("getCommandPublishTopics"), "Expected useSensor.ts to import/use getCommandPublishTopics");
  assert.ok(!useSensorContent.includes("/api/telegram/polling"), "Expected useSensor.ts to NOT contain /api/telegram/polling");

  // Test 3: iot-hub page contract (checks IoTHubPage.tsx if modularized, else page.tsx)
  const iotHubContent = existsSync(join(ROOT, "src/features/sensor/view/iothub/IoTHubPage.tsx"))
    ? read("src/features/sensor/view/iothub/IoTHubPage.tsx")
    : read("src/app/iot-hub/page.tsx");
  assert.ok(iotHubContent.includes("getPairingDiscoveryTopics"), "Expected IoT Hub page to use getPairingDiscoveryTopics");

  // Test 4: docs/WOKWI_MQTT_COMPATIBILITY.md exists and contains the match phrase
  const docsContent = read("docs/WOKWI_MQTT_COMPATIBILITY.md");
  assert.ok(docsContent.toLowerCase().includes("device id must match"), "Expected Wokwi docs to state Device ID must match active device ID");
});

test("schedule synchronization contract validation", () => {
  // 1. ScheduleService.ts must not import COMMAND_TOPIC
  const serviceContent = read("src/services/ScheduleService.ts");
  assert.ok(!serviceContent.includes("COMMAND_TOPIC"), "ScheduleService.ts must not import or use COMMAND_TOPIC");
  
  // 2. ScheduleService.ts must not call mqttService.publish(COMMAND_TOPIC
  assert.ok(!serviceContent.includes("mqttService.publish(COMMAND_TOPIC"), "ScheduleService.ts must not publish to global COMMAND_TOPIC");

  // 3. ScheduleService.ts includes per-device schedule path under users/{uid}/devices/{deviceId}/schedules
  assert.ok(
    serviceContent.includes('"users", uid, "devices", deviceId, "schedules"') ||
    serviceContent.includes('"users", input.uid, "devices", input.deviceId, "schedules"'),
    "ScheduleService.ts must use per-device schedules path"
  );

  // 4. ScheduleRuntimeService.ts exists and exports evaluateScheduleTransition
  const runtimeContent = read("src/services/ScheduleRuntimeService.ts");
  assert.ok(runtimeContent.includes("export function evaluateScheduleTransition"), "ScheduleRuntimeService.ts must export evaluateScheduleTransition");

  // 5. useSensor.ts uses getCommandPublishTopics for schedule commands
  const useSensorContent = read("src/features/sensor/hooks/useSensor.ts");
  assert.ok(
    useSensorContent.includes("getCommandPublishTopics(activeDeviceId)"),
    "Expected active device getCommandPublishTopics in schedule commands routing in useSensor.ts"
  );

  // 6. src/features/schedule/screen.tsx does not call ScheduleService.setSystemOverride
  const screenContent = read("src/features/schedule/screen.tsx");
  assert.ok(!screenContent.includes("setSystemOverride("), "Schedule screen must not call setSystemOverride directly");

  // 7. Schedule UI copy does not include those slop words
  const slopWords = [
    "Temporal Engine",
    "Synchronizing Sequence",
    "Provisioning",
    "Commence",
    "Conclude",
    "Commit Schedule",
    "Operational Queue"
  ];
  for (const word of slopWords) {
    assert.ok(!screenContent.includes(word), `Schedule UI must not contain AI-slop copy: ${word}`);
  }

  // 8. firestore.rules validation
  const rulesContent = read("firestore.rules");
  assert.ok(rulesContent.includes("users/{userId}/devices/{deviceId}/schedules/{scheduleId}"), "firestore.rules must contain the per-device schedules path match");
  assert.ok(rulesContent.includes("match /telegram_commands/{docId}"), "firestore.rules must match telegram_commands path");
  // Ensure telegram_commands blocks reads/writes
  const commandLines = rulesContent.split("\n");
  const tgCommandIndex = commandLines.findIndex(line => line.includes("match /telegram_commands/{docId}"));
  assert.ok(tgCommandIndex !== -1, "telegram_commands path not found in firestore.rules");
  assert.ok(commandLines[tgCommandIndex + 1].includes("allow read, write: if false;"), "telegram_commands must block all reads and writes");
});
test("landing page contract validation", () => {
  const content = read("src/app/page.tsx");
  
  // 1. src/app/page.tsx existence is verified by read() above.
  
  // 2. Landing page does not import forbidden imports
  const forbidden = [
    "useSensor",
    "mqttService",
    "FirestoreService",
    "useAnalyticsData",
    "firebase",
    "recharts",
    "fs",
    "path",
    "child_process"
  ];
  for (const item of forbidden) {
    assert.ok(!content.includes(item), `Landing page should not import or refer to: ${item}`);
  }

  // 3. Landing page does not contain useEffect
  assert.ok(!content.includes("useEffect"), "Landing page should not contain useEffect");

  // 4. Landing page does not contain localStorage
  assert.ok(!content.includes("localStorage"), "Landing page should not contain localStorage");

  // 5. Landing page contains links to required routes
  const requiredRoutes = [
    "/dashboard",
    "/analytics",
    "/big-data",
    "/iot-hub"
  ];
  for (const route of requiredRoutes) {
    assert.ok(content.includes(route), `Landing page should link to: ${route}`);
  }

  // 6. Landing page mentions key product concepts
  const mentions = [
    "Smart Clothesline",
    "rain detection",
    "dashboard",
    "Telegram notifications",
    "analytics"
  ];
  for (const item of mentions) {
    assert.ok(content.toLowerCase().includes(item.toLowerCase()), `Landing page should mention: ${item}`);
  }
  assert.ok(
    content.toLowerCase().includes("hadoop") || content.toLowerCase().includes("big data"),
    "Landing page should mention Hadoop or Big Data"
  );

  // 7. Landing page does not contain AI-slop words
  const slop = [
    "revolutionary",
    "AI-powered",
    "autonomous intelligence",
    "temporal engine",
    "synergy"
  ];
  for (const word of slop) {
    assert.ok(!content.toLowerCase().includes(word.toLowerCase()), `Landing page contains AI-slop: ${word}`);
  }

  // 8. Landing page has accessible text for primary CTA
  assert.ok(content.includes("Open Dashboard"), "Landing page should have accessible primary CTA 'Open Dashboard'");
});
