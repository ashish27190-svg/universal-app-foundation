# BUILD 0.17 — Security Regression Gates

Static security checks verify RLS enablement, server-only mutation-ledger access and absence of obvious server credentials in browser/domain source. A connected security checklist defines the release-blocking two-user/anonymous assertions that still require a real Supabase environment.

## Acceptance status

- Static security validator: PASS
- Live two-user RLS/invalid-JWT/Sync-Stream isolation suite: NOT RUN
