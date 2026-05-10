# Development Workflow

## Branch Model

| Branch | Purpose |
|---|---|
| `main` | Production — deployed automatically to Vercel production |
| `develop` | Staging / integration — deployed to Vercel preview |
| `feature/*` | New features — branch from `develop` |
| `fix/*` | Bug fixes — branch from `develop` |
| `hotfix/*` | Urgent production fixes — branch from `main` |
| `release/*` | Release candidates — branch from `develop` |

## PR Flow

1. Branch from `develop` (or `main` for hotfixes).
2. Run local checks before pushing:
   ```bash
   npm run lint
   npm run typecheck
   npm run build
   ```
3. Open PR targeting `develop` (or `main` for hotfixes).
4. CI must pass before merge.
5. Use squash merge for `feature/*` and `fix/*`.
6. Use merge commit for `hotfix/*` → `main` and `release/*` → `main`.

## Merge Strategy

- `feature/*` / `fix/*` → `develop`: squash merge
- `hotfix/*` → `main`: merge commit, then back-merge to `develop`
- `release/*` → `main`: merge commit per release window
- `develop` → `main`: via `release/*` or direct merge commit

## CI Flow

GitHub Actions (`ci.yml`) runs on:
- Push to `main`, `develop`, `fix/**`, `feature/**`, `release/**`, `hotfix/**`
- Pull requests targeting `main` or `develop`

Validates: lint → typecheck → build

## Vercel Preview Flow

- Every PR and push to a branch produces a **Vercel Preview URL**.
- Preview URLs are unique per deploy (e.g. `smart-clothesline-xxxx.vercel.app`).
- **Do NOT use preview URLs as TELEGRAM_WEBHOOK_URL** — they change per deploy
  and would steal the production webhook (Telegram allows only one webhook per bot).
- Set `TELEGRAM_WEBHOOK_ENABLED=false` on all `fix/*` and `feature/*` branches.

## Release Flow

1. Freeze `develop`.
2. Create `release/<version>` from `develop`.
3. Run final validation (lint / typecheck / build).
4. Merge `release/<version>` → `main`.
5. Tag release on `main`.
6. Vercel auto-deploys `main` to production.
7. Back-merge `main` → `develop`.

## Telegram Webhook Strategy

| Environment | Setting |
|---|---|
| Production (`main`) | `APP_BASE_URL=https://stable.vercel.app` `TELEGRAM_WEBHOOK_ENABLED=true` |
| Staging (`develop`) | `APP_BASE_URL=https://staging.vercel.app` `TELEGRAM_WEBHOOK_ENABLED=true` (use separate bot token) |
| Preview / fix branches | `TELEGRAM_WEBHOOK_ENABLED=false` (default) |

See `DEPLOYMENT.md` for the Vercel environment variables checklist.
