# Staging Validation Runbook

Run these steps to validate the `develop` branch before promotion to `release/v1.0.0`.

## A. Local Validation

Run the full validation suite:
```bash
npm run validate
```
Expected:
- Lint passes
- Typecheck passes
- Production build succeeds

## B. Firebase Configuration

Deploy rules and indexes:
```bash
firebase deploy --only firestore:rules,firestore:indexes
```
Verification:
- Check Firebase Console -> Firestore -> Rules
- Check Firebase Console -> Firestore -> Indexes

## C. Vercel Staging Environment (develop)

Ensure the following environment variables are set in Vercel for the `develop` branch:

- `NEXT_PUBLIC_FIREBASE_*`: Match staging project
- `NEXT_PUBLIC_MQTT_BROKER_URL`: Match staging broker (e.g., HiveMQ Cloud)
- `NEXT_PUBLIC_MQTT_USERNAME`: Low-privilege browser user
- `NEXT_PUBLIC_MQTT_PASSWORD`: Low-privilege browser password
- `MQTT_BROKER_URL`: Server-side MQTT URL
- `MQTT_USERNAME`: Server-side MQTT user with publish permissions
- `MQTT_PASSWORD`: Server-side MQTT password
- `MQTT_TOPIC_COMMAND`: Server-side MQTT command topic
- `INTERNAL_COMMAND_SECRET`: Secure string for diagnostic API
- `APP_BASE_URL`: Stable staging domain (e.g., `smart-clothesline-staging.vercel.app`)
- `TELEGRAM_BOT_TOKEN`: Staging bot token
- `TELEGRAM_WEBHOOK_ENABLED`: `true`
- `TELEGRAM_WEBHOOK_SECRET`: Secure random string
- `TELEGRAM_ALLOWED_USER_IDS`: IDs of staging testers
- `TELEGRAM_ALLOWED_GROUPS`: IDs of staging groups

**Important:** Redeploy without cache after environment variable changes.

## D. Telegram Bot Validation

1. **Diagnostics**:
   - Open `https://<staging-url>/api/telegram/diagnostics`
   - Verify:
     - `runtimeMode`: `webhook`
     - `webhookEnabled`: `true`
     - `webhookUrlMatch`: `true`
     - `botConfigured`: `true`
     - `directMqttConfigured`: `true`
     - `telegramCommandMode`: `server-direct-with-bridge-fallback`
     - `firestoreOk`: `true`
     - `bridgeAlive`: `true` (only if a dashboard tab is open)

2. **Setup**:
   - Run `POST /api/telegram/setup` with `{"mode": "webhook"}`
   - Verify:
     - `webhookRegistered`: `true`
     - `webhookMatchesAppBaseUrl`: `true`

3. **Commands**:
   - Test `/start`, `/help`, `/status`, `/ping`
   - Verify responses are correct and authorization works.

## E. MQTT Realtime Validation

1. **Connectivity**:
   - Start Wokwi or ESP32 device.
   - Verify sensor telemetry arrives on dashboard.
   - Verify status updates reflect device state.

2. **Stability**:
   - Verify duplicate telemetry (stable sensor values) does not trigger "offline" status.
   - Stop device and verify "stale" or "offline" status after 15-30s.
   - Restart device and verify online recovery.

## F. Telegram Command E2E Validation

### F1. Server-Side Direct Execution (Primary)
1. Close all Dashboard browser tabs (bridge offline).
2. Send `/mode_manual` from Telegram.
3. Verify:
   - Telegram replies almost instantly with "dispatched to device".
   - Device responds and publishes status ACK.
   - Command status becomes `done` in Firestore.
   
### F2. Dashboard Bridge Fallback
1. Temporarily unset `MQTT_PASSWORD` in Vercel to break server-side publish, redeploy.
2. Open Dashboard on a browser tab (this activates the command bridge).
3. Send `/mode_manual` from Telegram.
4. Verify:
   - Command is queued in Firestore.
   - Dashboard bridge picks up the command and logs "Dashboard bridge polling pending commands".
   - MQTT message is dispatched by the browser.
   - Device responds and publishes status ACK.
   - Command status becomes `done`.

## G. Analytics and Data Export

1. Open `/analytics` page.
2. Test different time ranges (1h, 6h, 24h, 7d, 30d).
3. Verify charts render correctly even with 1-2 data points.
4. Export CSV and JSON.
5. **Security Check**: Open exported files and verify NO secret fields (MQTT credentials, Telegram tokens, etc.) are present.

## H. Release Promotion

Once all checks pass:
1. Rotate any exposed credentials if necessary (check `SECURITY_RELEASE_CHECKLIST.md`).
2. Verify no secrets remain in the repository.
3. Manually create `release/v1.0.0` from `develop`.
4. Do NOT merge to `main` until final approval.
