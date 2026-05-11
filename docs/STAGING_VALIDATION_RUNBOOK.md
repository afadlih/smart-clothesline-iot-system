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

1. Open Dashboard on a browser tab (this activates the command bridge).
2. Send `/mode_manual` from Telegram.
3. Verify:
   - Command document appears in `telegram_commands` collection.
   - Dashboard bridge picks up the command (check Firestore `updatedAt` or console logs).
   - MQTT message is dispatched.
   - Device responds and publishes status ACK.
   - Command status becomes `done`.
   - Dashboard TopBar reflects the new mode.

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
