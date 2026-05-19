# Telegram Notification-Only Integration

As of refactor `refactor/telegram-notification-only`, the Telegram integration has been transitioned to a **notification-only** model.

## ⚠️ Architectural Change

Telegram is no longer used for:
- Device control (commands like `/open`, `/close`, etc.)
- Command execution or queuing
- Browser bridge fallback
- Operational command replies

Telegram is now strictly a **unidirectional channel** for outbound system notifications.

## 📡 Supported Notifications

The system sends notifications for the following events:
- **Rain Warnings**: When rain is detected while the clothesline is open.
- **Dry Clothes Alert**: When humidity and temperature indicate clothes are likely dry.
- **Device Offline**: When no telemetry has been received for a sustained period.
- **System Health**: Critical operational alerts.

## ⚙️ Configuration

The following environment variables are required for notifications:

- `TELEGRAM_BOT_TOKEN`: The API token for your bot.
- `TELEGRAM_CHAT_ID`: The default recipient for notifications.
- `TELEGRAM_ENABLE_GROUP_MODE`: Set to `true` to allow notifications to authorized groups.
- `TELEGRAM_ALLOWED_GROUPS`: Comma-separated list of numeric group IDs.

### Removed Variables

The following variables are no longer used and should be removed from your environment:
- `MQTT_TARGET_DEVICE_ID` (for Telegram)
- `INTERNAL_COMMAND_SECRET`
- `TELEGRAM_ALLOWED_USER_IDS`
- `TELEGRAM_RUNTIME_MODE`
- `TELEGRAM_COMMAND_TTL_MS`
- `TELEGRAM_COMMAND_MAX_AGE_MS`

## 🛡️ Security

Since inbound commands are ignored, the security model has been simplified:
- The webhook remains active but only returns a static "notification-only" message.
- Webhook requests are still audit-logged for traceability.
- Rate limiting (60s cooldown) is applied to webhook auto-replies to prevent bot spam.

## 🧪 Testing

To validate the notification integration, use the diagnostic endpoint:
`GET /api/telegram/diagnostics`

You can also run the validation script:
`npm run test:telegram`

> [!NOTE]
> The previous Telegram command diagnostics path (`/api/mqtt/command-test`) is intentionally removed. Telegram no longer has any command-dispatch path. MQTT/device control diagnostics, if needed, must be handled separately from Telegram using browser-side MQTT controls in the dashboard.

## Notification Message Contract

Telegram messages follow this structure:

- Severity and title
- Device identity
- Event type/source
- Latest telemetry context
- Human-readable reason
- Recommended dashboard action
- Dashboard link
- Timestamp
- Alert key

> [!IMPORTANT]
> Telegram never accepts hardware control commands. If action is needed, open the dashboard.

### Rain detected example

```bash
curl -X POST "$APP_BASE_URL/api/telegram/notify" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "rain_detected",
    "severity": "warning",
    "title": "Rain detected",
    "description": "Rain sensor reports wet condition while the clothesline is open.",
    "deviceId": "ESP32-01",
    "alertKey": "rain-detected-ESP32-01",
    "dashboardPath": "/dashboard"
  }'
```

### Device offline example

```bash
curl -X POST "$APP_BASE_URL/api/telegram/notify" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "device_offline",
    "severity": "critical",
    "title": "Device offline",
    "description": "No telemetry has been received for more than 5 minutes.",
    "deviceId": "ESP32-01",
    "alertKey": "device-offline-ESP32-01",
    "dashboardPath": "/dashboard?panel=diagnostics"
  }'
```

### Hadoop batch report example

```bash
curl -X POST "$APP_BASE_URL/api/telegram/notify" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "hadoop_batch_report",
    "severity": "info",
    "title": "Daily Hadoop analytics completed",
    "description": "Daily sensor summary and rain event aggregation were generated successfully.",
    "source": "hadoop",
    "alertKey": "hadoop-daily-summary-2026-05-16",
    "dashboardPath": "/big-data"
  }'
```
