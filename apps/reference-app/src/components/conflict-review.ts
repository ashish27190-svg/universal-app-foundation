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

// Keep this read-only UI list aligned with the Edge sanitizer and SQL mutation
// allowlist. Lifecycle and server-owned fields are NOT part of an update patch.
const EDITABLE_FIELDS: Record<string, ReadonlySet<string>> = {
  household_assets: new Set([
    'name', 'category', 'purchase_date', 'purchase_price_minor',
    'purchase_currency', 'warranty_expires_on', 'notes', 'source_reference',
    'data_quality', 'confidence', 'metadata',
  ]),
  asset_service_records: new Set([
    'service_date', 'cost_minor', 'cost_currency', 'provider',
    'notes', 'source_reference', 'data_quality', 'confidence', 'metadata',
  ]),
};

function effectiveUpdateKeys(conflict: WriteConflict): readonly string[] {
  const allowed = EDITABLE_FIELDS[conflict.entityType];
  if (!allowed) return [];
  return Object.keys(conflict.clientPayload).filter((key) => allowed.has(key)).sort();
}

export function canReviewAndReapply(conflict: WriteConflict): boolean {
  return (
    conflict.conflictType === 'conflict' &&
    MUTABLE_ENTITY_TYPES.has(conflict.entityType) &&
    MUTABLE_OPERATIONS.has(conflict.operation ?? '') &&
    (conflict.operation !== 'update' || effectiveUpdateKeys(conflict).length > 0) &&
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
 * Show every applicable mutable field (server-owned fields are excluded), not only the asset name.
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
  return effectiveUpdateKeys(conflict).map((key) => ({
    field: key.replaceAll('_', ' '),
    attempted: show(conflict.clientPayload[key]),
    server: show(conflict.serverPayload[key], !Object.hasOwn(conflict.serverPayload, key)),
  }));
}
