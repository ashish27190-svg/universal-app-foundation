# ADR-017 — Workspace bootstrap and RLS foundation

## Decision

Phase 1 uses Supabase Auth identities plus a UAF `workspaces` / `workspace_memberships` model.

A signed-in user's personal workspace is created through the idempotent `ensure_personal_workspace()` database function, not through two independent browser inserts. The function atomically resolves/creates the personal workspace and owner membership.

Backend access uses explicit SQL grants plus Row Level Security. Membership helper functions are `SECURITY DEFINER`, have an empty `search_path`, and expose only boolean authorization decisions. Normal clients cannot directly write membership, mutation-ledger, conflict, or audit rows.

## Why

This prevents partial workspace bootstrap, reduces RLS policy recursion, keeps identity-provider details behind `@uaf/auth`, and provides a clean path to family/team/business workspaces later.

## Not yet included

- invitations,
- role-management UI,
- multiple workspace switching,
- collaboration,
- admin support access.
