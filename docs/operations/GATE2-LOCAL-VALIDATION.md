# Gate 2 — zero-additional-cost local validation

## Why local?
The existing two Supabase projects support separate business apps. Do not pause, alter, or migrate those databases for UAF. The dedicated `uaf-household-vault-staging` cloud project is currently inactive. This path needs neither a third active Supabase project nor a personal access token.

## Run locally or in Codespaces
Prerequisites: Docker engine accessible, Node 24, pnpm 10.15.1, workspace dependencies installed.

From the repository root, on the `gate2-security-hardening` branch:

```bash
pnpm install --frozen-lockfile
bash scripts/gate2-local-db.sh
```

The script changes into `infrastructure/` because that is where the checked-in `supabase/` project lives. It starts a disposable, local Docker stack, reapplies all checked-in migrations to **the local database only**, and executes `gate2_rls_test.sql` against synthetic User A / User B accounts. It then calls the locally served `sync-apply` and `resolve-conflict` Edge Functions over HTTP using disposable test users and checks JWT rejection, owner/viewer write boundaries, foreign-workspace rejection, idempotency, and conflict resolution. It cannot target a linked remote project: both `db reset` and `test db` explicitly use `--local`.

To stop the local containers without affecting any cloud project:

```bash
cd infrastructure
../node_modules/.bin/supabase stop
```

Do not run `db reset --linked` or `db push` as part of this testing workflow.

## Incremental security fix — atomic `keep_server` (10 Oct 2026)
- The `keep_server_conflict_transaction` RPC is callable by `service_role` only; SQL validates that the Edge Function-provided actor has active owner/admin membership in the affected workspace.
- Conflict row locking, closure, and audit insertion happen inside one PostgreSQL transaction. A failed audit insertion rolls back the closure; concurrent keep-server requests should produce one `resolved` response, then `already_resolved`.
- Local HTTP tests verify one audit for initial closure, none for retries, and one audit across simultaneous closure requests. pgTAP verifies authenticated clients cannot execute the privileged RPC.
- `sync-apply` now stores a SHA-256 fingerprint of the canonical request envelope in the existing mutation ledger and refuses retries that reuse an ID with a different payload, entity, user, or workspace (HTTP 409). Older ledger rows without a fingerprint are treated as unverifiable rather than trusted. Local HTTP tests exercise both valid retries and divergent-ID reuse.
- The previous independent-write warnings for `sync-apply` and `reapply_client` are superseded by the new SQL RPC paths, subject to the validation recorded below. Hosted multi-device validation remains a blocker. Running CI or local tests is necessary but not sufficient to claim production readiness.

## Atomic per-mutation sync candidate (10 Oct 2026)
- `sync-apply` now passes each mutation through one `service_role`-only SQL RPC (`apply_atomic_mutation`), rather than independently committing domain rows, a conflict, a processed-mutation ledger entry, and an audit row. Failed SQL statements roll back that mutation's entire transaction.
- SQL rechecks active owner/admin membership; its allowlist prevents changing immutable fields. The Edge gateway continues using the pure domain validators to produce sanitized fields. Each mutation ID is serialized under a transaction-scoped advisory lock and bound to a canonical request fingerprint, actor, workspace, entity, and operation.
- Local HTTP assertions cover concurrent identical retries, stale revision contenders, asset service cross-workspace references, and lifecycle transitions. Database pgTAP additionally injects an audit failure and asserts business + ledger rollback.
- **Atomicity is per mutation, not per batch.** A response error on later mutations does not undo earlier successfully committed mutations. Clients must replay batches using stable mutation IDs.
- The reapply path now also uses a single database transaction (details below). Hosted Supabase, PowerSync delivery, real offline/browser devices, and deployment are **not** validated by the local suite.
- This is a draft migration, not an instruction to run against any live Supabase database.

## Atomic conflict reapplication (10 Oct 2026)
- `reapply_client` now uses `reapply_conflict_transaction`, a service-role-only PostgreSQL RPC that serializes on the conflict row (including against `keep_server`), rechecks active owner/admin access, locks the current entity, and invokes the reviewed `apply_atomic_mutation` path inside the same transaction.
- The client and reference app now submit `reviewedRevision`, taken from the displayed conflict snapshot. Missing, stale, or mismatched revisions cannot silently overwrite newer server state. If the server revision advanced, the conflict snapshot is refreshed but the user must inspect it again and explicitly resubmit the newer revision.
- A successful reapply commits the entity mutation, its processed-mutation ledger, its mutation audit, conflict closure, and a single conflict-resolution audit together. A failure of the final resolver audit rolls all those effects back.
- Local HTTP assertions include repeated reapply, a viewer's denied reapply, stale server revisions requiring new review, and concurrent `keep_server` versus `reapply_client`. pgTAP injects an audit failure after the nested mutation and verifies that the business row, ledger, audit and conflict closure all roll back.
- Do not merge/deploy based on local passing tests alone. Dedicated hosted staging, JWT/runtime, PowerSync offline persistence, browser refresh/reconnect and two-device convergence must still pass.

## Explicit human review before `reapply_client` (10 Oct 2026)
- Identified a review gap: the reference-app conflict card previously offered a direct reapply button while showing only the asset name. A patch may also overwrite category, notes, dates, price, metadata, or service fields. This is unsafe as a practical review experience even when the SQL revision guard works.
- A reapply must now open a separate confirmation dialog listing **every reapplicable domain field against its server-side value (excluding immutable/server-owned fields)**. Soft-delete and restore show their lifecycle effect even with empty mutation payloads. The reviewed server revision is visible.
- The dialog snapshots the conflict ID, operation, client payload, server payload and server revision. If a PowerSync update changes the conflict while the dialog is open, the confirm action disables and the user must review again. The server RPC still performs the final revision check transactionally.
- Pure unit tests cover changed payloads, changed server snapshots, lifecycle review and unsupported/empty updates. The connected conflict Playwright journey now opens the review dialog and verifies both versions are visible; it has **not** run against hosted services.
- Local authenticated Edge tests also exercise reapplying a conflicting **delete and restore** and retry safety, in addition to reapplying update mutations. Keep local database test results and hosted E2E evidence separate.

## Claims and limitations
- A green result would prove reproducible local migrations and the pgTAP assertions for workspace selection, role-based write helper, browser write denial, private mutation ledger, and RPC bootstrap idempotence.
- Once green, it proves the **local** Edge Function HTTP implementation alongside the database access rules. It **does not** prove hosted Edge deployment, PowerSync stream delivery, offline persistence across browser restarts, two-device convergence, or staging deployment.
- Local tests exercise concurrency, rejected-write/audit integrity, and stale-revision reapplication; hosted JWT/runtime compatibility, failure recovery outside the disposable environment, and real PowerSync convergence still require connected validation.
- The existing BUILD 0.4 / 0.17 SQL checklist files are operator guidance, not executable TAP assertions. The local runner specifies only `tests/database/gate2_rls_test.sql`.
- Any Codespaces usage remains subject to your GitHub/Codespaces plan's included compute quota. The workflow creates no *additional hosted Supabase project*.
