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
- `LOG_LEVEL`
- `DEBUG_MODE` (set `false` in production)

### Public variables

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_MQTT_BROKER_URL`
- `NEXT_PUBLIC_MQTT_USERNAME` (optional; browser-visible)
- `NEXT_PUBLIC_MQTT_PASSWORD` (optional; browser-visible)
- `NEXT_PUBLIC_MQTT_TOPIC_SENSOR`
- `NEXT_PUBLIC_MQTT_TOPIC_STATUS`
- `NEXT_PUBLIC_MQTT_TOPIC_COMMAND`

Important:
- Do not put privileged MQTT credentials in `NEXT_PUBLIC_*`.
- Browser MQTT credentials are visible to users.
- Use low-privilege ACL credentials only for preview/demo browser MQTT.

## Vercel Setup

1. Connect repository to Vercel.
2. Set production branch to `main`.
3. Add all environment variables in Vercel project settings.
4. Redeploy after env updates.

### ⚠ Firebase Environment Variables — Preview & Production Checklist

All `NEXT_PUBLIC_FIREBASE_*` variables are **required** and must be added to
**both** environments in Vercel → Project Settings → Environment Variables.

| Variable | Preview | Production |
|---|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | ✅ required | ✅ required |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | ✅ required | ✅ required |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | ✅ required | ✅ required |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | ✅ required | ✅ required |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | ✅ required | ✅ required |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | ✅ required | ✅ required |

> **After adding or changing env variables on Vercel you MUST redeploy without
> build cache** — otherwise the old build artifact (which baked in the old env
> at build time) will continue to be served.
>
> How to force a clean redeploy:
> 1. Vercel Dashboard → your project → **Deployments** tab
> 2. Find the latest deployment → click **⋯** → **Redeploy**
> 3. Uncheck **"Use existing build cache"**
> 4. Click **Redeploy**

Missing any of the above variables causes a startup crash with an error message
that names the exact Vercel environment (`Preview` / `Production`) and links to
this checklist.

### ⚠ Telegram Webhook URL Strategy

Vercel generates a unique URL per deployment (e.g. `smart-clothesline-xxxx.vercel.app`).
**Never use a unique per-deploy URL as your Telegram webhook** — it changes every deploy
and Telegram only supports one active webhook per bot token, so preview branches
would silently steal the production webhook.

**Correct approach:**

| Environment | Variables |
|---|---|
| **Production** (`main`) | `APP_BASE_URL=https://your-stable.vercel.app` `TELEGRAM_WEBHOOK_ENABLED=true` |
| **Staging** (`develop`) | `APP_BASE_URL=https://stable-staging.vercel.app` `TELEGRAM_WEBHOOK_ENABLED=true` (use separate bot token!) |
| **Preview / fix branches** | `TELEGRAM_WEBHOOK_ENABLED=false` (or leave unset) |

Rules:
- `APP_BASE_URL` must be a **stable** domain (custom domain or Vercel production alias).
- `TELEGRAM_WEBHOOK_ENABLED=true` must only be set for production or stable staging.
- Preview and `fix/*` branches **must not** enable the webhook.
- Use a **separate bot token** for staging to avoid conflicts with production.
- The webhook URL is built automatically: `APP_BASE_URL + /api/telegram/webhook`.

### ⚠ Firebase Environment Variables — Preview & Production Checklist

All `NEXT_PUBLIC_FIREBASE_*` variables are **required** and must be added to
**both** environments in Vercel → Project Settings → Environment Variables.

| Variable | Preview | Production |
|---|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | ✅ required | ✅ required |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | ✅ required | ✅ required |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | ✅ required | ✅ required |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | ✅ required | ✅ required |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | ✅ required | ✅ required |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | ✅ required | ✅ required |

> **After adding or changing env variables on Vercel you MUST redeploy without
> build cache** — otherwise the old build artifact (which baked in the old env
> at build time) will continue to be served.
>
> How to force a clean redeploy:
> 1. Vercel Dashboard → your project → **Deployments** tab
> 2. Find the latest deployment → click **⋯** → **Redeploy**
> 3. Uncheck **"Use existing build cache"**
> 4. Click **Redeploy**

Missing any of the above variables causes a startup crash with an error message
that names the exact Vercel environment (`Preview` / `Production`) and links to
this checklist.

## Firebase Setup

Apply rules and indexes:

```bash
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

## Telegram Setup

### Development

- Use polling mode.
- Polling runs as singleton service.

### Production

- Use webhook mode.
- Point webhook to: `/api/telegram/webhook`.
- Set `TELEGRAM_WEBHOOK_SECRET`.

## Realtime Flow

`ESP32 -> MQTT -> Next.js listener -> Firestore -> Dashboard -> Telegram`

## CI/CD Flow

- GitHub Actions validates lint/typecheck/build.
- PRs produce Vercel previews.
- Merge to `main` triggers production deployment.

## Health Diagnostics

- Telegram polling diagnostics: `GET /api/telegram/polling`
- Telegram setup status: `GET /api/telegram/setup`

## MQTT Credential Separation

- Preview environment:
  - use preview broker or low-privilege preview MQTT credentials
  - never reuse production browser MQTT credentials
- Production environment:
  - use production broker and separate credentials
- Device/Firmware:
  - use separate device credentials, never shared with browser dashboard
- Local development:
  - use local/dev credentials separate from preview and production
