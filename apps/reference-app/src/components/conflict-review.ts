import type { WriteConflict } from '@uaf/sync';

export interface ConflictReviewSnapshot {
  readonly conflictId: string;
  readonly operation: 'update' | 'soft_delete' | 'restore';
  readonly serverRevision: number;
  readonly clientPayloadJson: string;
  readonly serverPayloadJson: string;
}

export interface ConflictReviewedField {
  readonly field: string;
  readonly attempted: string;
  readonly server: string;
}

const MUTABLE_ENTITY_TYPES = new Set(['household_assets', 'asset_service_records']);
const MUTABLE_OPERATIONS = new Set(['update', 'soft_delete', 'restore']);

export function canReviewAndReapply(conflict: WriteConflict): boolean {
  return (
    conflict.conflictType === 'conflict' &&
    MUTABLE_ENTITY_TYPES.has(conflict.entityType) &&
    MUTABLE_OPERATIONS.has(conflict.operation ?? '') &&
    (conflict.operation !== 'update' || Object.keys(conflict.clientPayload).length > 0) &&
    Number.isSafeInteger(conflict.serverRevision) &&
    Number(conflict.serverRevision) > 0
  );
}

export function snapshotForReview(conflict: WriteConflict): ConflictReviewSnapshot | null {
  if (!canReviewAndReapply(conflict)) return null;
  return {
    conflictId: conflict.id,
    operation: conflict.operation as ConflictReviewSnapshot['operation'],
    serverRevision: Number(conflict.serverRevision),
    clientPayloadJson: JSON.stringify(conflict.clientPayload),
    serverPayloadJson: JSON.stringify(conflict.serverPayload),
  };
}

/** A changed live snapshot requires a new review, never a silent reapply. */
export function matchesReviewedSnapshot(
  reviewed: ConflictReviewSnapshot,
  current: WriteConflict | null,
): boolean {
  return (
    current !== null &&
    canReviewAndReapply(current) &&
    current.id === reviewed.conflictId &&
    current.operation === reviewed.operation &&
    Number(current.serverRevision) === reviewed.serverRevision &&
    JSON.stringify(current.clientPayload) === reviewed.clientPayloadJson &&
    JSON.stringify(current.serverPayload) === reviewed.serverPayloadJson
  );
}

function show(value: unknown, missing = false): string {
  if (missing) return '(not set)';
  if (value === null) return '(empty)';
  if (typeof value === 'string') return value || '(empty)';
  return JSON.stringify(value, null, 2) ?? '(not set)';
}

/**
 * Show every field the client attempted to write, not just the asset name.
 * For lifecycle changes, show the operation's exact lifecycle effect.
 */
export function fieldsToReview(conflict: WriteConflict): readonly ConflictReviewedField[] {
  if (conflict.operation === 'soft_delete' || conflict.operation === 'restore') {
    return [{
      field: 'Lifecycle state',
      attempted: conflict.operation === 'soft_delete' ? 'deleted' : 'active',
      server: show(conflict.serverPayload.lifecycle_state, !Object.hasOwn(conflict.serverPayload, 'lifecycle_state')),
    }];
  }
  return Object.keys(conflict.clientPayload).sort().map((key) => ({
    field: key.replaceAll('_', ' '),
    attempted: show(conflict.clientPayload[key]),
    server: show(conflict.serverPayload[key], !Object.hasOwn(conflict.serverPayload, key)),
  }));
}
