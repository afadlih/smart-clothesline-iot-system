# Development Guide

## Prerequisites

- Node.js 20+
- npm

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create the local environment file:

```bash
cp .env.local.example .env.local
```

3. Fill the required Firebase, MQTT, and Telegram values in `.env.local`.

4. Start the dev server:

```bash
npm run dev
```

## Project Structure

```text
smart-clothesline-iot-system/
├── src/
│   ├── app/           # App Router pages and API routes
│   ├── components/    # Shared UI and layout pieces
│   ├── features/      # Feature modules
│   ├── hooks/         # Reusable hooks
│   ├── lib/           # Core libraries and singletons
│   ├── models/        # Domain models
│   ├── services/      # Business logic and integrations
│   ├── stores/        # Zustand stores
│   ├── types/         # Shared type declarations
│   └── utils/         # Utility helpers
├── public/
├── firestore.rules
├── firestore.indexes.json
├── firebase.json
├── .github/workflows/
└── .env.local.example
```

## Working Rules

- Keep Telegram polling in the server-side singleton only.
- Do not start polling in React components or hooks.
- Use Firestore as the source of truth for schedules and Telegram command/audit data.
- Keep all user-facing labels and messages in English.

## Quality Checks

Run these before committing:

```bash
npm run lint
npm run build
```

## Notes

- Restart the dev server after changing environment values.
- If Firestore index errors appear, update `firestore.indexes.json` and sync it to Firebase.
