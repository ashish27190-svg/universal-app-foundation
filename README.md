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

## First connected verification

The authoring environment cannot reach npm and currently runs Node 22, so the repository intentionally has no fabricated lockfile or dependency-backed PASS result.

On an internet-connected Node 24 machine run:

```bash
node scripts/connected-build-gate.mjs
```

That command creates the initial `pnpm-lock.yaml` if necessary, runs all static validators, then runs lint, typecheck, tests and the complete build. Commit the lockfile only after that gate passes.

For connected staging browser tests:

```bash
node scripts/connected-build-gate.mjs --with-e2e
```

See `docs/operations/CONNECTED-BUILD-GATE.md`.

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

The remaining gates require a connected Node 24 + npm/pnpm environment and real staging services. No unavailable runtime check is represented as passing in `BUILD-STATUS.md`.

## Current release candidate

The current frozen validation candidate is **UAF v0.3.0 RC1 (BUILD 0.22)**. Feature development is paused until the connected Node 24, Supabase/PowerSync, browser/PWA, staging and production-pilot gates have been executed. See `RELEASE-CANDIDATE.md` and `BUILD-STATUS.md`.
