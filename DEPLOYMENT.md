# Deployment Guide

This document covers the target platform, environment configuration, and security checks for production deployment.

---

## 1. Target Platform
- **Frontend/API:** Vercel (Next.js 14)
- **Database:** Firebase Firestore
- **Transport:** HiveMQ (MQTT)
- **Interface:** Telegram Bot API

---

## 2. Pre-Deployment Checklist

1.  **Validation:** `npm run lint && npm run typecheck && npm run build`
2.  **Persistence:** Confirm Firestore rules and indexes are applied.
3.  **Telegram Sync:** Verify `APP_BASE_URL` is stable and run `/api/telegram/webhook-sync` after deploy.
4.  **Runbook:** Follow the [STAGING_VALIDATION_RUNBOOK.md](./docs/STAGING_VALIDATION_RUNBOOK.md).

---

## 3. Security Checklist

### A. Credential Rotation
- Rotate MQTT passwords and Telegram tokens if exposure is suspected.

### B. Access Control
- Verify broker ACL for browser credentials is **low privilege** (limited subscribe/publish).
- Device credentials must be separate from browser dashboard credentials.
- No wildcard subscribe (`#`) for public identities.

### C. Repository Hygiene
- **Secrets:** No secrets should be tracked in Git.
- **Wokwi:** Firmware examples must use placeholders only.
- **Logs:** Ensure diagnostics endpoints do not expose raw tokens.

---

## 4. Telegram Webhook Strategy

Telegram supports only **one** active webhook per bot token. 

- **Production/Staging:** Set `APP_BASE_URL` to a stable domain and `TELEGRAM_WEBHOOK_ENABLED=true`.
- **Preview:** Disable webhooks (`false`) to avoid conflicts.
- **Sync Command:**
  ```bash
  curl -X POST https://<APP_BASE_URL>/api/telegram/webhook-sync \
    -H "Content-Type: application/json" \
    -d '{"repair":true,"force":false,"dropPendingUpdates":true}'
  ```

---

## 5. Telemetry & Logic
Follow the [MQTT_GUIDE.md](./docs/MQTT_GUIDE.md) for firmware contracts.
- **Light:** 0..10000 (higher = brighter).
- **Dark Trigger:** `light < 3000`.
