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

## Architecture

Core application flow:

`Model -> Service -> Hook -> API -> UI`

Realtime data flow:

`ESP32 -> MQTT -> Firestore -> Dashboard -> Telegram`

Future data path (prepared):

`MQTT -> Stream Layer -> Data Lake -> Hadoop/Spark`

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
TELEGRAM_WEBHOOK_SECRET=
TELEGRAM_ALLOWED_USER_IDS=
APP_BASE_URL=https://your-app.vercel.app
INTERNAL_COMMAND_SECRET=
```

Note: `APP_BASE_URL` is required for Telegram Webhook and must be a stable URL. `INTERNAL_COMMAND_SECRET` protects administrative and diagnostic endpoints.

Public client-safe values:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_MQTT_BROKER_URL=wss://broker.hivemq.com:8884/mqtt
NEXT_PUBLIC_MQTT_USERNAME=
NEXT_PUBLIC_MQTT_PASSWORD=
NEXT_PUBLIC_MQTT_TOPIC_SENSOR=smart-clothesline/sensor
NEXT_PUBLIC_MQTT_TOPIC_STATUS=smart-clothesline/status
NEXT_PUBLIC_MQTT_TOPIC_COMMAND=smart-clothesline/command
```

Security note:
- `NEXT_PUBLIC_MQTT_USERNAME` and `NEXT_PUBLIC_MQTT_PASSWORD` are browser-visible.
- Never use privileged/admin MQTT credentials in `NEXT_PUBLIC_*`.
- Use low-privilege ACL credentials for browser MQTT access.

Restart the dev server after changing environment variables.

## Branching and Delivery

- See [DEVELOPMENT_WORKFLOW.md](./DEVELOPMENT_WORKFLOW.md) for branch strategy, merge rules, and release flow.
- See [DEPLOYMENT.md](./DEPLOYMENT.md) for production deployment checklist and Vercel setup.

## Telegram Integration

- Runtime mode: **Webhook** (Production/Staging) or Polling (Development).
- Use `POST /api/telegram/webhook-sync` to register the webhook after deployment.
- API routes:
  - `GET /api/telegram/diagnostics` - Check system health and webhook status.
  - `POST /api/telegram/webhook-sync` - Synchronize webhook registration with Telegram.
  - `POST /api/telegram/webhook` - Inbound Telegram updates.
  - `POST /api/mqtt/command-test` - Direct MQTT command publishing.
  - `POST /api/telegram/commands/cleanup` - Purge stale command queue.
- Supported commands:
  - `/start`, `/status`, `/open`, `/close`, `/mode_auto`, `/mode_manual`, `/health`, `/alerts`, `/help`

## Firestore Notes

- Schedules are stored in Firestore as the source of truth.
- Telegram command and audit data use Firestore-backed collections.
- Composite indexes are defined in `firestore.indexes.json`.

## Telemetry Contract

- `light`: Normalized **0..10000** (higher = brighter, 3000 = threshold).
- `rain`: Authoritative boolean state.
- `lightRaw`, `rainVal`, `rainRaw`: Optional debug/ADC fields.

## Production Checks

```bash
npm run lint
npm run build
```

## CI

The repository includes `.github/workflows/ci.yml` with:

- lint validation
- TypeScript typecheck
- production build validation
- dependency cache
- concurrency protection
- workflow summary output
