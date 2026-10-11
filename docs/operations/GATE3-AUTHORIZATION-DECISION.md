# Gate 3 — authorization and evidence decision

**Release target:** UAF Household Vault only. **As of 11 October 2026**:
code changes are on draft PR #5; the dedicated staging Supabase project
`vdhfayratdsoexltyrku` was observed **INACTIVE**. Production is unchanged.

## Decision 0 — safe without activating hosted services

The manual **Deploy Staging (Guarded)** workflow offers a
`preflight_only` action. It checks the candidate's static environment
validators (synthetic), mandatory browser-evidence checker, Playwright
test discovery, lint, type-checks, unit tests and production PWA build.
It **does not** link Supabase, run migrations, configure PowerSync,
publish a Worker, touch production, or prove the site is SSO protected.

Status: PR #6 was explicitly approved and merged to `main` as
`9fb6ad38` on 11 October 2026. Read-only verification confirmed that
the legacy push-to-main staging deploy and weekly connected-E2E
schedule were removed. The default branch now contains **inert, fail-closed
manual kill switches** (not a preflight job). Its CI passed.
Draft PR #5 was reconciled with this change using a two-parent merge commit;
the guarded `preflight_only` workflow remains on its own draft branch,
which has not been merged. This prevents the old automation from silently
reactivating, but the default-branch manual action must NOT be mistaken for
`preflight_only`: it deliberately fails. Running a guarded branch-specific
preflight remains separate work. PR CI/disposable tests are still not
hosted browser or Cloudflare Access proof.

## Migration review split — fail closed before a hosted write

Draft PR #5 now defines three manual choices. They are **not** active on
`main`, whose staging workflow is still the approved inert kill switch.

- `preflight_only`: synthetic and local validation only. No hosted connection.
- `plan_migrations`: **only after separate permission to access an isolated
  active UAF staging database**, uses the protected `staging` GitHub environment,
  confirms the exact project identity, prints the source migration-set SHA-256
  and runs `supabase db push --linked --dry-run` without applying migrations.
  It does not deploy Edge Functions or publish a Worker. GitHub reviewers must
  examine the actual remote pending-migration output and all migration SQL.
- `deploy_private_staging`: requires a separately authorized deployment,
  external Cloudflare Access verification, protected environment review and
  a nonempty `reviewed_migrations_sha256` dispatch input copied from the
  previously reviewed plan for the exact source tree. The job verifies this
  digest before any remote link and immediately before applying migrations.
  Missing or changed files fail closed.

**Important limits:** the SHA-256 binds approved *local migration file bytes*
to the dispatched commit; it does NOT authenticate the reviewer, prove that
the remote migration history is unchanged, prove the remote dry-run was
read, or provide hosted privacy evidence. Those remain independent human
checks and release blockers. GitHub environment approval settings cannot be
assumed to be enabled just because the workflow specifies `environment: staging`;
confirm configured required reviewers and deployment branch protections
before running a hosted action. A first-ever private Worker publication may
need its own independent Cloudflare Access bootstrap/policy verification plan;
do not bypass the prepublish challenge check to force deployment.

## Decision 1 — financial and security approval required

Before any hosted work, obtain explicit approval **specific to UAF** for:
1. reactivating **only** `uaf-household-vault-staging` and its possible
   billing, with a stated budget or spend cap;
2. provisioning/configuring **a distinct staging PowerSync**, with cost,
   replication scope and endpoint reviewed (no production/business data);
3. creating and verifying **Worker-level Cloudflare Access with a narrow
   allow-list**, including the main `workers.dev` hostname, preview
   destinations and any alternate routes; no public testing endpoint;
4. applying the **reviewed** staging migrations, deploying both Edge
   Functions and the staging Worker through the protected GitHub
   `staging` environment after the Access pre-deployment challenge check.

A previous authorization for a different project or preview is not
authorization for this UAF staging stack. `next` or `go` alone does
not establish acceptance of new recurring charges or a specific deployment.

## Gate 3 pass/fail evidence

| Order | Validation | Required proof |
| --- | --- | --- |
| 1 | GitHub candidate | Full CI and disposable local Supabase green on the exact SHA |
| 2 | Isolated infrastructure | Approved staging ref healthy; dedicated PowerSync origin; no production database; two synthetic distinct users |
| 3 | Private website | Worker-level Access policy reviewed; anonymous root, manifest, icon and unknown path challenged **before** publish |
| 4 | Staging deployment | Separate protected dry-run review and source SHA-256; approved manual deploy; staged functions; exact approved Worker hostname; same privacy checks **after** publish |
| 5 | Connected backend/browser | Playwright JSON evidence from localhost preview with all **nine required** journeys passing, zero skipped, zero flaky, zero unexpected |
| 6 | Actual hosted Worker | Real browser visits exact SSO-protected Worker, authenticates via Access, verifies navigation, PWA installation, offline reload, reconnect and session expiry |
| 7 | Release decision | Human approval after role revocation, offline queue, cross-account and Access evidence; keep PR draft until all blockers clear |

**Do not substitute gate 5 for gate 6.** The CI localhost preview can
use real Supabase and PowerSync staging endpoints, but does not exercise
Cloudflare's Worker or user SSO session. Workflows must not be represented
as hosted acceptance proof when they have not run.

## No-go and rollback

A failed authorization/owner verification, skipped browser test,
wrong project ref, unprotected static asset, public preview route,
unavailable replication, or unsynced-write loss is a release **NO-GO**.
Keep production unchanged, keep draft PR open, and retain the isolated
staging project as paused when not in use. Staging configuration changes
and financial liabilities should not start without a reviewed cost and
rollback/teardown plan; never delete queued local data to force a green
result.

## Current permitted next step

The legacy auto-deployment kill switch is now merged and independently
verified. Next validate the **guarded branch-specific** `preflight_only` on
`gate2-security-hardening` (if workflow dispatch supports that selected
ref; otherwise rely on PR CI and the preflight tests). Do **not** launch
the default-branch kill-switch workflow expecting validation, and do
not choose `deploy_private_staging`. Obtain a separate itemized approval
for all billable staging and Cloudflare/PowerSync configuration before
activating hosted services.
