# UAF Build Status

## BUILD 0.1 — Repository Foundation

### Completed locally

- Monorepo structure created.
- Eight UAF package shells created.
- React/Vite reference app shell created.
- Shared TypeScript, ESLint and Prettier configuration created.
- Structural validator passes.
- Framework-independent TypeScript package sources pass local `tsc` validation.
- Node 24 LTS requirement is declared in `.nvmrc` and `package.json`.

### External dependency gate still pending

This execution environment cannot reach the npm registry and does not have pnpm installed. These dependency-backed gates must therefore run on an internet-connected Node 24 environment before BUILD 0.1 is marked fully green:

```bash
corepack enable
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

---

## BUILD 0.2 — `@uaf/core`

### Implemented

- Branded `EntityId`, `WorkspaceId`, `UserId`, `EventId`, `CommandId`, `CalculationId`.
- Branded `Revision` and ISO datetime boundary type.
- Durable `BaseEntity` contract.
- Lifecycle, data-quality, confidence and data-source models.
- Serializable domain command and domain event contracts.
- Structured `AppError` model and constructor.
- Discriminated `Result` type with `ok`, `err`, `isOk`, `isErr` helpers.
- Calculation definition, evidence and result contracts.
- Type-level tests proving IDs cannot be mixed accidentally.
- Vitest behavioural test suite authored.
- Core dependency-boundary validator added.
- BUILD 0.2 architecture note and package README added.

### Passed locally

```text
Core TypeScript build                PASS
Core type-contract tests             PASS
Framework local TypeScript check     PASS
Core forbidden-dependency check      PASS
Core runtime smoke check             PASS
Repository structural validation     PASS
```

### Intentionally excluded from Core

- React/UI concerns.
- Supabase.
- PowerSync.
- Cloudflare.
- Domain-specific entities or rules.
- Device-local `syncState` on durable entities.
- Runtime schema validation and ID generation.

### Still pending because dependencies cannot be installed here

```text
Vitest execution                     NOT RUN
ESLint                               NOT RUN
Prettier check                       NOT RUN
Full Turborepo build                 NOT RUN
```

No unavailable check is represented as passing.

---

## BUILD 0.3 — `@uaf/config` + App Manifest

### Implemented

- App identity, semantic-version-shaped version, domain registration and theme schemas.
- Capability schema with defaults for all currently known Foundation capabilities.
- Capability compatibility rules:
  - workspace → authentication
  - sync → authentication + workspace + offline
  - collaboration → authentication + workspace + sync
- Duplicate domain registration detection.
- Runtime environment schema and capability-aware required-service validation.
- `defineAppManifest()` canonical manifest constructor.
- Household Vault manifest wired into the reference app.
- Config dependency-boundary validator.
- BUILD 0.3 architecture note and ADR-016.
- Vitest config/reference-app tests authored.

### Passed locally

```text
Repository structural validation          PASS
Core dependency-boundary validation      PASS
Config dependency-boundary validation    PASS
Config/app-manifest TypeScript check*     PASS
```

`*` The config/app-manifest TypeScript check used a temporary local Zod declaration shim because npm dependencies are unavailable in this environment. The shim is not part of the repository and does not replace the required real dependency-backed build.

### Still pending because dependencies cannot be installed here

```text
Real Zod runtime/Vitest execution         NOT RUN
ESLint                                    NOT RUN
Prettier check                            NOT RUN
Full Turborepo typecheck/build            NOT RUN
Reference-app Vite build                  NOT RUN
```

No unavailable check is represented as passing.

---

## BUILD 0.4 — Database, Authentication & Workspace Foundation

### Implemented

- Supabase migration for `profiles`, `workspaces`, `workspace_memberships`, `processed_mutations`, `write_conflicts`, and `audit_events`.
- Profile bootstrap trigger for new Supabase Auth users.
- `SECURITY DEFINER` membership helpers with an empty `search_path`.
- Idempotent `ensure_personal_workspace()` RPC that atomically resolves/creates the personal workspace and owner membership.
- Explicit RLS policies plus SQL grants; server-owned mutation ledger has no normal client policy.
- Provider-neutral `AuthService` and `WorkspaceService` contracts.
- Supabase Auth/workspace adapter in `@uaf/auth`.
- Reference-app service composition through the validated environment.
- BUILD 0.3 environment-key correction: `VITE_UAF_ENVIRONMENT` is now used consistently with Vite client exposure rules.
- Auth dependency-boundary and Supabase-foundation static validators.
- ADR-017 and BUILD 0.4 architecture note.

### Passed locally

```text
Repository structural validation          PASS
Core dependency boundary                 PASS
Config dependency boundary               PASS
Auth dependency boundary                 PASS
Supabase migration invariant scan        PASS
Auth TypeScript contract check*          PASS
```

`*` The Auth TypeScript check used a temporary declaration shim for `@supabase/supabase-js` because external npm dependencies are unavailable in this environment. The shim is not part of the repository.

### External acceptance gate E3 still required

A real Supabase local/staging instance with two authenticated users must prove:

```text
Personal workspace bootstrap is idempotent       NOT RUN
Owner membership is created                       NOT RUN
User A cannot read User B workspace              NOT RUN
User A cannot update User B workspace            NOT RUN
Anonymous access is blocked                       NOT RUN
Normal client cannot write processed_mutations    NOT RUN
```

See `infrastructure/supabase/tests/build-0.4-acceptance.sql`.

No unavailable check is represented as passing.

---

## BUILD 0.5 — Data & Repository Contracts

### Implemented

- Workspace-scoped `Repository<TEntity>` contract.
- Explicit update/lifecycle mutation envelopes with expected revisions.
- Immutable-field-safe entity patch type.
- Structured repository errors for missing rows, stale revisions, duplicate IDs, workspace mismatch, and invalid lifecycle operations.
- In-memory reference repository with revision increments, active-only default listing, soft delete, and restore.
- Behavioural Vitest contract suite authored.
- Data dependency-boundary validator and BUILD 0.5 architecture note.

---

## BUILD 0.6 — PowerSync Local Database & Sync Status

### Implemented

- `@powersync/web` 2.3.1 dependency selected from the current release line.
- Foundation PowerSync schema for workspaces, workspace memberships and write conflicts.
- Persistent browser SQLite database factory using the default Web VFS.
- `UafPowerSyncConnector` for fresh authenticated credentials plus injected upload behavior.
- UAF sync states and status mapper using current PowerSync `SyncStatus` fields.
- Pending mutation count from `ps_crud`.
- Observable `PowerSyncStatusStore`.
- Workspace membership receives a stable UUID for PowerSync row identity.
- Sync dependency-boundary validator and BUILD 0.6 architecture note.

### External acceptance gate E5 still required

```text
PowerSync package real typecheck/build         NOT RUN
Browser SQLite create/read                     NOT RUN
Offline reload persistence                     NOT RUN
Status listener against real SDK               NOT RUN
Pending queue count against real SDK            NOT RUN
```

These require installed dependencies and a browser runtime.

---

## BUILD 0.7 — Mutation Protocol & Write Gateway Framework

### Implemented

- `MutationId` added to UAF Core.
- Versioned mutation metadata carried via PowerSync `_metadata`.
- Physical PowerSync deletes rejected; UAF continues to use soft-delete updates.
- HTTP mutation uploader with authenticated bounded batches and terminal-outcome verification.
- `sync-apply` Supabase Edge Function using authenticated `@supabase/server` context.
- Workspace authorization through RLS-scoped client before privileged infrastructure writes.
- Processed-mutation idempotency lookup and terminal outcome ledger.
- Strict domain-handler registry; no client-supplied dynamic table writes.
- Conflict/rejection issue records and successful audit records.
- ADR-018 and BUILD 0.7 architecture note.

### Acceptance gate E6

```text
Protocol/static boundary validation              READY
Real PowerSync batch upload                      NOT RUN
Real Edge Function auth                          NOT RUN
Duplicate mutation against real domain handler   BLOCKED UNTIL DOMAIN HANDLER
Revision conflict against real domain handler    BLOCKED UNTIL DOMAIN HANDLER
```

---

## BUILD 0.8 — UAF UI Foundation

### Implemented

- Semantic design tokens and light/dark foundations.
- Wave-1 controls, forms, cards, list rows, header, bottom navigation, dialog/bottom sheet, loading/error/empty states, toast, and truthful `SyncStatus`.
- Radix is isolated behind UAF overlays; apps consume `@uaf/ui` rather than Radix directly.
- Reduced-motion handling.
- UI boundary validator.

### Passed locally

```text
UI dependency boundary                       PASS
UI TypeScript compatibility check*           PASS
```

`*` External React/Radix packages are unavailable in this environment; compatibility was checked with temporary declarations only. Real DOM/Vitest/accessibility execution remains NOT RUN.

---

## BUILD 0.9 — Household Assets Reference Domain

### Implemented

- Pure Household Assets domain entities, validation, factory, repositories and calculations.
- Integer-minor-unit money model with no silent currency conversion.
- Warranty Status v1 and Lifetime Service Cost v1 calculation contracts.
- PostgreSQL household tables, indexes, SELECT-only client grants and workspace RLS.
- PowerSync domain schema and workspace-scoped Sync Streams.
- Strict Edge mutation handlers with revision/lifecycle/domain validation.
- Local-first `PowerSyncHouseholdAssetRepository` using UAF mutation metadata.
- Normal repository updates can no longer change `lifecycleState`; delete/restore are explicit.

### Passed locally

```text
Household domain boundary                    PASS
Household Supabase/PowerSync static scan     PASS
Household domain TypeScript                  PASS
Local Household repository TypeScript        PASS
```

### External acceptance evidence still required

```text
Real Supabase migration/RLS                   NOT RUN
Real PowerSync Sync Stream                    NOT RUN
Browser SQLite persistence                    NOT RUN
Real mutation gateway upload                  NOT RUN
Revision-conflict runtime test                NOT RUN
```

No unavailable check is represented as passing.

---

## BUILD 0.10 — Household Vault Vertical Slice

### Implemented

- Authentication → personal workspace → PowerSync connection composition.
- Household asset create flow against local SQLite.
- UAF mutation metadata/gateway path connected to the real reference domain.
- Truthful sync status and logout protection while local mutations are pending.
- Initial mobile-first reference app shell.

### Acceptance status

```text
Source composition/static checks             PASS
Offline create → close/reopen                 NOT RUN
Reconnect → exactly one Postgres row          NOT RUN
Cloud echo → stable Synced                     NOT RUN
```

Milestone A remains **NOT PASSED** until the connected browser/backend journey runs successfully.

---

## BUILD 0.11 — Edit / Soft Delete / Restore

### Implemented

- Asset edit form and repository flow.
- Soft delete instead of physical delete.
- Deleted-record view and restore action.
- Revision-preserving lifecycle mutations.

### Acceptance status

```text
Source and boundary validators               PASS
Lifecycle Playwright journey authored        PASS
Connected online/offline lifecycle runtime   NOT RUN
```

---

## BUILD 0.12 — Reactive Local Queries / Multi-Device Visibility

### Implemented

- Vendor-neutral `LocalSqlDatabase.watch()` contract.
- PowerSync watched-query adapter.
- Household asset live list subscriptions.
- Multi-browser-context convergence Playwright journey.

### Acceptance status

```text
Source-level TypeScript compatibility*       PASS
Architecture boundaries                      PASS
Two-device live convergence                  NOT RUN
```

`*` External package types are temporarily declared only for local source checking; real dependency-backed typecheck remains required.

---

## BUILD 0.13 — Conflict Detection & Resolution

### Implemented

- Conflict provenance migration adds `mutation_id` and logical `operation`.
- Unresolved conflict repository and watcher.
- `Needs attention` is part of the global sync state.
- `keep_server` and guarded `reapply_client` resolution endpoint.
- Reapply reuses the normal domain mutation handler and current server revision.
- Resolution audit events.
- Forced offline revision-conflict Playwright journey.

### Passed locally

```text
Conflict-resolution invariant validator      PASS
Edge Function source TypeScript check*       PASS
Household Supabase static validation         PASS
```

### Connected gate still required

```text
Real competing-device conflict               NOT RUN
Keep-server replication                       NOT RUN
Reapply-local revision guard                 NOT RUN
```

---

## BUILD 0.14 — Activity / Audit Visibility

### Implemented

- Workspace-scoped `audit_events` PowerSync stream.
- Read-only local audit repository with live query.
- Recent Activity timeline in Household Vault.

### Acceptance status

```text
Static stream/schema validation              PASS
Source-level type compatibility*             PASS
Live server → device audit replication       NOT RUN
```

---

## BUILD 0.15 — PWA Install / Update Lifecycle

### Implemented

- `vite-plugin-pwa` prompt-update integration.
- Installable app manifest and icons.
- App-shell/static-asset Service Worker only.
- No API/domain runtime caching; PowerSync SQLite remains data authority.
- Update prompt avoids forced reload during edits.

### Passed locally

```text
PWA/release invariant validator              PASS
Source-level TypeScript compatibility*       PASS
```

### Real-device gate still required

```text
Android install                              NOT RUN
Offline launch/reopen                        NOT RUN
Reconnect/sync                               NOT RUN
Prompted app update                          NOT RUN
```

---

## BUILD 0.16 — Failure Engineering / Reliability Tests

### Implemented

- Retryable gateway failure test.
- Terminal conflict/rejection uploader test.
- Conflict resolver error/409 test.
- Sync-state unresolved-conflict test.
- Lifecycle, convergence and forced-conflict Playwright suites.

### Acceptance status

```text
Test source authored                         PASS
Vitest execution                             NOT RUN
Playwright connected execution               NOT RUN
```

---

## BUILD 0.17 — Security Regression Gates

### Implemented

- Client-secret static scan.
- RLS-enable and server-ledger grant checks.
- Both user-facing Edge Functions explicitly require platform JWT verification.
- Connected two-user/anonymous security checklist.

### Passed locally

```text
Security invariant validator                PASS
```

### Live security gate still required

```text
Anonymous denial                             NOT RUN
Workspace A → B read denial                  NOT RUN
Workspace A → B update denial                NOT RUN
Invalid JWT denial                           NOT RUN
Membership removal stops Sync Stream         NOT RUN
Built bundle contains no server secret       NOT RUN
```

Any cross-workspace leak remains an S0 release blocker.

---

## BUILD 0.18 — Privacy-Safe Diagnostics

### Implemented

Diagnostics expose only operational context:

- app/Foundation versions,
- environment,
- sync state,
- connectivity,
- pending mutations,
- unresolved conflicts,
- last sync,
- short client-id suffix.

They intentionally omit credentials, email addresses and domain record contents.

### Acceptance status

```text
Source-level TypeScript compatibility*       PASS
Connected diagnostic values                  NOT RUN
```

---

## BUILD 0.19 — CI/CD / Cloudflare Release Gates

### Implemented

- PR CI workflow.
- Scheduled/manual connected E2E workflow.
- Staging deployment workflow.
- Manual-only production workflow using protected GitHub environment semantics.
- Supabase migration/Edge Function deployment steps.
- Cloudflare Static Assets SPA deployment.
- CI intentionally requires a committed `pnpm-lock.yaml`.

### Passed locally

```text
Workflow YAML parse                          PASS
PWA/release invariant validator              PASS
```

### External gates still required

```text
GitHub Actions run                           NOT RUN
Staging deploy                               NOT RUN
Production deploy                            NOT RUN
```

---

## BUILD 0.20 — Privacy-First Monitoring

### Implemented

- Optional `@sentry/react` integration.
- Initialization before React mount.
- Release/environment tagging.
- `sendDefaultPii: false`.
- `tracesSampleRate: 0` for Phase 1.
- No Session Replay.
- Safe application Error Boundary.
- Optional staging/production Sentry DSN workflow secrets.

### Passed locally

```text
Monitoring privacy validator                PASS
Source-level TypeScript compatibility*       PASS
```

### External gate still required

```text
Staging error reaches Sentry                 NOT RUN
Release/environment correlation             NOT RUN
Sensitive-data review of real event          NOT RUN
```

---

## BUILD 0.21 — Connected Build Gate Automation

### Implemented

- `scripts/connected-build-gate.mjs`.
- Node 24 hard requirement.
- Pinned pnpm 10.15.1 activation.
- First legitimate lockfile generation path.
- All architecture/security validators included.
- Lint/typecheck/Vitest/build gate.
- Optional connected Playwright gate.
- Operations runbook.

### Passed locally

```text
Connected-gate script syntax                PASS
All static validators                       PASS
Browser/app source TypeScript check*         PASS
Supabase Edge source TypeScript check*       PASS
Workflow YAML parse                          PASS
```

`*` Temporary declaration shims are outside the repository and exist only because this environment cannot install external packages. They do not substitute for the real dependency-backed TypeScript build.

### Current execution-environment blocker

```text
Current Node                              v22.16.0
Required Node                             24.x
pnpm                                      unavailable
npm registry                              unavailable
pnpm-lock.yaml                            intentionally not fabricated
```

Therefore these gates remain truthfully **NOT RUN**:

```text
pnpm install / frozen-lock verification
Real ESLint
Real TypeScript dependency-backed build
Vitest
Vite production build
Supabase migrations/RLS runtime
PowerSync replication/upload runtime
Connected Playwright reliability suite
Real Android PWA test
Staging deployment
Production pilot
```

## Current UAF Build Position

The useful offline/source-authoring work through **BUILD 0.21** is complete. The next legitimate step is the connected build gate in `docs/operations/CONNECTED-BUILD-GATE.md`; further feature expansion before that gate would violate the Phase-1 scope-control rule.

---

## BUILD 0.22 — RC1 Freeze & Runtime Validation Handoff

### Implemented

- Feature development frozen at the BUILD 0.21 implementation baseline.
- Repository normalized to release candidate version `0.3.0-rc.1`.
- Exact Node.js `24.21.0` pin added via `.nvmrc`, `.node-version`, and `.tool-versions`.
- pnpm remains pinned to `10.15.1` through `packageManager` and toolchain metadata.
- `RELEASE-CANDIDATE.md` and machine-readable `RELEASE-MANIFEST.json` added.
- Full-file SHA-256 manifest generated for the frozen source tree.
- Source placed under Git history and annotated RC tag; portable Git bundle generated.

### Phase 1 steps remaining after RC1

```text
1. Connected build gate        PENDING
2. Connected platform gate     PENDING
3. Staging + production pilot  PENDING
```

The connected platform gate includes live Supabase/PowerSync, security, two-device conflict, and Android PWA validation. The production pilot includes staging deployment first, then controlled real usage.

### RC1 rule

No new feature scope should be added until the connected build/platform gates expose and close real runtime defects.
