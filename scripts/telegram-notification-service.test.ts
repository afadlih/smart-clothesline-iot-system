import assert from "node:assert/strict";
import { test, mock } from "node:test";

import { TelegramNotificationService, TelegramDeliveryLogService } from "../src/services/telegram/TelegramNotificationService";
import { TelegramBotApiService } from "../src/services/TelegramBotApiService";

// Mock TelegramDeliveryLogService methods
mock.method(TelegramDeliveryLogService, "createPendingLog", async () => {});
mock.method(TelegramDeliveryLogService, "updateSuccessLog", async () => {});
mock.method(TelegramDeliveryLogService, "updateFailedLog", async () => {});

test("TelegramNotificationService - success send", async (t) => {
  const sendMessageMock = mock.method(TelegramBotApiService, "sendMessageWithResult", async () => {
    return { ok: true, result: { message_id: 9999 } };
  });

  t.after(() => {
    sendMessageMock.mock.restore();
  });

  const result = await TelegramNotificationService.sendRawNotification({
    message: "Success test message",
    chatId: "12345678",
    notificationType: "TEST",
  });

  assert.ok(result.ok);
  assert.equal(result.sentCount, 1);
  assert.equal(sendMessageMock.mock.callCount(), 1);
});

test("TelegramNotificationService - failed send and retry", async (t) => {
  let attempts = 0;
  const sendMessageMock = mock.method(TelegramBotApiService, "sendMessageWithResult", async () => {
    attempts++;
    // Return retriable error (HTTP 500)
    return { ok: false, description: "Server Error", errorCode: 500 };
  });

  t.after(() => {
    sendMessageMock.mock.restore();
  });

  const result = await TelegramNotificationService.sendRawNotification({
    message: "Failed test message",
    chatId: "12345678",
    notificationType: "TEST",
  });

  assert.ok(!result.ok);
  assert.equal(result.sentCount, 0);
  // Initial attempt + 3 retries = 4 total attempts
  assert.equal(attempts, 4);
});
