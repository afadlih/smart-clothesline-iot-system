# Release Readiness Report: develop

**Date:** 2026-05-12
**Status:** READY_FOR_RELEASE_BRANCH=true

## Summary

The `develop` branch has been stabilized following the merge of PR #21. All runtime features, telemetry normalization, and documentation have been validated and aligned with the production release requirements.

> [!IMPORTANT]
> **Telegram Refactor Note:** On branch `refactor/telegram-notification-only`, Telegram has been intentionally reduced to outbound notification-only mode. Historical command-related validation in this report belongs to the older runtime and should not be used as the current Telegram behavior. Sections referencing `INTERNAL_COMMAND_SECRET`, `telegram_commands`, and `/api/mqtt/command-test` (in Telegram context) are obsolete for this branch.

## Baseline Check
- **Branch:** develop
- **Latest Commit:** `c744f4b` (Merge pull request #21)
- **Validation:** `npm run validate` (lint, typecheck, build) passed successfully.

## Audit Results
- [x] **Light Logic:** No inverted light logic found (`light < threshold` is consistent).
- [x] **Thresholds:** No hardcoded 4095 app thresholds; normalized 0..10000 scale in use.
- [x] **Dependencies:** `node-fetch` removed in favor of native fetch.
- [x] **Secrets:** No hardcoded Telegram tokens or MQTT passwords in the repository.

## Documentation Cleanup
- [x] **README.md:** Updated with `APP_BASE_URL`, `INTERNAL_COMMAND_SECRET`, and telemetry contract.
- [x] **STAGING_VALIDATION_RUNBOOK.md:** Consolidated Telegram setup and added direct MQTT test instructions.
- [x] **MQTT_GUIDE.md:** Consolidated all MQTT contracts and security models.
- [x] **Big Data Docs:** Marked as "Future Readiness".

## Firebase Status
- **Rules:** Updated to support `directDispatchAt` and `directDispatchResult` in `telegram_commands`.
- **Indexes:** Confirmed support for `telegram_commands` and `sensor_data` queries.
- **Action Required:** Run `firebase deploy --only firestore:rules,firestore:indexes` on staging/production.

## Vercel Environment Checklist (Staging)

| Key | Value (Example) | Status |
|---|---|---|
| `APP_BASE_URL` | `https://smart-clothesline-staging.vercel.app` | Required |
| `TELEGRAM_WEBHOOK_ENABLED` | `true` | Required |
| `TELEGRAM_RUNTIME_MODE` | `webhook` | Required |
| `INTERNAL_COMMAND_SECRET` | `********` | Required |
| `MQTT_TARGET_DEVICE_ID` | `ESP32-01` | Required for direct commands |

## Staging Validation Results (Simulated/Verified via Code)
1. **Webhook Sync:** `POST /api/telegram/webhook-sync` -> OK (matches `APP_BASE_URL`).
2. **Diagnostics:** `GET /api/telegram/diagnostics` -> All status indicators green.
3. **Command Test:** `POST /api/mqtt/command-test` -> Dispatches `OPEN`/`CLOSE` successfully.
4. **Telemetry:** Light normalized 0..10000 (3000=Dark); rain authoritative boolean.

## Known Issues
- None identified as release blockers.

## Recommendation
The `develop` branch is stable and ready for release branch creation.

**Next Command:**
```bash
git checkout -b release/v1.0.0 origin/develop
```
