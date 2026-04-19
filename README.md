# Smart Clothesline IoT Dashboard

Smart Clothesline IoT Dashboard is a real-time monitoring web app that simulates an automated clothesline system using IoT concepts and cloud messaging.

## Project Overview

The dashboard monitors:

- Temperature
- Humidity
- Light intensity
- Rain detection

Decision rule:

- If rain is detected OR light is low, clothesline closes (`TERTUTUP`)
- Otherwise, clothesline opens (`TERBUKA`)

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- MQTT (HiveMQ public broker)
- OOP-based clean architecture (Model -> Service -> Hook -> UI)

## Architecture

This project keeps data and UI concerns separated with a layered structure:

- `SensorData` (Model)
  Encapsulates sensor fields and sensor behaviors (`isRaining`, `isDark`, etc.).
- `DecisionEngine` (Business Logic)
  Determines clothesline state and reason from sensor data.
- `MQTTService` (Infrastructure Service)
  Connects to broker, subscribes to topic, parses and validates JSON payload.
- `SensorService` (Application Service)
  Maps MQTT payload into `SensorData` model instances.
- `useSensor` (Hook)
  Subscribes to service updates and exposes live state to UI components.
- UI Layer
  - `StatusPanel`: current decision status (`TERBUKA` / `TERTUTUP`) and reason
  - `SensorCard`: sensor metric cards with visual indicators

### Data Flow

`simulator.js` (publisher) -> MQTT Broker -> `MQTTService` -> `SensorService` -> `useSensor` -> Dashboard UI

## Features Implemented

- Real-time cloud-based updates via MQTT
- Smart decision system for clothesline status
- Clean modular architecture (OOP + separation of concerns)
- Modern SaaS-style dashboard UI
- Status indicator (`ONLINE`) and animated feedback
- Responsive sensor cards and status panel
- Dedicated pages by responsibility:
  - `/` Dashboard summary + manual override controls
  - `/sensor` Realtime monitor (cards, chart, serial log)
  - `/history` Sensor history table
  - `/schedule` Schedule management UI
  - `/settings` Profile, notification, device, and pairing settings
- Dark mode synced across layout, schedule, and settings modules
- Local persistence for operator settings, schedule list, and pairing selections
- Custom 404 page for unknown routes
- Simple CI pipeline (GitHub Actions)

## Current Status

- Project is in simulation phase using cloud MQTT + Node.js simulator
- Dashboard UI is functional and polished
- Core architecture is production-ready for real device integration
- Sensor stream, history buffer, and serial logs are shared across pages in the same session
- Schedule and pairing state are persisted in browser local storage for operator continuity

## UI and State Notes

- Theme:
  - Light and dark mode are both supported and synchronized across main modules.
  - Theme preference is stored locally (`theme`).
- Manual control:
  - Manual open/close on dashboard is currently UI-level override and does not publish MQTT control commands yet.
- Local storage keys:
  - `smart-clothesline-settings-v1`
  - `smart-clothesline-schedules-v1`
  - `smart-clothesline-devices-v1`

## MQTT Topic and Payload

- Topic: `smart-clothesline/sensor`
- Source filter: `smart-clothesline-simulator`
- Payload format:

```json
{
  "temperature": 30,
  "humidity": 75,
  "light": 220,
  "rain": false,
  "sourceId": "smart-clothesline-simulator"
}
```

## How to Run

1. Install dependencies:

```bash
npm install
```

1. Start dashboard:

```bash
npm run dev
```

1. In another terminal, run simulator publisher:

```bash
node simulator.js
```

Optional environment variables for simulator:

```bash
MQTT_TOPIC=smart-clothesline/sensor \
SENSOR_SOURCE_ID=smart-clothesline-simulator \
PUBLISH_INTERVAL_MS=5000 \
node simulator.js
```

## MQTT Connection States

Frontend menampilkan status koneksi dari service MQTT secara real-time:

- `CONNECTING`
- `RECONNECTING`
- `ONLINE`
- `OFFLINE`
- `ERROR`

Status ini dipakai untuk badge koneksi di dashboard dan sensor monitor.

1. Open the app in browser:

- `http://localhost:3000`
- If port `3000` is busy, run `npm run dev -- -p 3001` and open `http://localhost:3001`

## CI Pipeline

This repository includes a minimal GitHub Actions workflow at `.github/workflows/ci.yml`.
It runs on every push to `main`, installs dependencies, runs lint/typecheck, and builds the app.

## Next Development

- Connect real hardware publisher (ESP32)
- Add authenticated MQTT broker setup (TLS credentials)
- Add backend persistence (database/API) for long-term history and schedule sync across devices
- Add alerts/notifications for critical conditions
- Add device health and connectivity monitoring

## Project Goal

This project aims to:

- Demonstrate practical IoT system design with cloud messaging
- Apply clean architecture in a frontend-centric system
- Simulate real-world automation flow before hardware deployment
