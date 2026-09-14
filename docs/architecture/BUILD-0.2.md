# BUILD 0.2 — @uaf/core

## Goal

Implement the framework-independent contracts used by all UAF applications and domains.

## Included

- Branded identifiers: entity, workspace, user, event, command, calculation.
- Revision and ISO timestamp boundary types.
- `BaseEntity` durable metadata contract.
- Lifecycle, source, data-quality and confidence models.
- Serializable domain command and event contracts.
- Structured application errors.
- Discriminated `Result` helpers.
- Calculation definition/result/evidence contracts.

## Architectural boundaries

`@uaf/core` contains no React, Supabase, PowerSync, Cloudflare or app/domain imports.

Device sync state is deliberately excluded from `BaseEntity`; it belongs to the local sync layer because two devices can have different synchronization states for the same durable entity.

## Deferred

Runtime ID generation, timestamp generation, schema validation, database mapping and domain-specific calculations belong in higher layers.
