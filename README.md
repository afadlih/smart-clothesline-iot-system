# Smart Clothesline IoT System

Smart Clothesline IoT System is a Next.js App Router dashboard for realtime clothesline monitoring, automation, history, analytics, and Telegram-based operations.

## What It Includes

- Realtime dashboard for clothesline state, alerts, and operational summary
- Sensor monitoring with MQTT telemetry and heartbeat tracking
- Automation center for schedules, thresholds, and safety behavior
- History and analytics views for historical review and trends
- Notifications center with Telegram command and audit logs
- IoT Hub for pairing, device health, sync, and diagnostics

## Key Routes

- `/dashboard` - operational summary and live state
- `/sensor` - realtime telemetry and stream health
- `/automation` - schedules, thresholds, and automation rules
- `/history` - historical readings and dominant status view
- `/analytics` - operational insights and trend charts
- `/notifications` - Telegram integration and notifications
- `/iot-hub` - device management and connectivity
- `/schedule` - schedule management
- `/settings` - profile and workspace preferences

## Tech Stack

- Next.js 14 App Router
- TypeScript
- Tailwind CSS
- Firebase Firestore
- MQTT
- Telegram Bot API
- Recharts
- Zod
- Zustand

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create your local environment file:

```bash
cp .env.local.example .env.local
```

3. Fill the required values in `.env.local`.

4. Start the app:

```bash
npm run dev
```

## Environment Variables

Secret server-side values:

```env
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
TELEGRAM_ALLOWED_USER_IDS=6393706909
TELEGRAM_WEBHOOK_SECRET=
```

Public client-safe values:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_MQTT_BROKER_URL=wss://broker.hivemq.com:8884/mqtt
NEXT_PUBLIC_MQTT_TOPIC_SENSOR=smart-clothesline/sensor
NEXT_PUBLIC_MQTT_TOPIC_COMMAND=smart-clothesline/command
```

Restart the dev server after changing environment variables.

## Telegram Integration

- Polling runs through a server-side singleton to avoid duplicate instances during Next.js hot reload.
- API routes:
  - `GET /api/telegram/polling`
  - `GET /api/telegram/setup`
  - `POST /api/telegram/setup`
  - `POST /api/telegram/webhook`
- Supported commands:
  - `/start`, `/status`, `/open`, `/close`, `/mode_auto`, `/mode_manual`, `/latest`, `/health`, `/alerts`

## Firestore Notes

- Schedules are stored in Firestore as the source of truth.
- Telegram command and audit data use Firestore-backed collections.
- Composite indexes are defined in `firestore.indexes.json`.

## Production Checks

```bash
npm run lint
npm run build
```

## CI

The repository includes `.github/workflows/ci.yml` with lint and build checks on `main` and pull requests.
