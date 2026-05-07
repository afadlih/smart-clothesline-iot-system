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
- `NEXT_PUBLIC_MQTT_USERNAME` (optional, if broker requires auth)
- `NEXT_PUBLIC_MQTT_PASSWORD` (optional, if broker requires auth)
- `NEXT_PUBLIC_MQTT_TOPIC_SENSOR`
- `NEXT_PUBLIC_MQTT_TOPIC_STATUS`
- `NEXT_PUBLIC_MQTT_TOPIC_COMMAND`

## Vercel Setup

1. Connect repository to Vercel.
2. Set production branch to `main`.
3. Add all environment variables in Vercel project settings.
4. Redeploy after env updates.

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
