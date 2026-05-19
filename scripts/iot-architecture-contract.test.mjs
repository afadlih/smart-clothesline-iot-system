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
  const useSensorContent = read("src/hooks/useSensor.ts");
  assert.ok(useSensorContent.includes("getCommandPublishTopics"), "Expected useSensor.ts to import/use getCommandPublishTopics");
  assert.ok(!useSensorContent.includes("/api/telegram/polling"), "Expected useSensor.ts to NOT contain /api/telegram/polling");

  // Test 3: iot-hub/page.tsx contract
  const iotHubContent = read("src/app/iot-hub/page.tsx");
  assert.ok(iotHubContent.includes("getPairingDiscoveryTopics"), "Expected iot-hub/page.tsx to use getPairingDiscoveryTopics");

  // Test 4: docs/WOKWI_MQTT_COMPATIBILITY.md exists and contains the match phrase
  const docsContent = read("docs/WOKWI_MQTT_COMPATIBILITY.md");
  assert.ok(docsContent.toLowerCase().includes("device id must match"), "Expected Wokwi docs to state Device ID must match active device ID");
});

test("schedule synchronization contract validation", () => {
  // 1. ScheduleService.ts must not import COMMAND_TOPIC
  const serviceContent = read("src/services/ScheduleService.ts");
  assert.ok(!serviceContent.includes("COMMAND_TOPIC"), "ScheduleService.ts must not import or use COMMAND_TOPIC");
  
  // 2. ScheduleService.ts must not publish raw command without deviceId
  assert.ok(serviceContent.includes("publishScheduleCommand"), "ScheduleService.ts must define publishScheduleCommand");
  assert.ok(serviceContent.includes("!input.deviceId"), "ScheduleService.ts must guard against missing deviceId");

  // 3. ScheduleService.ts includes per-device schedule path under users/{uid}/devices/{deviceId}/schedules
  assert.ok(serviceContent.includes('"users", input.uid, "devices", input.deviceId, "schedules"'), "ScheduleService.ts must use per-device schedules path");

  // 4. useSensor.ts uses getCommandPublishTopics for schedule-driven commands
  const useSensorContent = read("src/hooks/useSensor.ts");
  const runtimeContent = read("src/services/ScheduleRuntimeService.ts");
  assert.ok(
    useSensorContent.includes("getCommandPublishTopics(activeDeviceId)"),
    "Expected active device getCommandPublishTopics in schedule commands routing in useSensor.ts"
  );

  // 5. Schedule page does not directly call setSystemOverride(true) / setSystemOverride(false) on time transition
  const screenContent = read("src/features/schedule/screen.tsx");
  const screenLines = screenContent.split("\n");
  const hasTransitionOverrideCall = screenLines.some(line => 
    (line.includes("setSystemOverride(true)") || line.includes("setSystemOverride(false)")) && 
    !line.includes("static")
  );
  assert.ok(!hasTransitionOverrideCall, "Schedule page must not directly call setSystemOverride on transition");

  // 6. Schedule runtime includes transition dedupe so it does not publish every second
  assert.ok(
    runtimeContent.includes("lastPublishedScheduleState === currentScheduleState") || 
    useSensorContent.includes("lastPublishedScheduleState"),
    "Schedule runtime must implement transition dedupe"
  );

  // 7. Schedule UI copy does not include "Temporal Engine", "Synchronizing Sequence", "Provisioning", "Commence", or "Conclude"
  const slopWords = ["Temporal Engine", "Synchronizing Sequence", "Provisioning", "Commence", "Conclude"];
  for (const word of slopWords) {
    assert.ok(!screenContent.includes(word), `Schedule UI must not contain AI-slop copy: ${word}`);
  }
});
