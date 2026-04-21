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
- `mqttClient` (Infrastructure)
  Singleton MQTT client for WebSocket connection and broker events.
- `useSensor` (Hook)
  Subscribes to MQTT topic and exposes live state + connection info to UI components.
- UI Layer
  - `StatusPanel`: current decision status (`TERBUKA` / `TERTUTUP`) and reason
  - `SensorCard`: sensor metric cards with visual indicators

### Data Flow

`simulator.js` (publisher) -> MQTT Broker -> `mqttClient` -> `useSensor` -> Dashboard UI

## Features Implemented

- Real-time cloud-based updates via MQTT
- Smart decision system for clothesline status
- Clean modular architecture (OOP + separation of concerns)
- Modern SaaS-style dashboard UI
- Status indicator (`ONLINE`) and animated feedback
- Responsive sensor cards and status panel
- Custom 404 page for unknown routes
- Simple CI pipeline (GitHub Actions)

## Current Status

- Project is in simulation phase using cloud MQTT + Node.js simulator
- Dashboard UI is functional and polished
- Core architecture is production-ready for real device integration

## MQTT Topic and Payload

- Topic: `smart-clothesline/sensor`
- Payload format:

```json
{
  "temperature": 30,
  "humidity": 75,
  "light": 220,
  "rain": false,
  "status": "TERBUKA"
}
```

## How to Run

1. Install dependencies:

```bash
npm install
```

2. Start dashboard:

```bash
npm run dev
```

3. In another terminal, run simulator publisher:

```bash
node simulator.js
```

4. Open the app in browser:
- `http://localhost:3000`
- If port `3000` is busy, run `npm run dev -- -p 3001` and open `http://localhost:3001`

## CI Pipeline

This repository includes a minimal GitHub Actions workflow at `.github/workflows/ci.yml`.
It runs on every push to `main`, installs dependencies, runs lint/typecheck, and builds the app.

## Next Development

- Connect real hardware publisher (ESP32)
- Add authenticated MQTT broker setup (TLS credentials)
- Add historical charts and persistence layer
- Add alerts/notifications for critical conditions
- Add device health and connectivity monitoring

## Project Goal

This project aims to:
- Demonstrate practical IoT system design with cloud messaging
- Apply clean architecture in a frontend-centric system
- Simulate real-world automation flow before hardware deployment

