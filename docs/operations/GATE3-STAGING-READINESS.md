# Gate 3 — private Household Vault staging: release checklist

**Status on 10 Oct 2026: blocked on hosted services, not deployed.**
The prior final branch at `e444597e` passed both standard CI and disposable local
Supabase; subsequent changes are validated independently on their latest commit.

Scope: only the existing dedicated `uaf-household-vault-staging` Supabase
project, ref `vdhfayratdsoexltyrku`. It was **INACTIVE** at the latest
read-only project inspection. This document authorizes no migration, restore,
billing change, public website, or production release.

## Release decisions and acceptance

| Gate | Objective | Evidence required |
| --- | --- | --- |
| G3.0 Source and isolated local database | No syntax, type, local RLS or transaction regressions | CI and Gate 2 local Supabase both green on identical commit |
| G3.1 Dedicated hosted staging | UAF Supabase project healthy; no business database touched | Explicit staging project ref/status; migrations, Edge Functions and two-user auth against staging only |
| G3.2 PowerSync staging | Authenticated Sync Streams scoped to workspace | Staging PowerSync instance, stream config review, propagation to/from Postgres, revocation tests |
| G3.3 Private hosting | Public traffic cannot see staging app | Worker-level Cloudflare Access policy covering all URLs, no bypass; unauthenticated `workers.dev` request redirects to Access before AND after publish |
| G3.4 Connected browser reliability | Real browser SQLite, offline edit, reload, reconnect, two-device convergence and stale-conflict review work | Connected Playwright success, no skipped scenarios, fresh identity/data state |
| G3.4a Same-device account isolation | Account A and B never inherit each other's persisted SQLite, and an offline queue cannot be reassigned to another user | Unit ownership tests and same-browser A→B→A staging Playwright evidence |
| G3.5 Pilot authorization | Demonstrated security and data reliability | Human review of staging evidence and cost/security posture before merging/promoting |

**Release-blocking failures:** cross-workspace read/write, viewer mutation,
audit/ledger partial commit, replay duplication, silent stale overwrite,
offline data loss on reload, accidental public access, missing test account,
inactive PowerSync, unguarded cross-account local cache reuse, loss of offline
pending mutations on account change, or unknown database target.

## What was tightened on the Gate 3 draft branch

- `.github/workflows/staging.yml` is **manual-only**, with `preflight_only`
  as the default. It no longer deploys on every `main` push.
- `scripts/validate-staging-readiness.mjs` rejects other Supabase project IDs,
  mismatched Supabase URLs, leaked service-role browser keys, unapproved PowerSync origins,
  non-HTTPS/loopback PowerSync URLs, absent E2E account
  credentials and missing staging deploy prerequisites. It prints missing
  **secret names only**, never credential values. Synthetic self-tests run in PR CI.
- The deploy action requires GitHub's `staging` environment, the expected
  UAF project ID, and an explicit operator-attested Access approval secret.
  An attestation alone is **not** sufficient proof of privacy.
- `scripts/verify-private-staging.mjs` refuses deployment unless an
  unauthenticated request to the **pre-existing** staging Worker URL redirects
  to the Cloudflare Access login. Its URL and challenge checks are covered by
  18 synthetic positive/negative assertions in CI. It checks the Worker root,
  manifest, icon and an unknown path against the exact approved Access team,
  before and after deployment.
  This check cannot prove protection of alternative domains or policies that
  change later. A Worker-level Access policy still requires human verification.
- Staging Wrangler disables preview URLs; this does not replace Access on the
  regular `workers.dev` and any custom domain.
- `.github/workflows/connected-e2e.yml` now requires actual staging credentials
  and exact project identity. It is manual-only while staging is inactive.
  Without credentials for **two distinct synthetic accounts**, it **fails**, rather than silently passing zero tests.
- The Supabase CLI in the protected deployment job now explicitly uses
  `--workdir infrastructure`, where the actual config/migrations/functions live,
  and prints a migration **dry-run** before the approved staging push. No
  migrations were run on a hosted database during this preparation.
- The reference app's persistent PowerSync SQLite uses one fixed filename.
  A new per-device owner marker now binds its contents to the last authenticated
  user. Before changing identity, it checks for queued mutations: if pending
  writes exist, the new account is **blocked**, not given the previous user's
  cache or mutation queue. If no pending writes exist, the previous cache is
  cleared before a new identity attaches. Standard logout also refuses to erase
  unsynced writes. An external auth-loss event disconnects but preserves queued
  data, so signing back into the original account can resume upload. Unit tests
  cover clearing, account transitions, recovery, missing marker and failure cases.
- A specific blocked-switch error gives the user an explicit route back to
  sign-in without bypassing the pending-write cleanup rule. This is NOT an
  encryption-at-rest or malicious-device-user security guarantee. Multi-tab
  concurrent account switching remains a hosted acceptance/risk check.
- A new connected browser journey switches A→B→A **in the same browser profile**
  after each account's changes have synced. It verifies that cached records
  cannot appear in the other account. Not yet run on hosted PowerSync.
- The browser suite includes two separate-account isolation checks, in addition
  to offline asset-create, browser-reload, reconnect and
  fresh-browser convergence journey. It **has not been executed** against hosted
  PowerSync or a real private staging deployment.

## Steps to enable the connected release gate

1. Review potential charges and re-activate **only** the named UAF staging
   Supabase project. Do not touch other projects. Confirm it reports healthy.
2. Prepare a separate staging PowerSync instance and configure workspace-scoped
   streams from `infrastructure/powersync/sync-config.yaml`; use dedicated
   staging connection credentials and no business-production connection.
3. In Cloudflare Zero Trust, protect the **entire**
   `uaf-household-vault-staging` Worker (production + preview destinations)
   with an allow-list policy. Verify there is no broad bypass policy and no
   alternate public URL. The Worker and Access application must already
   exist before the guarded deploy workflow can be used.
4. In GitHub `staging` Environment set only the staging secrets:
   `STAGING_SUPABASE_PROJECT_REF`, `STAGING_SUPABASE_URL`,
   `STAGING_SUPABASE_PUBLISHABLE_KEY`, `STAGING_SUPABASE_DB_PASSWORD`,
   `STAGING_POWERSYNC_URL`, `SUPABASE_ACCESS_TOKEN`,
   `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`,
   `STAGING_PROTECTED_URL` (the protected `https://uaf-household-vault-staging.<account>.workers.dev/`),
   `STAGING_WORKERS_SUBDOMAIN` (the exact `<account>` DNS label),
   `STAGING_ACCESS_TEAM_DOMAIN` (the approved `<team>.cloudflareaccess.com`),
   `STAGING_POWERSYNC_APPROVED_ORIGIN` (the separately verified HTTPS PowerSync origin),
   and `STAGING_PRIVATE_ACCESS_CONFIRMED` with the exact release-approval value
   required by the staging validator. The optional `STAGING_SENTRY_DSN`
   must not enable PII collection.
5. For connected E2E, provide `STAGING_E2E_EMAIL`,
   `STAGING_E2E_PASSWORD`, `STAGING_E2E_SECOND_EMAIL` and
   `STAGING_E2E_SECOND_PASSWORD` for **two distinct synthetic accounts**,
   each with its own personal workspace. Do not reuse real personal/business
   credentials. Fresh browser contexts must receive only their own records.
   Direct hosted RLS/role-revocation testing remains a separate gate.
6. Run **Deploy Staging (Guarded) → preflight_only** first. Once the
   environment, migration review and private Access policy are verified,
   explicitly run `deploy_private_staging` from the reviewed branch.
7. Run **Connected E2E** and inspect the assertion count, skip count,
   traces, data provenance, anonymous-access denial and project audit evidence.
   No green-only shortcut; manual validation for Android PWA install and
   browser sleep/reconnect also remains mandatory.

The Access redirect checks only confirm that the checked paths challenge
an anonymous visitor at the expected Access tenant. They do **not** prove that
the Access policy's allow-list is narrow, that no bypass policy exists, or that
unlisted alternate domains are protected. Use Cloudflare's **Worker-level
Access** policy (All traffic) rather than only a hostname/path Access rule;
independently verify the destination, allow-list, bypass policies and preview
configuration before enabling deployment.

A workflow passing the static/preflight gate does **not** imply hosted
readiness. No Supabase restore, migration, Cloudflare release or PowerSync
configuration was performed during this Gate 3 preparation.
