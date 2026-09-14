# BUILD 0.13 — Conflict Review & Resolution

`write_conflicts` now retains the originating mutation UUID and logical operation. Unresolved conflicts contribute to the global `attention_required` sync state. Users can keep the server version or, for safe non-create cases, reapply their local version through the same domain mutation handler with a fresh revision guard.

## Safety rules

- No blind direct domain-table write from the conflict resolver.
- Reapply always re-runs domain validation and optimistic concurrency.
- Create conflicts cannot be reapplied automatically.
- Resolution writes an audit event.

## Acceptance status

- Conflict migration/handler/UI static validator: PASS
- Edge Function source TypeScript check with temporary dependency declarations: PASS
- Forced two-device conflict Playwright journey: AUTHORED, NOT RUN connected
