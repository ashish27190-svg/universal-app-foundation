# Gate 3 — private Household Vault staging: release checklist

**Status on 10 Oct 2026: blocked on hosted services, not deployed.**

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
| G3.5 Pilot authorization | Demonstrated security and data reliability | Human review of staging evidence and cost/security posture before merging/promoting |

**Release-blocking failures:** cross-workspace read/write, viewer mutation,
audit/ledger partial commit, replay duplication, silent stale overwrite,
offline data loss on reload, accidental public access, missing test account,
inactive PowerSync, or unknown database target.

## What was tightened on the Gate 3 draft branch

- `.github/workflows/staging.yml` is **manual-only**, with `preflight_only`
  as the default. It no longer deploys on every `main` push.
- `scripts/validate-staging-readiness.mjs` rejects other Supabase project IDs,
  mismatched Supabase URLs, non-HTTPS/loopback PowerSync URLs, absent E2E account
  credentials and missing staging deploy prerequisites. It prints missing
  **secret names only**, never credential values. Synthetic self-tests run in PR CI.
- The deploy action requires GitHub's `staging` environment, the expected
  UAF project ID, and an explicit operator-attested Access approval secret.
  An attestation alone is **not** sufficient proof of privacy.
- `scripts/verify-private-staging.mjs` refuses deployment unless an
  unauthenticated request to the **pre-existing** staging Worker URL redirects
  to the Cloudflare Access login. It repeats this check after deployment.
  This check cannot prove protection of alternative domains or policies that
  change later. A Worker-level Access policy still requires human verification.
- Staging Wrangler disables preview URLs; this does not replace Access on the
  regular `workers.dev` and any custom domain.
- `.github/workflows/connected-e2e.yml` now requires actual staging credentials
  and exact project identity. It is manual-only while staging is inactive.
  Without credentials, it **fails**, rather than silently passing zero tests.
- The browser suite adds an offline asset-create, browser-reload, reconnect and
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
   `STAGING_PROTECTED_URL` (the protected `https://uaf-household-vault-staging.<account>.workers.dev/`)
   and `STAGING_PRIVATE_ACCESS_CONFIRMED` with the exact release-approval value
   required by the staging validator. The optional `STAGING_SENTRY_DSN`
   must not enable PII collection.
5. For connected E2E, provide `STAGING_E2E_EMAIL` and
   `STAGING_E2E_PASSWORD` for a dedicated synthetic test account in staging.
   Do not reuse any real personal/business credentials.
6. Run **Deploy Staging (Guarded) → preflight_only** first. Once the
   environment, migration review and private Access policy are verified,
   explicitly run `deploy_private_staging` from the reviewed branch.
7. Run **Connected E2E** and inspect the assertion count, skip count,
   traces, data provenance, anonymous-access denial and project audit evidence.
   No green-only shortcut; manual validation for Android PWA install and
   browser sleep/reconnect also remains mandatory.

A workflow passing the static/preflight gate does **not** imply hosted
readiness. No Supabase restore, migration, Cloudflare release or PowerSync
configuration was performed during this Gate 3 preparation.
