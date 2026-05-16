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
