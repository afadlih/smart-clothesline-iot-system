import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const ROOT = process.cwd();

function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = readdirSync(dirPath);

  files.forEach((file) => {
    if (statSync(join(dirPath, file)).isDirectory()) {
      if (file !== "node_modules" && file !== ".next" && file !== ".git") {
        arrayOfFiles = getAllFiles(join(dirPath, file), arrayOfFiles);
      }
    } else {
      arrayOfFiles.push(join(dirPath, file));
    }
  });

  return arrayOfFiles;
}

test("1. Webhook is notification-only", () => {
  const path = join(ROOT, "src/app/api/telegram/webhook/route.ts");
  if (!existsSync(path)) return; // Skip if file not found

  const content = readFileSync(path, "utf-8");

  assert.ok(!content.includes("TelegramCommandRouter"), "Should not import TelegramCommandRouter");
  assert.ok(!content.includes("TelegramCommandExecutor"), "Should not import TelegramCommandExecutor");
  assert.ok(!content.includes("executeTelegramCommand"), "Should not call executeTelegramCommand");
  assert.ok(!content.includes("enqueueCommand"), "Should not call enqueueCommand");
  assert.ok(!content.includes("publishDeviceCommand"), "Should not call publishDeviceCommand");
  assert.ok(
    content.includes("notification-only") || content.includes("not processing incoming commands"),
    "Should contain notification-only acknowledgement text"
  );
  assert.ok(
    content.includes("x-telegram-bot-api-secret-token") || content.includes("getWebhookSecret"),
    "Should validate webhook secret"
  );
});

test("2. Removed command executor/router are not used", () => {
  const forbidden = [
    "TelegramCommandRouter",
    "TelegramCommandExecutor",
    "executeTelegramCommand",
    "buildCommandReplyMessage",
    "ExecutorCommand",
  ];

  const srcFiles = getAllFiles(join(ROOT, "src"));

  for (const file of srcFiles) {
    // Skip the test file itself if it's in src
    if (file.includes("telegram-notification-only.test.mjs")) continue;

    const content = readFileSync(file, "utf-8");
    for (const term of forbidden) {
      assert.ok(
        !content.includes(term),
        `File ${file} contains forbidden term: ${term}`
      );
    }
  }
});

test("3. useSensor.ts has no Telegram bridge fallback", () => {
  const path = join(ROOT, "src/hooks/useSensor.ts");
  if (!existsSync(path)) return;

  const content = readFileSync(path, "utf-8");
  const forbidden = [
    "processPendingTelegramCommands",
    "notifyCommandResult",
    "updateBridgeHeartbeat",
    "telegramBridgeTimer",
    "telegramBridgeHeartbeatTimer",
    "fetchPendingCommands",
    "markCommandStatus",
    "/api/telegram/command-result",
    "telegram_bridge",
    "Dashboard bridge",
  ];

  for (const term of forbidden) {
    assert.ok(
      !content.includes(term),
      `useSensor.ts contains forbidden bridge term: ${term}`
    );
  }

  // Ensure dashboard controls remain
  assert.ok(content.includes("sendCommand"), "Should preserve sendCommand for dashboard");
});

test("4. Diagnostics is notification-only", () => {
  const path = join(ROOT, "src/app/api/telegram/diagnostics/route.ts");
  if (!existsSync(path)) return;

  const content = readFileSync(path, "utf-8");

  const required = [
    "telegramMode",
    "notification-only",
    "outboundNotificationsCanWork",
    "botConfigured",
    "defaultChatConfigured",
  ];

  for (const term of required) {
    assert.ok(content.includes(term), `Diagnostics missing required term: ${term}`);
  }

  const forbidden = [
    "inboundCommandsCanWork",
    "commandReceivePath",
    "telegramCommandMode",
    "pendingCommandsCount",
    "directMqttConfigured",
    "directMqttCommandTopic",
    "directMqttTargetDeviceConfigured",
    "bridgeActive",
    "bridgeAlive",
    "bridgeQueueBacklog",
    "commands:",
  ];

  for (const term of forbidden) {
    assert.ok(!content.includes(term), `Diagnostics contains forbidden term: ${term}`);
  }
});

test("5. Notify route delegates to notification service", () => {
  const routePath = join(ROOT, "src/app/api/telegram/notify/route.ts");
  const servicePath = join(ROOT, "src/services/telegram/TelegramNotificationService.ts");

  if (existsSync(routePath)) {
    const routeContent = readFileSync(routePath, "utf-8");
    assert.ok(routeContent.includes("TelegramNotificationService"), "Route should import TelegramNotificationService");
    assert.ok(routeContent.includes("sendNotification"), "Route should call sendNotification");
  }

  if (existsSync(servicePath)) {
    const serviceContent = readFileSync(servicePath, "utf-8");
    assert.ok(serviceContent.includes("TelegramNotificationSeverity"), "Service should define TelegramNotificationSeverity");
    assert.ok(serviceContent.includes("TelegramNotificationInput"), "Service should define TelegramNotificationInput");
    assert.ok(serviceContent.includes("TelegramNotificationResult"), "Service should define TelegramNotificationResult");
    assert.ok(serviceContent.includes("TelegramBotApiService.sendMessage"), "Service should call TelegramBotApiService.sendMessage");

    const telemetryFields = [
      "Device:",
      "Mode:",
      "Rain:",
      "Temperature:",
      "Humidity:",
      "Light:",
      "Telemetry Delay:",
    ];

    for (const field of telemetryFields) {
      assert.ok(serviceContent.includes(field), `Service missing telemetry field: ${field}`);
    }
  }
});

test("6. TelegramOpsService has no command queue", () => {
  const path = join(ROOT, "src/services/TelegramOpsService.ts");
  if (!existsSync(path)) return;

  const content = readFileSync(path, "utf-8");
  const forbidden = [
    "TelegramCommandJob",
    "TELEGRAM_COMMAND_COLLECTION",
    "enqueueCommand",
    "fetchPendingCommands",
    "expireStalePendingCommands",
    "inspectStalePendingCommands",
    "markCommandStatus",
    "recordCommandResult",
    "cleanupAllPending",
    "directDispatchAt",
    "directDispatchResult",
    "dispatchMode",
  ];

  for (const term of forbidden) {
    assert.ok(!content.includes(term), `TelegramOpsService contains forbidden queue term: ${term}`);
  }

  const allowed = ["getConfig", "saveConfig", "addAuditLog", "getRecentAuditLogs"];
  for (const term of allowed) {
    assert.ok(content.includes(term), `TelegramOpsService should still contain: ${term}`);
  }
});

test("7. Deprecated command routes are gone or HTTP 410", () => {
  const routes = [
    "src/app/api/telegram/command-result/route.ts",
    "src/app/api/telegram/commands/cleanup/route.ts",
  ];

  for (const route of routes) {
    const fullPath = join(ROOT, route);
    if (!existsSync(fullPath)) continue;

    const content = readFileSync(fullPath, "utf-8");
    assert.ok(content.includes("410"), `Route ${route} should return status 410`);
    assert.ok(
      content.includes("notification-only") || content.includes("removed"),
      `Route ${route} missing removal explanation`
    );

    const forbidden = [
      "TelegramCommandExecutor",
      "TelegramCommandRouter",
      "TelegramOpsService.fetchPendingCommands",
      "TelegramOpsService.markCommandStatus",
    ];

    for (const term of forbidden) {
      assert.ok(!content.includes(term), `Deprecated route ${route} should not import ${term}`);
    }
  }
});

test("8. Docs do not advertise Telegram hardware commands", () => {
  const filesToScan = [
    join(ROOT, "README.md"),
    join(ROOT, "DEPLOYMENT.md"),
    join(ROOT, "DEVELOPMENT.md"),
    join(ROOT, ".env.example"),
    join(ROOT, ".env.local.example"),
    ...getAllFiles(join(ROOT, "docs")),
  ];

  const forbiddenCommands = [
    "/open",
    "/close",
    "/mode_auto",
    "/mode_manual",
    "/restart",
    "/override",
    "/debug",
  ];

  for (const file of filesToScan) {
    if (!existsSync(file)) continue;
    const content = readFileSync(file, "utf-8");

    // We only care if these are advertised as Telegram commands.
    // We check for "Telegram" and the command in the same vicinity or just the command if it's a doc.
    for (const cmd of forbiddenCommands) {
      if (content.includes(cmd)) {
        const lower = content.toLowerCase();
        // Heuristic for advertising: mentions "Telegram" and the command, 
        // BUT not in the context of "removed", "no longer", "disabled", "deprecated", "delete".
        if (lower.includes("telegram") && lower.includes(cmd)) {
           const context = [
             "removed", "no longer", "disabled", "deprecated", 
             "delete", "ignore", "transitioned", "unsupported",
             "historically", "formerly", "legacy"
           ];
           const isRemovedContext = context.some(c => lower.includes(c));
           
           if (!isRemovedContext) {
             assert.fail(`File ${file} might be advertising forbidden Telegram command: ${cmd}`);
           }
        }
      }
    }
  }
});

test("Test A: Notification service supports richer contract", () => {
  const path = join(ROOT, "src/services/telegram/TelegramNotificationService.ts");
  assert.ok(existsSync(path), "TelegramNotificationService.ts should exist");
  const content = readFileSync(path, "utf-8");

  const terms = [
    "TelegramNotificationType",
    "recommendedAction",
    "dashboardPath",
    "metadata",
    "rain_detected",
    "device_offline",
    "telemetry_stale",
    "dry_candidate",
    "hadoop_batch_report",
    "buildDashboardUrl",
    "inferRecommendedAction"
  ];

  for (const term of terms) {
    assert.ok(content.includes(term), `Service should contain: ${term}`);
  }
});

test("Test B: Notification messages must not suggest Telegram commands", () => {
  const path = join(ROOT, "src/services/telegram/TelegramNotificationService.ts");
  assert.ok(existsSync(path), "TelegramNotificationService.ts should exist");
  const content = readFileSync(path, "utf-8");

  const forbidden = [
    "Send /open",
    "Send /close",
    "Use /open",
    "Use /close",
    "Control from Telegram",
    "Telegram command"
  ];

  for (const term of forbidden) {
    assert.ok(!content.includes(term), `Service should not suggest command-like term: ${term}`);
  }
});

test("Test C: Notify route preserves skipped ok", () => {
  const path = join(ROOT, "src/app/api/telegram/notify/route.ts");
  assert.ok(existsSync(path), "route.ts should exist");
  const content = readFileSync(path, "utf-8");

  const terms = [
    "ok: result.ok",
    "skipped: true",
    "sentCount",
    "targetsCount"
  ];

  for (const term of terms) {
    assert.ok(content.includes(term), `Route should contain: ${term}`);
  }
});

test("Test D: Bot API supports send options", () => {
  const path = join(ROOT, "src/services/TelegramBotApiService.ts");
  assert.ok(existsSync(path), "TelegramBotApiService.ts should exist");
  const content = readFileSync(path, "utf-8");

  const terms = [
    "disableWebPagePreview",
    "disable_web_page_preview",
    "SendMessageOptions"
  ];

  for (const term of terms) {
    assert.ok(content.includes(term), `Bot API should contain: ${term}`);
  }
});

test("Test E: Docs include notification examples", () => {
  const path = join(ROOT, "docs/TELEGRAM_NOTIFICATION_ONLY.md");
  assert.ok(existsSync(path), "TELEGRAM_NOTIFICATION_ONLY.md should exist");
  const content = readFileSync(path, "utf-8");

  const terms = [
    "rain_detected",
    "device_offline",
    "hadoop_batch_report",
    "Recommended dashboard action",
    "Telegram never accepts hardware control commands"
  ];

  for (const term of terms) {
    assert.ok(content.includes(term), `Docs should contain: ${term}`);
  }
});
