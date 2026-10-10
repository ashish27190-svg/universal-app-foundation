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
- This **does not** make `reapply_client` or `sync-apply` transactional. Two concurrent sync requests can still race before a ledger row exists, and an entity write can still commit separately from its audit/ledger entries. These remain release blockers. Running CI or local tests is necessary but not sufficient to claim staging or production readiness.

## Claims and limitations
- A green result would prove reproducible local migrations and the pgTAP assertions for workspace selection, role-based write helper, browser write denial, private mutation ledger, and RPC bootstrap idempotence.
- Once green, it proves the **local** Edge Function HTTP implementation alongside the database access rules. It **does not** prove hosted Edge deployment, PowerSync stream delivery, offline persistence across browser restarts, two-device convergence, or staging deployment.
- The two Gate-2 Edge Functions on PR #5 must still pass deeper checks for true concurrent idempotency races, rejected-write audit consistency, stale-revision reapplication, and hosted JWT/runtime compatibility.
- The existing BUILD 0.4 / 0.17 SQL checklist files are operator guidance, not executable TAP assertions. The local runner specifies only `tests/database/gate2_rls_test.sql`.
- Any Codespaces usage remains subject to your GitHub/Codespaces plan's included compute quota. The workflow creates no *additional hosted Supabase project*.
