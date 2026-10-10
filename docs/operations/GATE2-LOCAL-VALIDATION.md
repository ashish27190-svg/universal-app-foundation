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

The script changes into `infrastructure/` because that is where the checked-in `supabase/` project lives. It starts a disposable, local Docker stack, reapplies all three migrations to **the local database only**, and executes `gate2_rls_test.sql` against synthetic User A / User B accounts. It then calls the locally served `sync-apply` and `resolve-conflict` Edge Functions over HTTP using disposable test users and checks JWT rejection, owner/viewer write boundaries, foreign-workspace rejection, idempotency, and conflict resolution. It cannot target a linked remote project: both `db reset` and `test db` explicitly use `--local`.

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
- The legacy retry/atomicity warning for `sync-apply` is superseded by the candidate SQL RPC above, contingent on passing all new local tests; `reapply_client` and hosted multi-device validation remain blockers. Running CI or local tests is necessary but not sufficient to claim production readiness.

## Atomic per-mutation sync candidate (10 Oct 2026)
- `sync-apply` now passes each mutation through one `service_role`-only SQL RPC (`apply_atomic_mutation`), rather than independently committing domain rows, a conflict, a processed-mutation ledger entry, and an audit row. Failed SQL statements roll back that mutation's entire transaction.
- SQL rechecks active owner/admin membership; its allowlist prevents changing immutable fields. The Edge gateway continues using the pure domain validators to produce sanitized fields. Each mutation ID is serialized under a transaction-scoped advisory lock and bound to a canonical request fingerprint, actor, workspace, entity, and operation.
- Local HTTP assertions cover concurrent identical retries, stale revision contenders, asset service cross-workspace references, and lifecycle transitions. Database pgTAP additionally injects an audit failure and asserts business + ledger rollback.
- **Atomicity is per mutation, not per batch.** A response error on later mutations does not undo earlier successfully committed mutations. Clients must replay batches using stable mutation IDs.
- The existing `reapply_client` resolution path still performs separate writes and remains a release blocker. Hosted Supabase, PowerSync delivery, real offline/browser devices, and deployment are **not** validated by the local suite.
- This is a draft migration, not an instruction to run against any live Supabase database.

## Claims and limitations
- A green result would prove reproducible local migrations and the pgTAP assertions for workspace selection, role-based write helper, browser write denial, private mutation ledger, and RPC bootstrap idempotence.
- Once green, it proves the **local** Edge Function HTTP implementation alongside the database access rules. It **does not** prove hosted Edge deployment, PowerSync stream delivery, offline persistence across browser restarts, two-device convergence, or staging deployment.
- The two Gate-2 Edge Functions on PR #5 must still pass deeper checks for true concurrent idempotency races, rejected-write audit consistency, stale-revision reapplication, and hosted JWT/runtime compatibility.
- The existing BUILD 0.4 / 0.17 SQL checklist files are operator guidance, not executable TAP assertions. The local runner specifies only `tests/database/gate2_rls_test.sql`.
- Any Codespaces usage remains subject to your GitHub/Codespaces plan's included compute quota. The workflow creates no *additional hosted Supabase project*.
