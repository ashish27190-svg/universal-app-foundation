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

Status: the same major checks are already enforced in PR CI.
**Critical default-branch caveat:** `main` still contains the OLD
`Deploy Staging` workflow, whose `push: [main]` trigger can run staging
migrations, Edge Functions and Cloudflare deploy **automatically**, and
whose manual dispatch has no `preflight_only` input. The default branch
also retains a scheduled connected-E2E workflow. The hardened
`preflight_only` variant is available only in this draft PR branch.
**Do not dispatch `Deploy Staging` from the current default-branch Actions
UI or merge PR #5** based on an assumption that the guarded preflight is
already the default. A specific approval is needed to apply a minimal
protective workflow-only change on `main`, or the default branch must be
otherwise secured and independently verified. No such change has been
made. Until then, rely only on already-running PR CI/disposable tests.
Actual execution of manual `preflight_only` on the chosen head is
pending; do not claim it was run.

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
| 4 | Staging deployment | Protected manual job; reviewed migrations; staged functions; exact approved Worker hostname; same privacy checks **after** publish |
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

**Do not click the existing default-branch Deploy Staging workflow.**
First obtain approval for a **workflow-only, no-deploy guard change** that
removes its automatic `main` push deploy and eliminates default-branch
scheduled connected E2E (or prove equivalent protections). Review the
proposed change without running any hosted job. Only then run the guarded
`preflight_only` workflow on its reviewed head, and separately approve an
itemized staging cost/security proposal before activating hosted services.
