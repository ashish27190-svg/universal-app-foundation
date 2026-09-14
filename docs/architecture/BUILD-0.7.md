# BUILD 0.7 — Mutation Protocol & Write Gateway Framework

## Implemented

- branded `MutationId`,
- versioned PowerSync `_metadata` protocol,
- CRUD-entry to UAF mutation-envelope mapping,
- authenticated HTTP batch uploader,
- terminal outcome validation before queue completion,
- Supabase `sync-apply` Edge Function using current `@supabase/server` user auth,
- RLS-scoped workspace authorization,
- processed-mutation idempotency lookup,
- strict entity-handler registry (no dynamic table writes),
- conflict/rejection recording,
- audit recording for successful mutations,
- retry behavior for transient server failures.

## Gate state

The gateway framework is ready, but E6 cannot be fully green until the first real domain mutation handler exists in the Household Assets build. Until then the handler registry intentionally rejects every entity type rather than writing to arbitrary tables.
