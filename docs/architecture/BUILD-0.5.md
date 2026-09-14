# BUILD 0.5 — Data & Repository Contracts

## Decision

Domain code reads/writes through the vendor-independent `Repository<TEntity>` contract. All reads are workspace-scoped, mutable operations use an expected revision, and deletion is a lifecycle transition rather than immediate physical removal.

An in-memory implementation is maintained as the reference behaviour. PowerSync/Supabase implementations must satisfy the same contract rather than redefining domain persistence semantics.

## Acceptance gate E4

- data package compiles without PowerSync/Supabase,
- dependency boundary passes,
- reference implementation supports create/get/list/update/delete/restore,
- stale revisions produce `DATA-002`,
- wrong-workspace reads do not leak entities.
