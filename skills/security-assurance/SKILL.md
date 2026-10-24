---
name: security-assurance
description: Provide risk-based secure-design, application security and release evidence review for apps, websites and integrations without claiming hack-proof or untested PASS.
---
# Security Assurance — reusable skill v1.0

## Trigger and inputs
Before architecture approval, pull-request review, new integration/auth/data-flow, major dependency update, staging/production release, security incident or scheduled risk review. Require repository/commit, architecture and data-flow, environment scope, data classification, access authorization, deployment controls and available test evidence.

## Threat model before coding
Identify assets, actors, entry points, untrusted inputs, trust boundaries, misuse/abuse scenarios, data at rest/in transit, multi-tenant boundaries, account recovery, offline cache and sync, privileged actions, secrets, dependencies and third-party API/webhook risks. For each threat record impact, likelihood rationale, mitigation, owner and verifying test. Adapt OWASP ASVS application control coverage and NIST SSDF development practices to product risk; do not assert blanket compliance.

## Code / pipeline review
Confirm access control is server-enforced, deny-by-default and covered by negative isolation tests. Check auth sessions, credentials and secret handling, validation/encoding, injection, SSRF where applicable, dependency and action pinning, security headers, CSRF/CORS where applicable, rate limiting/abuse, logging/privacy, sensitive document access, file import, backups and recovery. Check RLS policies with actual separate users and realistic staging data, not solely SQL inspection. For offline-first apps, test device loss, stale sessions, queued writes, replay/idempotency, sync collisions and revocation.

## Tooling selection (do not claim installed)
Consider GitHub native secret/code/dependency scanning where available, OSV-Scanner for dependencies, Gitleaks for local/CI secret discovery, CodeQL/Semgrep for static analysis, and OWASP ZAP passive or authorized staging-only DAST. Evaluate versions, licenses, platform eligibility, configuration, false positives and operational overhead first. Never attack third-party or production systems without scope and explicit authorization. Scanner findings are evidence to triage, not proof of absence of vulnerabilities.

## Gate / finding format
Control | relevant threat | evidence source + commit | test environment/date | state PASS/FAIL/NOT RUN/NOT APPLICABLE | risk severity | remediation | owner | retest. No 'PASS' based solely on a file existing or a test script being written. Block release on cross-user data leakage, exposed secrets, loss of stored data, authorization bypass and other unresolved material risks. Confirm rollback/restore actually tested.

## Authority
Read-only discovery/review by default. READ -> ANALYSE -> PROPOSE -> HUMAN APPROVAL -> WRITE/ACTION. Do not disclose secrets in findings. Any scan that could modify state or burden infrastructure needs owner approval and limited staging scope; no automatic remediations, deployments, production probes or permission changes. Raise uncertain issues rather than fabricating assurance.
