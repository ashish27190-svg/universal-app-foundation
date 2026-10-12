# Universal App Foundation

UAF is a reusable foundation for local-first, cloud-backed, mobile-first applications.

The repository is currently at **UAF v0.3 — BUILD 0.21**. Architecture and stack selection are frozen; implementation is now centered on the Household Vault reference app and its reliability gates.

## Current implemented foundation

- Framework-independent Core contracts, typed IDs, errors/results and calculation contracts.
- Validated App Manifest/environment configuration.
- Supabase Auth, personal workspaces, RLS and server-owned mutation/audit infrastructure.
- Vendor-neutral repositories with optimistic revisions and soft-delete lifecycle.
- PowerSync-backed browser SQLite, truthful sync state and reactive local queries.
- Metadata-backed mutation IDs, idempotency ledger, typed write gateway and domain handlers.
- Household Assets domain with versioned deterministic calculations and integer-minor-unit money.
- Conflict recording/review/reapply path with server revision guards.
- UAF UI primitives, mobile Household Vault shell, recent Activity and privacy-safe diagnostics.
- Installable prompt-update PWA.
- Vitest/Playwright reliability suites authored.
- Static security, architecture, PWA/release and monitoring validators.
- GitHub CI/staging/production workflows and optional privacy-first Sentry monitoring.

## Requirements

- Node.js 24 LTS
- pnpm 10.15.1 (pinned through `packageManager`)
- Internet access for the first dependency install

## Verified test evidence vs unproven hosted gates (12 October 2026)

The repository now **tracks `pnpm-lock.yaml`** and GitHub Actions has run
real Node 24/pnpm dependency-backed lint, typechecks, tests and builds.
The last completely verified draft PR #5 baseline was commit `6c84011e`:
four workflows passed, including **81/81** disposable PostgreSQL pgTAP
assertions and **83** local HTTP/authorization checks. Those checks use
isolated local infrastructure; they are **not hosted staging acceptance**.

The current draft branch is newer than that checkpoint and is still
awaiting fresh exact-head validation. It also needs explicit conflict
resolution with `main` after separately approved production safety PR #7
and direct-deploy safety PR #10; do not assume past CI applies to a new SHA.

To reproduce local verification on a connected Node 24 environment:

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

See `docs/operations/PR5-INTEGRATION-REVIEW-PLAN.md` and
`docs/operations/GATE3-AUTHORIZATION-DECISION.md`.
The `--with-e2e` connected gate requires separately approved dedicated
staging credentials and funding. Do not use unrelated Supabase projects.

## Repository layout

- `apps/reference-app` — Household Vault React/Vite/PWA reference product.
- `packages/core` — universal vendor-independent contracts.
- `packages/config` — manifest/environment validation.
- `packages/auth` — identity/workspace contracts and Supabase adapter.
- `packages/data` — repository contracts and reference implementation.
- `packages/sync` — PowerSync adapter, mutation protocol, status and conflicts.
- `packages/ui` — reusable UAF React primitives.
- `packages/domain-kit` — reusable domain-building helpers.
- `packages/test-kit` — shared testing utilities.
- `domains/household-assets` — first real isolated domain.
- `infrastructure/supabase` — migrations, Edge Functions, acceptance/security checklists.
- `infrastructure/powersync` — workspace-scoped Sync Streams.
- `docs/architecture` — per-build evidence trail.
- `docs/operations` — connected verification/deployment guidance.

## Hard rules

Foundation never imports a specific app domain upward. Browser code never receives server secrets. Important writes carry stable mutation IDs and expected revisions. Normal deletion is soft deletion. Structured domain data is owned by SQLite/Postgres—not by the Service Worker cache. Unresolved conflicts surface as **Needs attention** rather than being silently overwritten.

## Current blocker

The remaining gates are **independent code review / PR #5 conflict
resolution**, verified GitHub environment reviewers and protected branch,
approved isolated staging budget, real PowerSync/Supabase/Cloudflare Access
hosting, nine connected browser journeys, and actual PWA/mobile acceptance.
The default-branch staging and production workflows deliberately fail closed.
Root deployment shortcuts are also blocked after approved PR #10.

## Current release candidate

The current frozen validation candidate is **UAF v0.3.0 RC1 (BUILD 0.22)**. Feature development is paused until the connected Node 24, Supabase/PowerSync, browser/PWA, staging and production-pilot gates have been executed. See `RELEASE-CANDIDATE.md` and `BUILD-STATUS.md`.
