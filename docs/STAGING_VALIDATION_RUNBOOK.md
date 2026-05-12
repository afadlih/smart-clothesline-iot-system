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
- `TELEGRAM_ENABLE_GROUP_MODE`: `false`
- `TELEGRAM_LOCAL_POLLING_ENABLED`: `false` (default)
- `TELEGRAM_DROP_PENDING_UPDATES_ON_POLLING_START`: `true`
- `TELEGRAM_IGNORE_UPDATES_BEFORE_START`: `true`
- `TELEGRAM_MAX_UPDATES_PER_POLL`: `10`
- `TELEGRAM_COMMAND_TTL_MS`: `120000`
- `TELEGRAM_DROP_PENDING_UPDATES_ON_WEBHOOK_SETUP`: `true`
- `TELEGRAM_ALLOW_EPHEMERAL_WEBHOOK`: `false`

**Important:** Redeploy without cache after environment variable changes.

## D. Telegram Bot Validation

1. **Diagnostics**:
   - Open `https://<staging-url>/api/telegram/diagnostics`
   - Verify:
     - `runtimeMode`: `webhook`
     - `webhookEnabled`: `true`
     - `webhookUrlMatch`: `true` (If `false`, run **Setup/Repair** below)
     - `webhookStatus`: `ok`
     - `botConfigured`: `true`
     - `directMqttConfigured`: `true`
     - `telegramCommandMode`: `server-direct-with-bridge-fallback`
     - `firestoreOk`: `true`

2. **Setup and Repair (Webhook Sync)**:
   - Run the sync API to ensure Telegram is using the correct `APP_BASE_URL`:
     ```bash
     curl -X POST https://<staging-url>/api/telegram/webhook-sync \
       -H "Content-Type: application/json" \
       -H "x-internal-command-secret: <INTERNAL_COMMAND_SECRET>" \
       -d '{"repair":true,"force":false,"dropPendingUpdates":true}'
     ```
   - Verify result shows `webhookUrlMatch: true` and `webhookStatus: "ok"`.
   - Run **Self-test**: Open `https://<staging-url>/api/telegram/webhook-self-test` to ensure the route is reachable.
   - Re-check `https://<staging-url>/api/telegram/diagnostics`.

3. **Command Queue Cleanup**:
   - Before activating a bridge or after a long downtime, clear the backlog.
   - Run Dry Run:
     ```bash
     curl -X POST https://<staging-url>/api/telegram/commands/cleanup \
       -H "Content-Type: application/json" \
       -H "x-internal-command-secret: <INTERNAL_COMMAND_SECRET>" \
       -d '{"maxAgeMs":300000,"dryRun":true,"mode":"stale"}'
     ```
   - Run Actual Cleanup:
     ```bash
     curl -X POST https://<staging-url>/api/telegram/commands/cleanup \
       -H "Content-Type: application/json" \
       -H "x-internal-command-secret: <INTERNAL_COMMAND_SECRET>" \
       -d '{"maxAgeMs":300000,"dryRun":false,"mode":"stale"}'
     ```
   - Verify `commands.stalePendingCount` is 0 in diagnostics.

4. **Commands**:
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

### F2. Direct MQTT API Test (Diagnostics)
1. Run direct command test:
   ```bash
   curl -X POST https://<staging-url>/api/mqtt/command-test \
     -H "Content-Type: application/json" \
     -H "x-internal-command-secret: <INTERNAL_COMMAND_SECRET>" \
     -d '{"command":"OPEN"}'
   ```
2. Verify device receives command and status updates.

### F3. Dashboard Bridge Fallback
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
