# OSS reference register — initial discovery, 2026-09-20

Status: preliminary reference research, NOT approval to import code or change stack. Full candidate code/security/maintenance audit not performed. Review upstream revision and licenses again before reuse.

| Target | Candidate | Repository and evidence | Initial purpose | Reuse decision |
|---|---|---|---|---|
| Vehicle Truth | LubeLogger | https://github.com/hargata/lubelog — README describes self-hosted open-source vehicle maintenance and fuel mileage tracker; README states MIT license. | Compare service history, fuel-entry UX, import/export and vehicle management; verify details in code. | Reference-only pending feature, license-file and security verification. Particularly, do NOT assume honest mixed petrol/CNG allocation. |
| Money OS | Actual Budget | https://github.com/actualbudget/actual — README describes local-first finance, cross-device sync and open-source; repository LICENSE.txt contains MIT license terms. | Compare offline-first accounting UX, syncing, budgeting, migration and auditability. | Reference-only pending feature/security/maintenance review, even though permissive license text is located. |

## Candidate acceptance process
Verify exact license file and third-party notices, latest commit or pinned release, maintainer responsiveness, vulnerability advisories, recent test results, architecture fit and data privacy. Record commit SHA, date, expected maintenance burden and source acknowledgment/attribution where applicable. Only approved dependencies enter a lockfile; do not run untrusted setup scripts without inspection or import full applications just for their UI.

## Research queue
Vehicle Truth: LubeLogger detailed comparison and honest mixed-fuel gap; Money OS: Actual Budget and alternative open-source personal-finance approaches; UAF: security tooling review before CI enhancement; Dhvani and Birdwing: operational needs brief before software procurement or code reuse.
