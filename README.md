# Smart Clothesline IoT System

A Next.js IoT dashboard for monitoring and controlling a smart clothesline system in real time.

## Overview

Key capabilities:

- Realtime sensor monitoring (temperature, humidity, light, rain)
- Device control (`OPEN`, `CLOSE`, `AUTO`) over MQTT
- Firestore persistence for telemetry and schedule state
- Dashboard decision flow with schedule + safety + manual priority
- Analytics and history views for operational review

## Main Features

- `/dashboard`: live status, decision source, schedule active indicator, alerts
- `/sensor`: realtime telemetry cards, serial stream, health/debug context
- `/history`: daily summaries, filters, charts, detailed reading timeline
- `/analytics`: trends, health score, alerts, export
- `/schedule`: Firestore-backed schedule CRUD (single source of truth)
- `/settings`: profile/device/notification/pairing/data management + schedule summary

## Schedule Architecture

- Firestore is the authoritative source for schedules (`schedules` collection).
- `system_settings/global` is used for schedule-related override flags.
- Local storage is only used as a read-only fallback cache if Firestore is unavailable.
- One-time legacy local-schedule migration is handled automatically in the client.

## Tech Stack

- Next.js 14 (App Router), React 18, TypeScript
- Tailwind CSS
- MQTT (`mqtt`)
- Firebase Firestore
- Recharts
- Zod

## Local Development

Requirements:

- Node.js 20+
- npm

Install and run:

```bash
npm install
npm run dev
```

Production checks:

```bash
npm run lint
npm run build
npm run start
```

## Environment Variables

Configure Firebase via `NEXT_PUBLIC_*` values:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

## MQTT Defaults

- Broker: `wss://broker.hivemq.com:8884/mqtt`
- Sensor topic: `smart-clothesline/sensor`
- Status topic: `smart-clothesline/status`
- Command topic: `smart-clothesline/command`
- Config topic: `smart-clothesline/config`

## CI

Workflow file: `.github/workflows/ci.yml`

Pipeline steps:

1. `npm ci --no-audit --no-fund`
2. `npm run lint`
3. `npm run build`

Triggers:

- `push` to `main`
- `pull_request` to `main`
- `workflow_dispatch`
