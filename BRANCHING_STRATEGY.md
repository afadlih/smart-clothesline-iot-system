# Branching Strategy

## Branches

- `main`
  - Production-ready and deployable only.
- `develop`
  - Integration branch for validated changes.
- `feature/*`
  - New feature development from `develop`.
- `fix/*`
  - Bug fixes from `develop`.
- `hotfix/*`
  - Urgent production fix from `main`.
- `release/*`
  - Release preparation branch from `develop`.

## Branch Usage

- Start normal work from `develop`.
- Open PR back to `develop` for feature/fix branches.
- Use `release/*` to freeze and validate before production.
- Merge `release/*` into `main` for production rollout.
- Merge `main` back into `develop` after each production release.

## Naming Conventions

- `feature/<scope>-<short-description>`
- `fix/<scope>-<short-description>`
- `hotfix/<scope>-<short-description>`
- `release/<version-or-date>`

Examples:

- `feature/telegram-command-diagnostics`
- `fix/history-filter-timezone`
- `hotfix/mqtt-reconnect-loop`
- `release/v1.2.0`

## Merge Strategy

- `feature/*` and `fix/*`:
  - squash merge into `develop`
- `release/*`:
  - merge commit into `main`
- `hotfix/*`:
  - merge commit into `main`, then back-merge into `develop`

## Pull Request Flow

1. Branch from the correct source (`develop` or `main` for hotfix).
2. Implement and run:
   - `npm run lint`
   - `npm run typecheck`
   - `npm run build`
3. Open PR with scope, risk, and test notes.
4. Require CI pass before merge.

## Commit Naming

Use conventional-style short prefixes:

- `feat:`
- `fix:`
- `refactor:`
- `docs:`
- `chore:`

## CI/CD Lifecycle

- PR to `develop` or `main` triggers CI validation.
- CI validates lint, typecheck, and build.
- `main` is the production deployment source.

## Deployment Lifecycle

1. Merge validated changes into `develop`.
2. Create `release/*` branch.
3. Final validation and checklist.
4. Merge `release/*` into `main`.
5. Deploy from `main` to Vercel production.
