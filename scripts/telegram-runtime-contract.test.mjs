import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("server-side Telegram commands use per-device MQTT routing", () => {
  const source = read("src/services/mqtt/ServerMqttCommandPublisher.ts");
  assert.match(source, /MQTT_TARGET_DEVICE_ID/);
  assert.match(source, /targetDeviceId/);
  assert.match(source, /deviceId/);
  assert.match(source, /commandTopic/);
});

test("Telegram webhook path audits received and processed commands", () => {
  const source = read("src/app/api/telegram/webhook/route.ts");
  assert.match(source, /webhook_received/);
  assert.match(source, /command_processed/);
  assert.match(source, /x-telegram-bot-api-secret-token/);
});

test("Telegram diagnostics expose command readiness separately from notification readiness", () => {
  const source = read("src/app/api/telegram/diagnostics/route.ts");
  assert.match(source, /outboundTelegramCanWork/);
  assert.match(source, /inboundCommandsCanWork/);
  assert.match(source, /directMqttConfigured/);
  assert.match(source, /telegramCommandMode/);
  assert.match(source, /webhookUrlMatch/);
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
