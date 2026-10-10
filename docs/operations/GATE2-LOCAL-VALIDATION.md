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

The script changes into `infrastructure/` because that is where the checked-in `supabase/` project lives. It starts a disposable, local Docker stack, reapplies all three migrations to **the local database only**, and executes `gate2_rls_test.sql` against synthetic User A / User B accounts. It cannot target a linked remote project: both `db reset` and `test db` explicitly use `--local`.

To stop the local containers without affecting any cloud project:

```bash
cd infrastructure
../node_modules/.bin/supabase stop
```

Do not run `db reset --linked` or `db push` as part of this testing workflow.

## Claims and limitations
- A green result would prove reproducible local migrations and the pgTAP assertions for workspace selection, role-based write helper, browser write denial, private mutation ledger, and RPC bootstrap idempotence.
- It **does not** prove the deployed Edge Function runtime, actual upload authorization, PowerSync stream delivery, offline persistence across browser restarts, two-device convergence, or staging deployment.
- The two Gate-2 Edge Functions on PR #5 must still pass connected tests: foreign-workspace writes, viewer writes, conflict replay, JWT rejection, idempotency races and audit consistency.
- The existing BUILD 0.4 / 0.17 SQL checklist files are operator guidance, not executable TAP assertions. The local runner specifies only `tests/database/gate2_rls_test.sql`.
- Any Codespaces usage remains subject to your GitHub/Codespaces plan's included compute quota. The workflow creates no *additional hosted Supabase project*.
