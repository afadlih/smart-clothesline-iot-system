# Deployment Guide

## Target Platform

- Vercel for Next.js runtime
- Firebase Firestore for persistence
- HiveMQ for MQTT transport
- Telegram Bot API for operator commands and notifications

## Pre-Deployment Checklist

1. `npm run lint`
2. `npm run typecheck`
3. `npm run build`
4. Confirm Firestore rules/indexes are applied.
5. Confirm Vercel env variables are configured.

## Required Environment Variables

### Server-only secrets

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`
- `TELEGRAM_WEBHOOK_SECRET`
- `TELEGRAM_ALLOWED_USER_IDS`
- `MQTT_BROKER_URL`
- `MQTT_USERNAME`
- `MQTT_PASSWORD`
- `MQTT_TOPIC_COMMAND`
- `INTERNAL_COMMAND_SECRET` (Required for post-deploy sync and direct MQTT testing)
- `LOG_LEVEL`
- `DEBUG_MODE` (set `false` in production)

### Public variables
...
### ⚠ Telegram Webhook URL Strategy

Telegram can have only **one** active webhook per bot token.

Vercel generates a unique URL per deployment (e.g. `smart-clothesline-xxxx.vercel.app`).
**Never use a unique per-deploy URL as your Telegram webhook** — it changes every deploy
and will break the webhook registration for other deployments using the same bot.

**Correct approach:**

| Environment | Variables |
|---|---|
| **Production** (`main`) | `APP_BASE_URL=https://your-stable.vercel.app` `TELEGRAM_WEBHOOK_ENABLED=true` |
| **Staging** (`develop`) | `APP_BASE_URL=https://stable-staging.vercel.app` `TELEGRAM_WEBHOOK_ENABLED=true` (use separate bot token!) |
| **Preview / fix branches** | `TELEGRAM_WEBHOOK_ENABLED=false` (or leave unset) |

Rules:
- `APP_BASE_URL` must be a **stable** domain (custom domain or Vercel production alias).
- `TELEGRAM_WEBHOOK_ENABLED=true` must only be set for production or stable staging.
- The webhook URL is built automatically: `APP_BASE_URL + /api/telegram/webhook`.

### How to Fix Webhook Mismatch

**IMPORTANT:** Setting `APP_BASE_URL` does **NOT** automatically register the Telegram webhook. It only defines where the webhook *should* be. You must explicitly call the setup API to register the URL with Telegram's servers.

**Note on Inbound vs Outbound:** 
- Sending notifications (e.g. `sendMessage`) works even without a webhook.
- Receiving commands (e.g. `/open`) requires a registered webhook matching the *current* deployment.

If diagnostics show `Webhook Status: MISSING` or `URL MISMATCH`:

1.  Ensure `APP_BASE_URL` is set to the stable domain in Vercel.
2.  Redeploy without cache if `APP_BASE_URL` was just changed.
3.  Run the **secure post-deploy sync**:

```bash
curl -X POST https://<APP_BASE_URL>/api/telegram/webhook-sync \
  -H "Content-Type: application/json" \
  -H "x-internal-command-secret: <INTERNAL_COMMAND_SECRET>" \
  -d '{"repair":true,"force":false}'
```

4.  If it still fails, use **Force Sync** (deletes then re-registers, dropping pending updates):

```bash
curl -X POST https://<APP_BASE_URL>/api/telegram/webhook-sync \
  -H "Content-Type: application/json" \
  -H "x-internal-command-secret: <INTERNAL_COMMAND_SECRET>" \
  -d '{"repair":true,"force":true,"dropPendingUpdates":true}'
```

5.  **GitHub Action:** You can also run the "Telegram Webhook Sync" workflow manually from the Actions tab.

6.  Verify end-to-end via `GET /api/telegram/diagnostics`.

## Health Diagnostics

- Telegram diagnostics: `GET /api/telegram/diagnostics` (Actionable summary)
- Webhook sync status: `GET /api/telegram/webhook-sync` (Check match)
- Webhook self-test: `GET /api/telegram/webhook-self-test` (Verify route reachability)
- Direct MQTT test: `POST /api/mqtt/command-test` (Requires `x-internal-command-secret`)

## Light & Weather Logic (Firmware Contract)

The system uses a normalized light range:
- `light`: 0 to 10000 (higher = brighter, lower = darker).
- `lightRaw`: Raw ADC value (4095 = dark, 0 = bright on Wokwi LDR).
- `isDark`: Triggered when `light < lightThreshold` (default 3000).

Firmware should send `light` normalized via `map(adc, 4095, 0, 0, 10000)`.
App displays "Low light" if `isDark` is true.

## MQTT Credential Separation
...

- Preview environment:
  - use preview broker or low-privilege preview MQTT credentials
  - never reuse production browser MQTT credentials
- Production environment:
  - use production broker and separate credentials
- Device/Firmware:
  - use separate device credentials, never shared with browser dashboard
- Local development:
  - use local/dev credentials separate from preview and production
