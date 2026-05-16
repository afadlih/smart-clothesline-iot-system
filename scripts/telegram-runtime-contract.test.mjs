import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("IoT Hub persists the selected paired device as the Telegram command target", () => {
  const iotHub = read("src/app/iot-hub/page.tsx");
  const userDeviceService = read("src/services/UserDeviceService.ts");

  assert.match(iotHub, /setActiveCommandDevice/);
  assert.match(iotHub, /handleSelectDevice/);
  assert.match(userDeviceService, /system_settings/);
  assert.match(userDeviceService, /active_device/);
  assert.match(userDeviceService, /selectedByUid/);
});

test("Pairing a device primes telemetry startup before stream subscription", () => {
  const pairing = read("src/features/settings/PairingDeviceSettings.tsx");

  assert.match(pairing, /ACTIVE_DEVICE_STORAGE_KEY/);
  assert.match(pairing, /smart-clothesline-active-device-id-v1/);
  assert.match(pairing, /localStorage\.setItem\(ACTIVE_DEVICE_STORAGE_KEY, deviceId\)/);
  assert.match(pairing, /smart-clothesline-active-device-changed/);
  assert.match(pairing, /window\.location\.reload\(\)/);
});

test("Dashboard stream subscribes to selected per-device telemetry topics", () => {
  const source = read("src/hooks/useSensor.ts");

  assert.match(source, /getActiveDeviceId/);
  assert.match(source, /getDeviceSensorTopic\(activeDeviceId\)/);
  assert.match(source, /getDeviceStatusTopic\(activeDeviceId\)/);
  assert.match(source, /getDeviceConfigAckTopic\(activeDeviceId\)/);
  assert.match(source, /mqttService\.subscribeTopic\(sensorTopic, handleTopicMessage\)/);
  assert.match(source, /mqttService\.subscribeTopic\(statusTopic, handleTopicMessage\)/);
});

test("server-side Telegram commands have resilient target resolution", () => {
  const source = read("src/services/mqtt/TelegramMqttCommandPublisher.ts");

  assert.match(source, /iot-hub-active-device/);
  assert.match(source, /env-fallback/);
  assert.match(source, /legacy-global-fallback/);
  assert.match(source, /smart-clothesline\/command/);
  assert.match(source, /smart-clothesline\/\$\{targetDeviceId\}\/command/);
  assert.match(source, /deviceId: target\.deviceId/);
  assert.match(source, /command/);
});

test("Telegram executor uses resilient direct MQTT before queue fallback", () => {
  const source = read("src/services/telegram/TelegramCommandExecutor.ts");

  assert.match(source, /publishTelegramDeviceCommand/);
  assert.match(source, /isTelegramMqttCommandPublisherConfigured/);
  assert.match(source, /recordCommandResult/);
  assert.match(source, /enqueueCommand/);
});

test("Telegram webhook path audits received and processed commands", () => {
  const source = read("src/app/api/telegram/webhook/route.ts");
  assert.match(source, /webhook_received/);
  assert.match(source, /command_processed/);
  assert.match(source, /x-telegram-bot-api-secret-token/);
});

test("Telegram webhook registration requests message updates", () => {
  const source = read("src/services/TelegramBotApiService.ts");
  assert.match(source, /allowed_updates/);
  assert.match(source, /\["message"\]/);
});

test("Deploy build auto-syncs Telegram webhook directly through Telegram API", () => {
  const pkg = read("package.json");
  const source = read("scripts/sync-telegram-webhook.mjs");

  assert.match(pkg, /telegram:sync-webhook:auto/);
  assert.match(pkg, /next build && npm run telegram:sync-webhook:auto/);
  assert.match(source, /api\.telegram\.org\/bot\$\{token\}\/\$\{method\}/);
  assert.match(source, /setWebhook/);
  assert.match(source, /getWebhookInfo/);
  assert.match(source, /VERCEL_URL/);
  assert.match(source, /TELEGRAM_WEBHOOK_URL/);
  assert.match(source, /TELEGRAM_WEBHOOK_BASE_URL/);
});

test("Telegram webhook sync exposes delivery errors from Telegram", () => {
  const source = read("src/services/telegram/TelegramWebhookSyncService.ts");
  assert.match(source, /telegramPendingUpdateCount/);
  assert.match(source, /telegramLastErrorMessage/);
  assert.match(source, /telegramWebhookInfo/);
  assert.match(source, /Telegram delivery error/);
});

test("Telegram diagnostics expose command readiness and fallback mode", () => {
  const source = read("src/app/api/telegram/diagnostics/route.ts");
  assert.match(source, /outboundTelegramCanWork/);
  assert.match(source, /inboundCommandsCanWork/);
  assert.match(source, /directMqttConfigured/);
  assert.match(source, /telegramCommandMode/);
  assert.match(source, /webhookUrlMatch/);
  assert.match(source, /directMqttTargetDeviceId/);
  assert.match(source, /directMqttLegacyFallback/);
  assert.match(source, /legacy smart-clothesline\/command fallback/);
});

test("Telegram notification endpoint is server-side and requires bot token plus chat target", () => {
  const source = read("src/app/api/telegram/notify/route.ts");
  assert.match(source, /getBotToken/);
  assert.match(source, /getDefaultChatId/);
  assert.match(source, /sendMessage/);
  assert.match(source, /cooldown/);
});

test("Dashboard bridge reports command result back to Telegram", () => {
  const source = read("src/hooks/useSensor.ts");
  assert.match(source, /api\/telegram\/command-result/);
  assert.match(source, /processPendingTelegramCommands/);
  assert.match(source, /markCommandStatus/);
  assert.match(source, /sendCommand\("MANUAL"\)/);
  assert.match(source, /sendCommand\("RESTART"\)/);
});
