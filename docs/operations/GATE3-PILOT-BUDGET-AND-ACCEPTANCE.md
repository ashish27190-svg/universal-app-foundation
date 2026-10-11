# Gate 3 pilot — verified budget and single-batch acceptance

**Reviewed:** 11 October 2026. **Status:** planning only, NOT authorization to
activate, subscribe, migrate, connect or publish anything. Dedicated staging
project: `uaf-household-vault-staging` (`vdhfayratdsoexltyrku`).

## Verified account facts (read-only)

- The Supabase organization `ashish27190-svg's Org` reports plan
  **Free**. The account currently has TWO active projects, and the
  dedicated UAF project is **INACTIVE**. Leave both unrelated projects
  untouched; do not pause either to make room for UAF.
- Supabase advertises **2 active Free projects**. The account is at
  that limit; restoring UAF on the same Free organization may require
  a paid upgrade. Actual project eligibility must be confirmed before
  any action. Ref: https://supabase.com/pricing
- **PowerSync Cloud Free** advertises $0/month, up to **2 GB synced/month**,
  **500 MB hosted**, **50 peak concurrent connections** and **2 service
  instances** (with deactivation after a week of inactivity).
  Use one isolated instance and synthetic data if capacity/eligibility
  allow. Ref: https://powersync.com/pricing
- **Cloudflare Access Free** advertises $0 for fewer than 50 users.
  Workers has a Free tier subject to request limits; the Paid Workers
  plan starts at $5/month. Confirm that the chosen deployment does
  not force a paid plan and that Access applies to ALL Worker paths.
  Refs: https://www.cloudflare.com/plans/zero-trust-services/
  and https://developers.cloudflare.com/workers/platform/pricing/

## Budget scenarios — estimates, not a quote or permission

| Scenario | Supabase | PowerSync | Cloudflare | Decision |
| --- | --- | --- | --- | --- |
| Keep UAF inactive | $0 incremental | None required | None required | Current state |
| Restore UAF on same Free org with both unrelated projects still active | Third active Free project exceeds advertised 2-project limit | Free possibly eligible | Free possibly eligible | **Do not assume allowed** |
| Upgrade existing one-org account to Supabase Pro, all THREE projects Micro | Pro $25/month + 3 × $10/month compute − $10/month credit ≈ **$45/month total organization bill before overages** | Free tier target: $0 | Free tiers target: $0 | Requires exact bill and explicit approval |
| Additional paid hosting/features | Usage dependent | Pro starts $49/month | Workers Paid starts $5/month | **Not authorized** |

Supabase computation above is an **illustrative conditional estimate**, not
the user's exact invoice. Existing project sizes, plan switch effects,
billing currency/taxes, organization scope, any unused credits, disk and
traffic costs must be reviewed in the actual billing UI first. One-day
tests do not guarantee avoidance of the monthly Pro subscription.
Ref: https://supabase.com/pricing and
https://supabase.com/docs/guides/platform/manage-your-usage/compute

**Spending principle:** Try a small, isolated pilot with free PowerSync
and Cloudflare tiers; do NOT subsidize it by pausing/replacing another
business or personal database. If the paid Supabase upgrade is necessary,
present the exact expected recurring charge and teardown/restore policy
for separate human approval before any change.

## One batch after approved staging budget (requires separate authorization)

1. Verify UAF project ref and current billing, and obtain a specific
   monthly spending limit/approval. Check that the other two project
   IDs are NOT targeted.
2. Restore ONLY the dedicated UAF staging project after separate cost
   approval. Verify it is healthy. On the guarded draft candidate, run
   `plan_migrations` using the protected GitHub `staging` environment;
   it validates the UAF project, emits the migration file-set SHA-256,
   and previews pending remote migrations with `--dry-run`. A reviewer
   must inspect the actual SQL, target project, pending migration list,
   environment restrictions and exact candidate commit before approving
   any subsequent write. Planning does **not** apply migrations.
3. Configure a segregated PowerSync instance with **Sync Streams** and
   the repository's `infrastructure/powersync/sync-config.yaml`.
   Use only the UAF Postgres database and distinct test credentials.
   Verify that the Free plan supports this setup; otherwise stop.
4. Prepare Cloudflare Access before publish with narrow allow-list
   and deny-by-default. Review Worker-level hostname/preview/custom-domain
   coverage. Do not deploy until anonymous route probes prove challenge.
5. Enter environment secrets only into the reviewed protected staging
   environment; use two SYNTHETIC test users and no production credentials.
6. Run reviewed `preflight_only`, then the approved
   `plan_migrations` job after the isolated staging project is funded
   and available. Only after someone has reviewed the plan and separately
   authorized deployment should the protected `deploy_private_staging`
   job be dispatched with the exact `reviewed_migrations_sha256` copied
   from the approved plan. The digest is rechecked before the database
   write and fails closed on missing or changed files. It is not proof
   of a human review or a guarantee that the remote migration history
   remained unchanged; compare the immediate deploy dry-run too.
7. Require ALL nine real browser tests (zero skips, zero flakiness).
   Verify auth changes, offline reload/no-reload, tab lock, conflict,
   CRUD, and two-account data isolation.
8. Separately test the ACTUAL SSO-protected Worker URL in a real
   browser (including mobile PWA if in pilot scope). Localhost E2E
   is NOT proof of hosted Cloudflare Access protection.
9. Sign off each evidence item, record billed services, and keep the
   release gated until no P0 blockers remain. No production promotion
   or merge of PR #5 is authorized by the staging test approval.

## Current unblocked evidence

- Exact-head full CI and disposable local Supabase tests passed on
  `4fac01de`. More recent changes must independently pass.
- A real **hermetic Chromium smoke** workflow now tests pre-auth SQLite
  Web Lock behavior using only synthetic public URLs and a production
  build. This proves only the tested Chromium/browser conditions, not
  authenticated sync, private hosting or general mobile browser support.
- CI additionally discovers the connected Playwright test list,
  but the nine credentialed connected journeys remain **unrun**.

**No-go:** wrong project ref; unapproved new recurring charge; protected
Worker unavailable; Access bypass/public asset; Sync Streams leak; any
unsynced write loss; skipped/flaky E2E; or changed user/workspace permitted
to upload another account's cached queue.
