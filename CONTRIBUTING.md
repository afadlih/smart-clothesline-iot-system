# Contributing to Smart Clothesline IoT System

## Scope

This repository is focused on a production-style smart clothesline dashboard built with Next.js, TypeScript, Firebase, MQTT, and Telegram integration.

Contributions should stay within this scope:

- UI and UX improvements
- Realtime stability and performance
- Telegram integration hardening
- Firestore query and data-flow fixes
- Documentation updates

## Before You Start

1. Install dependencies:

```bash
npm install
```

2. Create a local environment file:

```bash
cp .env.local.example .env.local
```

3. Fill the required values in `.env.local`.

## Code Standards

- Use TypeScript with explicit types where useful.
- Keep files focused and small.
- Prefer server-safe logic for integrations and polling.
- Avoid duplicating business logic in UI components.
- Use English for all user-facing text.

## Markdown and Docs

- Keep `README.md`, `DEVELOPMENT.md`, and environment examples aligned with the current architecture.
- Remove stale references to deleted routes, deleted dependencies, or old config files.
- Use ASCII text unless the file already needs Unicode.

## Verification

Run these checks before submitting changes:

```bash
npm run lint
npm run build
```

## Pull Request Notes

- Describe what changed and why.
- Mention any Firestore index or environment changes.
- Include screenshots only when UI changes are involved.

## Notes

- Telegram polling must remain server-side and singleton-based.
- Do not move polling into React components or hooks.
- Do not change MQTT payload structure unless the task explicitly requires it.
