# Gate 3 — authorization and evidence decision

**Release target:** UAF Household Vault only. **As of 11 October 2026**:
Gate 2/3 application changes remain on draft PR #5. The dedicated staging
Supabase project `vdhfayratdsoexltyrku` was observed **INACTIVE**.
Only the approved production **workflow kill switch** (PR #7) changed on
`main`; no production service or database was deployed or mutated.

## Consolidated release blockers — 11 October 2026

- **Local SQL hardening:** `reapply_conflict_transaction` now holds active
  writer-membership and workspace SHARE locks during the replay transaction,
  consistent with `keep_server_conflict_transaction`. Seven pgTAP checks
  cover archived workspace and revoked-writer denial, restoration, and no
  unintended audit events. The extended suite targets **59 assertions**; never
  report a new commit as passed before its exact-head CI completes.
- **Workspace least privilege:** an additive migration updates
  `can_write_workspace` to deny archived-workspace writes and replaces
  authenticated table-wide `workspaces` UPDATE with column grants for
  `name` and `status` only. Immutable creator, type, and timestamps
  remain server-controlled. Eleven new pgTAP checks bring the disposable
  suite to **59 assertions**. All 59 passed at reviewed candidate
  `b7791d0a`; any subsequent draft change requires its own CI verification. This does NOT grant users authorization
  to delete or transfer a workspace.
- **Production freeze now active:** independently approved
  [PR #7](https://github.com/ashish27190-svg/universal-app-foundation/pull/7)
  was squash-merged to `main` as `4e673500`. A read-only check confirmed
  the production workflow contains `PRODUCTION_RELEASE_BLOCKED`, has no
  secret references or deploy commands, and is intentionally non-operational.
  Draft [PR #5](https://github.com/ashish27190-svg/universal-app-foundation/pull/5)
  remains unmerged; `main` staging automation is also inert.
- **Hosted dispatch protection added (draft only):** Both protected staging
  migration-planning and deploy jobs now require a manual run on the exact
  `main` ref with GitHub's `GITHUB_REF_PROTECTED=true`. An executable
  pre-remote-access gate verifies the repository identity, branch, protection
  signal and manual event; 11 synthetic rejection cases run in CI. This
  does not prove environment reviewers are configured or grant deployment
  permission. Use
  [Gate 3 GitHub reviewer setup](./GATE3-GITHUB-REVIEWER-SETUP.md)
  for exact manual configuration and screenshot evidence.

- **Reviewer controls unverified:** GitHub reports no repository rulesets,
  while a read-only attempt to inspect `main` branch protection returned
  HTTP 403 and the environment protection endpoint was unavailable through
  the connector. This is NOT proof that branch or environment reviewers
  are configured. Confirm directly in GitHub repository Settings before
  authorizing any migration plan or hosted deployment.
- **No hosted proof:** Staging Supabase remains intentionally inactive,
  and the nine connected browser journeys, private Cloudflare Worker Access,
  hosted offline/PWA evidence and production release approval remain open.

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
  external Cloudflare Access verification, protected environment review,
  BOTH `reviewed_migrations_sha256` AND `reviewed_candidate_sha` inputs
  copied from the SAME approved plan run. The latter binds all application,
  Edge Function, workflow and static asset source to the reviewed Git commit,
  closing the gap in which unchanged SQL but unreviewed code might deploy. The job verifies this
  digest before any remote link and immediately before applying migrations.
  Missing or changed files fail closed.

**Manual workflow limitation:** GitHub documents that the
`workflow_dispatch` event requires the workflow to be present on the
default branch. The current default-branch workflow is deliberately an
inert kill switch; the guarded `preflight_only`, `plan_migrations` and
`deploy_private_staging` options exist only in draft PR #5. Do not assume
a user can run its guarded choices directly from a PR branch. Activating
a guarded workflow on `main` requires a SEPARATE reviewed merge/release
decision; running local PR tests is not a workaround for hosted approval.
Official reference:
https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow

**GitHub approval-settings checklist:** inspect repository
Settings → Environments → staging and production. Check named required
reviewers (prefer disallowing self-approval), deployment branch rules and
bypass settings; then verify Settings → Rules → Rulesets or Branches for
`main` PR+status-check protection. GitHub docs warn that choosing
"protected branches only" when NO branch protection exists may still
permit all branches. Our connector cannot verify those settings.
References: https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments
and https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches

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

## Current approval packet — verified 11 October 2026

**Decision: NO-GO on hosted activation or release until the items below are
explicitly approved.** Read-only Supabase account check: the organization is
Free, `uaf-household-vault-staging` (`vdhfayratdsoexltyrku`) is INACTIVE,
and two unrelated projects are ACTIVE_HEALTHY. Do not restart staging, upgrade
billing, or pause either unrelated project based only on "next"/"go".

The final human approval must specify:

1. **Cost scope:** the dedicated UAF staging project alone, the proposed plan,
   an exact recurring/maximum spend, region, owner, and stop/teardown decision.
   Free eligibility is not assumed; confirm billing before signing.
2. **Data scope:** new isolated UAF schema, dedicated PowerSync staging service,
   narrowly scoped replication and two synthetic users. NO personal-money
   or unrelated-business database changes, NO real user records.
3. **Privacy scope:** GitHub `staging` required reviewers and branch restrictions
   verified in repository settings; Worker-level Cloudflare Access allow-list,
   `workers.dev`, any preview/custom domains, and anonymous static assets.
   The Access/bootstrap and prepublish challenge sequence must be demonstrated:
   an unconfigured or nonexistent Worker is NOT proof of private protection.
4. **Migration scope:** the intended commit, protected `plan_migrations` output,
   all SQL changes and file-set digest reviewed **before a second dispatch**
   including the digest. The local digest does not attest remote migration
   history, so check the fresh deploy dry-run too.
5. **Acceptance:** nine first-attempt connected localhost browser journeys,
   plus separate real SSO-protected hosted Worker/PWA validation, role changes,
   offline queue and account isolation. Any failed/skipped/flaky case is NO-GO.

**Repository/source visibility:** GitHub reports this repository is PUBLIC.
This is distinct from a private website. Treat all tracked code and documents
as public, never commit credentials or proprietary customer data; choose
private repository visibility only through a separate explicit decision.

**Production freeze already on `main`:** PR #7 was separately authorized
and merged. The draft PR #5 carries the identical fail-closed production
workflow file; the file content is equal across `main` and the draft.
No actual production deployment is authorized. A future production-release
workflow requires its own separate architecture/security review, rollback,
hosted evidence and explicit approval.

### Hosted pilot authorizations are not yet granted

The planned sequence is: approve isolated cost and project access → verify
GitHub environment restrictions → restore ONLY UAF staging → configure
private Cloudflare/PowerSync safely → run protected migration plan for review
→ approve exact staged deployment and digest → apply/verify staging only →
run connected and hosted acceptance → independent release decision.
Nothing in this document grants execution permission.

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
