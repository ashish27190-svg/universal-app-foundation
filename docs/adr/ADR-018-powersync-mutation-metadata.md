# ADR-018 — PowerSync mutation metadata protocol

## Decision

UAF uses PowerSync table `trackMetadata` and the `_metadata` write column to attach a versioned JSON envelope to each locally queued row mutation.

Metadata contains:

- mutation UUID,
- workspace UUID,
- logical operation,
- expected server revision,
- protocol version.

The uploader combines this metadata with PowerSync's row ID, table, client operation ID, transaction ID and `opData`, then sends a bounded batch to the authenticated `sync-apply` Edge Function.

## Why

PowerSync's queue provides excellent offline persistence but UAF needs stronger domain semantics than raw `put/patch/delete`: idempotency, optimistic concurrency, soft deletion and auditability. Metadata gives us those semantics without building a parallel offline queue.

## Important limitation

Phase 1 row correctness is protected primarily by immutable IDs and expected-revision checks in domain handlers. The processed-mutation ledger improves retry behavior but does not itself create a cross-table SQL transaction around arbitrary handler work. Irreversible external side effects will require stronger dedicated idempotency mechanisms before they are introduced.
