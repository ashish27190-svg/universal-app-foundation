# Gate 3 — GitHub review and deployment protection setup

**Status: unverified, operator checklist only (11 October 2026).** UAF draft
PR #5 is not merged. The default-branch staging workflow is an inert
kill switch; the production workflow is blocked by merged PR #7.
Do not authorize hosted staging based on this checklist alone.

## Required manual verification in GitHub

1. Open https://github.com/ashish27190-svg/universal-app-foundation/settings/environments .
   Review BOTH `staging` and `production` environments. If either is
   absent, treat it as **NO-GO**, not as implicit protection.
2. On each environment, verify **Required reviewers** has a real named
   trusted reviewer or team with repository read access. Enable
   **Prevent self-review** and **Prevent administrator bypass** where
   supported. One approval is sufficient even if multiple reviewers are
   listed; therefore select trusted reviewers intentionally.
   If only one person/account can review and that person dispatches jobs,
   preventing self-review means a second qualified human is needed:
   do not weaken the rule silently to unblock a release.
3. Use **Deployment branches and tags → Selected branches and tags**
   with exactly `main` permitted, **no tags**, no wildcard and no
   feature/PR branch. Do not rely on `Protected branches only` alone:
   GitHub explicitly documents that without any configured branch
   protections, that option can allow all branches.
4. Open https://github.com/ashish27190-svg/universal-app-foundation/settings/rules .
   Protect `main` using a suitable branch ruleset or branch protection:
   require pull requests, suitable independent reviews, and exact required
   CI/status checks. Review bypass actors and `Do not allow bypassing`
   where available. Confirm the rule applies to `main`, not just a
   similar branch. Existing linked GitHub tools cannot read the
   environment reviewer configuration; repository rulesets were
   returned as `[]`, and branch protection GET returned HTTP 403.
   Do not claim it is configured based on those observations.
5. Confirm GitHub Actions reports `GITHUB_REF_PROTECTED=true` for a
   manual `main` run. Draft PR #5's `validate-staging-github-context.mjs`
   rejects any other repo, branch, nonmanual event, or unprotected ref;
   both remote migration planning and deployment also have job-level
   `github.ref == 'refs/heads/main' && github.ref_protected` guards.
   **That signal establishes only that some rule is configured**; it
   does NOT verify required reviewers, strength or bypass rules.
6. Review the exact Git SHA and migration SQL digest in the protected
   `plan_migrations` job, with separate human financial/data permission
   to run it. The future deploy must be authorized independently with
   those same two values. Never approve an unreviewed change or an
   automatic hosted action.

## Important account/privacy choice

The GitHub source repository is **PUBLIC**, but this does NOT expose a
correctly Access-protected Worker website by itself. Public source must
never contain credentials or customer records. Current GitHub documentation
states required reviewers on GitHub Free/Pro/Team are limited to **public
repositories**, and GitHub Free environment secrets require public
repositories. If making the repository private is desired, review the
**GitHub plan and environment-feature entitlement FIRST**; do not
change visibility blindly and disable release protection.

## Evidence that must be saved in issue #8

Capture a redacted screenshot or written verified record for **each**
environment and `main` protection showing: environment name, permitted
branch, named reviewer configuration, self-approval and admin-bypass
restrictions, rule scope, required checks, date, and who reviewed it.
**Never include secrets, Access credentials, user records or key values.**

Mark the matching checklist in
https://github.com/ashish27190-svg/universal-app-foundation/issues/8
only after independently verified. Until then hosted staging and
production are NO-GO.

Official docs:
- https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments
- https://docs.github.com/en/actions/reference/workflows-and-actions/variables
- https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow
