# Telegram Command and Notification Audit

This document captures the production contract for Telegram command, notification, and audit behavior after the backend/runtime update on `develop`.

## Runtime Contract

### Inbound command path

```txt
Telegram user
-> Telegram Bot API webhook
-> /api/telegram/webhook
-> TelegramCommandRouter
-> TelegramCommandExecutor
-> ServerMqttCommandPublisher
-> MQTT command topic
-> ESP32/Wokwi device
```

If server-side MQTT is not configured or fails, the command is queued in Firestore and processed by the dashboard bridge in `useSensor.ts`.

```txt
TelegramCommandExecutor
-> telegram_commands pending doc
-> dashboard bridge polling
-> sendCommand(...)
-> per-device MQTT command topic
```

### Outbound notification path

```txt
Realtime alert in useSensor.ts
-> /api/telegram/notify
-> TelegramBotApiService.sendMessage
-> TELEGRAM_CHAT_ID and optional authorized groups
```

### Command result path

```txt
Dashboard bridge command result
-> /api/telegram/command-result
-> telegram_commands/{commandId}
-> TelegramBotApiService.sendMessage(chatId)
```

## Required Vercel Environment

```env
TELEGRAM_RUNTIME_MODE=webhook
TELEGRAM_WEBHOOK_ENABLED=true
TELEGRAM_BOT_TOKEN=...
TELEGRAM_WEBHOOK_SECRET=...
TELEGRAM_ALLOWED_USER_IDS=123456789
TELEGRAM_CHAT_ID=123456789
APP_BASE_URL=https://stable-domain.example
INTERNAL_COMMAND_SECRET=...
MQTT_BROKER_URL=wss://broker.example.com:8884/mqtt
MQTT_USERNAME=...
MQTT_PASSWORD=...
MQTT_TARGET_DEVICE_ID=wokwi-default
MQTT_TOPIC_COMMAND=smart-clothesline/command
```

`MQTT_TARGET_DEVICE_ID` is required for direct server-side command execution because the current dashboard/device contract uses per-device topics such as:

```txt
smart-clothesline/{deviceId}/command
smart-clothesline/{deviceId}/status
smart-clothesline/{deviceId}/sensor
```

If this variable is missing, direct command dispatch must fail loudly and fallback to the dashboard bridge instead of pretending a global topic publish reached the device.

## Audit Requirements

Every command must create enough evidence to answer these questions:

1. Did Telegram reach this deployment?
2. Was the actor authorized?
3. Was the command parsed and routed?
4. Was direct MQTT configured?
5. Was the command dispatched directly or queued?
6. If queued, did the dashboard bridge pick it up?
7. Did the device publish ACK/status?
8. Was a Telegram result notification sent back?

The current audit evidence is distributed across:

- `telegram_audit`
- `telegram_commands`
- `/api/telegram/diagnostics`
- `system_settings/telegram_bridge`
- dashboard serial logs

## Validation

Run the runtime contract tests:

```bash
npm run test:telegram
```

Run the complete release validation:

```bash
npm run validate
```

## Live Smoke Test

1. Open `/api/telegram/diagnostics`.
2. Verify:

```json
{
  "runtimeMode": "webhook",
  "webhookEnabled": true,
  "webhookUrlMatch": true,
  "botConfigured": true,
  "inboundCommandsCanWork": true,
  "outboundTelegramCanWork": true,
  "firestoreOk": true
}
```

3. Sync webhook if needed:

```bash
curl -X POST "$APP_BASE_URL/api/telegram/webhook-sync" \
  -H "Content-Type: application/json" \
  -H "x-internal-command-secret: $INTERNAL_COMMAND_SECRET" \
  -d '{"repair":true,"force":true,"dropPendingUpdates":true}'
```

4. Test server MQTT direct path:

```bash
curl -X POST "$APP_BASE_URL/api/mqtt/command-test" \
  -H "Content-Type: application/json" \
  -H "x-internal-command-secret: $INTERNAL_COMMAND_SECRET" \
  -d '{"command":"OPEN"}'
```

5. Test from Telegram:

```txt
/ping
/status
/mode_manual
/open
/close
```

## Known Failure Signatures

### Bot does not reply at all

Likely webhook mismatch, disabled webhook, missing token, wrong bot token, or `TELEGRAM_ALLOWED_USER_IDS` does not contain the sender user ID.

### Bot replies "queued" but device does not move

Likely direct MQTT is not configured and dashboard bridge is not alive or not connected to MQTT.

### Bot replies "dispatched" but device does not move

Likely the command was published to the wrong MQTT topic. Confirm `MQTT_TARGET_DEVICE_ID` and the resolved command topic in `/api/telegram/diagnostics`.

### Alert notification does not arrive

Likely `TELEGRAM_CHAT_ID` is missing or the alert is inside cooldown.
