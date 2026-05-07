# Development Workflow

## Branch Strategy

- `main`
  - Production-ready code only.
  - Protected branch with required CI.
- `develop`
  - Integration branch for validated features.
- `feature/*`
  - New feature work.
  - Example: `feature/telegram-command-center`
- `fix/*`
  - Non-urgent bug fixes.
  - Example: `fix/history-pagination`
- `hotfix/*`
  - Urgent production fixes branching from `main`.
  - Example: `hotfix/mqtt-reconnect-crash`

## Naming Conventions

- `feature/<scope>-<short-description>`
- `fix/<scope>-<short-description>`
- `hotfix/<scope>-<short-description>`

Use lowercase and hyphen-separated names.

## Pull Request Workflow

1. Branch from `develop` for normal work.
2. Implement and run local checks:
   - `npm run lint`
   - `npm run typecheck`
   - `npm run build`
3. Open PR into `develop`.
4. Require CI pass before merge.
5. Use squash merge for feature/fix branches.

## Merge Strategy

- `feature/*` -> `develop`: squash merge.
- `fix/*` -> `develop`: squash merge.
- `hotfix/*` -> `main`: merge commit, then back-merge to `develop`.
- `develop` -> `main`: merge commit per release window.

## Release Flow

1. Freeze `develop`.
2. Validate CI and smoke tests.
3. Create release PR: `develop` -> `main`.
4. Tag release on `main`.
5. Deploy via Vercel production target.

## CI Flow

CI validates:
- lint
- TypeScript typecheck
- production build

CI runs on `main`, `develop`, and pull requests.

## Deployment Flow

- Preview deploys from PR branches.
- Production deploys from `main`.
- Secrets managed in Vercel project settings.
