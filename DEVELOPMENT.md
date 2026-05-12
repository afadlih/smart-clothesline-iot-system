# Development Guide

This guide covers everything needed to set up, develop, and contribute to the Smart Clothesline system.

---

## 1. Prerequisites

- Node.js 20+
- npm

## 2. Quick Start

1.  **Install dependencies:** `npm install`
2.  **Environment Setup:** `cp .env.local.example .env.local`
3.  **Configuration:** Fill in the required Firebase, MQTT, and Telegram values in `.env.local`.
4.  **Launch:** `npm run dev`

## 3. Contribution & PR Process

### A. Scope
We welcome contributions focused on:
- UI/UX improvements.
- Realtime stability and MQTT data-flow performance.
- Telegram bot command hardening and security.
- Documentation and developer experience.

### B. Pull Request Rules
- **Branch** from `develop`.
- **Commit** using conventional prefixes: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`.
- **Validate** locally before pushing: `npm run validate` (lint + typecheck + build).
- **PR Description:** Describe what changed and why. Mention any Firestore index or environment changes.

### C. Webhook Safety
Preview branches (`feature/*`, `fix/*`) **MUST** set `TELEGRAM_WEBHOOK_ENABLED=false` to avoid stealing the production webhook updates. Use separate bot tokens for different environments.

---

## 4. Engineering Standards

- **TypeScript:** Use explicit types for domain models and service interfaces.
- **Architecture:** Keep Telegram polling and heavy MQTT logic in server-side singletons (`lib/` and `services/`).
- **Safety:** Never start long-running tasks or polling inside React components or hooks.
- **MQTT:** Follow the [MQTT_GUIDE.md](./docs/MQTT_GUIDE.md) for telemetry standards and light normalization (0-10000).

---

## 5. Roadmap
- **Analytics:** Integration of historical trend analysis using Firestore partitions.
- **Big Data:** Preparation for Hadoop/Spark telemetry archival (see [BIG_DATA_ROADMAP.md](./docs/BIG_DATA_ROADMAP.md)).
