import assert from "node:assert/strict";
import { test, mock } from "node:test";
import { TelegramWebhookHealth } from "../src/services/telegram/TelegramWebhookHealth";
import { TelegramEnvConfigService } from "../src/services/telegram/TelegramEnvConfigService";
import { TelegramBotApiService } from "../src/services/TelegramBotApiService";

test("TelegramWebhookHealth - unconfigured bot token", async (t) => {
  const getBotTokenMock = mock.method(TelegramEnvConfigService, "getBotToken", () => "");

  t.after(() => {
    getBotTokenMock.mock.restore();
  });

  const health = await TelegramWebhookHealth.check();
  assert.ok(!health.healthy);
  assert.equal(health.status, "Disconnected");
  assert.equal(health.mismatchReason, "Bot token is not configured");
});

test("TelegramWebhookHealth - missing webhook", async (t) => {
  const getBotTokenMock = mock.method(TelegramEnvConfigService, "getBotToken", () => "valid-token");
  const getWebhookInfoMock = mock.method(TelegramBotApiService, "getWebhookInfo", async () => {
    return { ok: true, result: { url: "" } };
  });

  t.after(() => {
    getBotTokenMock.mock.restore();
    getWebhookInfoMock.mock.restore();
  });

  const health = await TelegramWebhookHealth.check();
  assert.ok(!health.healthy);
  assert.equal(health.status, "Webhook Not Registered");
});

test("TelegramWebhookHealth - webhook URL mismatch", async (t) => {
  const getBotTokenMock = mock.method(TelegramEnvConfigService, "getBotToken", () => "valid-token");
  const getWebhookInfoMock = mock.method(TelegramBotApiService, "getWebhookInfo", async () => {
    return { ok: true, result: { url: "https://some-other-domain/api/telegram/webhook" } };
  });

  t.after(() => {
    getBotTokenMock.mock.restore();
    getWebhookInfoMock.mock.restore();
  });

  const health = await TelegramWebhookHealth.check();
  assert.ok(!health.healthy);
  assert.equal(health.status, "Webhook Mismatch");
});
