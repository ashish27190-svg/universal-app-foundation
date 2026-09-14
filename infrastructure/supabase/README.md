# Supabase infrastructure

BUILD 0.4 introduces the durable identity/workspace foundation.

## Migration

`migrations/20260914000100_foundation_identity_workspace.sql` creates:

- `profiles`
- `workspaces`
- `workspace_memberships`
- `processed_mutations`
- `write_conflicts`
- `audit_events`
- profile/update triggers
- workspace membership RLS helpers
- idempotent `ensure_personal_workspace()` bootstrap RPC
- explicit Row Level Security policies and SQL grants

## Security model

Normal browser clients can:

- read/update their own profile,
- read workspaces they actively belong to,
- update a workspace only when their active role can write,
- read membership/conflict/audit information for their own workspace.

Normal browser clients cannot directly write membership rows, processed mutations, conflicts, or audit events. Those mutation surfaces are reserved for controlled server workflows.

## Required external gate

Before BUILD 0.4 is fully green, run the migration in a disposable/local Supabase environment and execute the scenarios in `tests/build-0.4-acceptance.sql` with at least two authenticated users.
