import assert from "node:assert/strict";
import { test, mock } from "node:test";

import { TelegramNotificationService, TelegramDeliveryLogService } from "../src/services/telegram/TelegramNotificationService";
import { TelegramBotApiService } from "../src/services/TelegramBotApiService";

// Track states and operations
const loggedOperations: string[] = [];
const loggedStatuses: string[] = [];

mock.method(TelegramDeliveryLogService, "createPendingLog", async (deliveryId: string, message: string, type: string, chatId: string) => {
  loggedOperations.push("create");
  loggedStatuses.push("PENDING");
});
mock.method(TelegramDeliveryLogService, "updateSuccessLog", async (deliveryId: string, telegramMessageId: number | null) => {
  loggedOperations.push("update");
  loggedStatuses.push("SUCCESS");
});
mock.method(TelegramDeliveryLogService, "updateFailedLog", async (deliveryId: string, error: string) => {
  loggedOperations.push("update");
  loggedStatuses.push("FAILED");
});

test("Telegram Delivery Logging - check sequence of operations", async (t) => {
  const sendMessageMock = mock.method(TelegramBotApiService, "sendMessageWithResult", async () => {
    return { ok: true, result: { message_id: 1111 } };
  });

  t.after(() => {
    sendMessageMock.mock.restore();
  });

  loggedOperations.length = 0;
  loggedStatuses.length = 0;

  const result = await TelegramNotificationService.sendRawNotification({
    message: "Logging test message",
    chatId: "12345678",
    notificationType: "RAIN_ALERT",
  });

  assert.ok(result.ok);
  assert.deepEqual(loggedOperations, ["create", "update"]);
  assert.deepEqual(loggedStatuses, ["PENDING", "SUCCESS"]);
});
