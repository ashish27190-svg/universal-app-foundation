# BUILD 0.9 — Household Assets Reference Domain

## Purpose

Introduce the first real UAF domain without allowing React, Supabase, PowerSync, or application concerns into domain logic.

## Implemented

- `HouseholdAsset` and `AssetServiceRecord` entities.
- Calendar-safe local-date validation.
- Money represented in integer minor units with explicit currency; UAF never silently converts currencies.
- Versioned Warranty Status and Lifetime Service Cost calculations.
- Golden/edge-case tests authored.
- `buildNewHouseholdAsset()` factory.
- PostgreSQL reference-domain tables with SELECT-only authenticated grants and workspace RLS.
- PowerSync schema and Sync Streams for workspace-scoped downloads.
- Metadata-enabled local writable tables.
- Strict server mutation handlers with revision checking, lifecycle rules, validation, audit/conflict output, and immutable service-to-asset relationship.
- `PowerSyncHouseholdAssetRepository` that writes locally first and carries mutation metadata through PowerSync `_metadata`.

## Important decisions

1. Money uses safe integer minor units; no floating point is persisted.
2. Currency totals are kept separate unless a future explicit exchange-rate capability performs conversion.
3. Domain code has no React/Supabase/PowerSync imports.
4. Browser clients receive SELECT-only cloud grants for domain tables; durable writes go through the UAF mutation gateway.
5. Normal repository `update()` cannot mutate `lifecycleState`; delete/restore remain explicit operations.
6. Local update matching uses `RETURNING id`, avoiding reliance on `rowsAffected` for PowerSync view-backed tables.

## Locally validated

- domain dependency boundary
- household Supabase/PowerSync static invariants
- pure domain TypeScript
- local Household Asset repository TypeScript contract

## External gates still required

- real Supabase migration/RLS execution
- real PowerSync schema/Sync Stream deployment
- real browser SQLite persistence
- real gateway upload/reconciliation
- forced revision-conflict runtime test
