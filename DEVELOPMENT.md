# Development & Contribution Guide

This guide covers everything needed to set up, develop, and contribute to the Smart Clothesline system.

## 1. Prerequisites

- Node.js 20+
- npm

## 2. Quick Start

1.  **Install dependencies:** `npm install`
2.  **Environment Setup:** `cp .env.local.example .env.local`
3.  **Configuration:** Fill in the required Firebase, MQTT, and Telegram values in `.env.local`.
4.  **Launch:** `npm run dev`

## 3. Contribution Scope

We welcome contributions focused on:
- UI/UX improvements for the dashboard.
- Realtime stability and MQTT data-flow performance.
- Telegram bot command hardening and security.
- Documentation updates and developer experience.

## 4. Engineering Standards

- **TypeScript:** Use explicit types for domain models and service interfaces.
- **Architecture:** Keep Telegram polling and heavy MQTT logic in server-side singletons (`lib/` and `services/`).
- **State Management:** Use Zustand for global UI state; avoid prop-drilling.
- **Localization:** Use English for all user-facing text and console logging.
- **Safety:** Never start long-running tasks or polling inside React components or hooks.

## 5. Quality Assurance

Run the following validation suite before pushing or opening a PR:
```bash
npm run lint       # Code style and best practices
npm run typecheck  # TypeScript integrity
npm run build      # Production build validation
```

## 6. Project Roadmap

- **Analytics:** Integration of historical trend analysis using Firestore partitions.
- **Security:** Decoupling sensitive command paths from browser logic via server-side direct MQTT.
- **Big Data:** Preparation for Hadoop/Spark telemetry archival (see [BIG_DATA_GUIDE.md](./docs/BIG_DATA_GUIDE.md)).

Follow the [DEVELOPMENT_WORKFLOW.md](./DEVELOPMENT_WORKFLOW.md) for branch and release management.
