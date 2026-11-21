# PR #5 integration and review plan — 12 October 2026

**State:** analysis and source-only plan. NOT authorization to merge, enable staging,
purchase a plan, deploy Workers or apply hosted SQL. Parent:
[draft PR #5](https://github.com/ashish27190-svg/universal-app-foundation/pull/5). Master:
[Gate 3 issue #8](https://github.com/ashish27190-svg/universal-app-foundation/issues/8). Finish-first:
[issue #11](https://github.com/ashish27190-svg/universal-app-foundation/issues/11).

## Immediate release safety

- Explicitly approved [PR #7](https://github.com/ashish27190-svg/universal-app-foundation/pull/7) is MERGED
  into `main`: default-branch production GitHub Actions workflow fails closed.
- Explicitly approved [PR #10](https://github.com/ashish27190-svg/universal-app-foundation/pull/10) is MERGED
  into `main`: direct root `pnpm deploy:staging` and
  `pnpm deploy:production` scripts fail closed.
- This PR #5 branch has **ported the exact root commands and safety guard**
  from PR #10 and added the same negative tests to its more extensive CI.
  All safety parity checks passed at source review; exact-head CI must pass
  independently. Do not allow a future integration to restore deploy aliases.
- Cloudflare credentials and manual third-party CLI invocations are
  separately controlled. Package script guards do NOT stop those actions.
- Production workflow is byte-for-byte identical to `main`. Its inclusion
  in the large draft diff is historical, not a newly proposed activation.

## Why one giant merge is a poor release plan

The draft has over **220 commits** and approximately **70 affected paths**.
It spans database authentication and sync transactions, offline PWA lifetime
semantics, browser security, and GitHub release automation. Even fully green
local CI is insufficient to prove those combined behaviors against real
PowerSync, private Cloudflare Access, two staging users and devices.
Following source-level reconciliation with PR #10 and relocation of
CI-only synthetic checks to avoid overlapping Git merge hunks, GitHub
reported `mergeable=true`. This is **NOT** approval to merge, evidence
that hosted gates passed, or a substitute for fresh exact-head CI.
Do not force-merge, rewrite protected main, or drop safeguards.

## Proposed review slices (dependency order; review only until approved)

| Slice | Files / boundary | Evidence and decision | Hosted effects allowed |
| --- | --- | --- | --- |
| A. Build + release invariants | `.github/workflows/ci.yml`, safe scripts, local-only CI and test config | Fresh CI, all negative deploy tests and source/diff review | **None** |
| B. Tenant/server correctness | Forward Supabase migrations, `sync-apply`, `resolve-conflict`, transaction and pgTAP tests | Fresh disposable migration replay; RLS, role revocation, 81 pgTAP assertions and 83 local HTTP cases | **None** |
| C. Browser offline safety | `apps/reference-app/src/App.tsx`, local vault owner/tab lock, cache/reconnect, conflicts, UI, browser tests | Synthetic real Chromium smoke, local Auth browser, offline/account switching, no pending-queue loss | **None** |
| D. Guarded hosted workflow | Draft staging workflow, Cloudflare challenge tests, PowerSync config, connected E2E validators, protected GitHub environment controls | Independent release reviewer approval, budget and exact Git-SHA/SQL digest after protected staging readiness | **None until separate approval** |
| E. Isolated hosted pilot | Dedicated inactive UAF Supabase, isolated PowerSync Sync Streams, Access-protected Worker, 2 synthetic identities | Nine connected browser journeys, actual private Worker challenge/asset tests, offline/reconnect and revocation, recorded costs | **Only after explicit action authorizations** |

### Integration mechanics, without permission to integrate now

1. Freeze draft source after exact-head four-workflow success. Keep
   `main` production/staging workflows fail-closed.
2. Review each logical diff group independently with commit-bound evidence.
   If splitting into smaller PRs, prefer NEW branches from fresh `main`
   with only dependency-satisfied commits/paths, **not** blind cherry-picks
   from 220+ interdependent commits. Every proposed PR must rerun CI and
   must remain a draft pending approval.
3. Before ANY PR #5-related merge, independently reconcile its `main`
   merge conflict. Never overwrite PR #10 root scripts or the PR #7
   production kill switch. Reverify exact `main` ancestry, changed paths,
   required reviewers and CI on the final merge candidate.
4. Decide whether workspace archive/restore belongs to the MVP:
   [issue #9](https://github.com/ashish27190-svg/universal-app-foundation/issues/9). Current RLS blocks
   status transitions; do not weaken `can_write_workspace` to make the
   feature superficially work.
5. Do not add more general-purpose foundational abstractions or AI agent
   layers as a substitute for real hosted testing. After Household Vault
   passes, measure a second synthetic app's reuse with zero domain-specific
   imports into foundation packages.

## Acceptance and known gaps

**Current local evidence:** 81/81 synthetic database pgTAP assertions and
83 local HTTP/authorization assertions, CI and two Chromium/local-Auth
workflows passed at prior head `6c84011e`. That evidence is historic
after integrating PR #10's safeguards; rerun on the newer exact draft HEAD.

**Unverified:** GitHub required environment reviewers and main branch
protection; exact production/Cloudflare credential scoping; staging billing
approval; hosted Supabase/PowerSync/SSO; nine connected browser journeys;
mobile PWA; actual private Worker Access challenge; rollback plan and
production acceptance. CI does not prove any of them.

**Stop rules:** No merge, deploy, staging project reactivation, spend,
production workflow activation, or external write based only on `go`.
