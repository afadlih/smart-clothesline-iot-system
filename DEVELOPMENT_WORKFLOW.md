# Development Workflow & Branching Strategy

This document defines the process for developing, testing, and releasing changes in the Smart Clothesline system.

## 1. Branch Model

| Branch | Purpose | Source |
|---|---|---|
| `main` | Production (stable) | - |
| `develop` | Staging / Integration | `main` |
| `feature/*` | New features | `develop` |
| `fix/*` | Bug fixes | `develop` |
| `hotfix/*` | Urgent production fixes | `main` |
| `release/*` | Release candidates | `develop` |

## 2. Naming Conventions

- **Feature:** `feature/<scope>-<description>` (e.g., `feature/telegram-alerts`)
- **Fix:** `fix/<scope>-<description>` (e.g., `fix/chart-timezone`)
- **Release:** `release/v<version>` (e.g., `release/v1.0.0`)

## 3. PR & Merge Process

1. **Branch** from the appropriate source.
2. **Commit** using conventional prefixes: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`.
3. **Validate** locally before pushing:
   ```bash
   npm run lint && npm run typecheck && npm run build
   ```
4. **Open PR** targeting `develop` (or `main` for hotfixes).
5. **Merge Strategy:**
   - `feature/*` / `fix/*` -> `develop`: **Squash merge**
   - `release/*` -> `main`: **Merge commit**
   - `hotfix/*` -> `main`: **Merge commit**, then back-merge to `develop`.

## 4. Release Flow

1. Create `release/vX.Y.Z` from `develop`.
2. Follow the [STAGING_VALIDATION_RUNBOOK.md](./docs/STAGING_VALIDATION_RUNBOOK.md).
3. Merge `release/*` into `main` and tag the release.
4. Back-merge `main` into `develop`.

## 5. Vercel & Webhook Safety

- **Webhook Protection:** Preview branches (`feature/*`, `fix/*`) MUST set `TELEGRAM_WEBHOOK_ENABLED=false` to avoid stealing the production webhook.
- **Environment Separation:** Use separate Telegram bots for local, staging (`develop`), and production (`main`).

For production environment setup, refer to [DEPLOYMENT.md](./DEPLOYMENT.md).
