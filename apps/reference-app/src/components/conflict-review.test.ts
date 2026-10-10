import { describe, expect, it } from 'vitest';
import type { WriteConflict } from '@uaf/sync';
import {
  canReviewAndReapply,
  fieldsToReview,
  matchesReviewedSnapshot,
  snapshotForReview,
} from './conflict-review';

const conflict = {
  id: 'synthetic-conflict',
  conflictType: 'conflict',
  entityType: 'household_assets',
  entityId: 'synthetic-entity',
  operation: 'update',
  serverRevision: 3,
  clientRevision: 2,
  clientPayload: { name: 'My laptop', notes: 'Warranty requires registration' },
  serverPayload: { name: 'Team laptop', notes: 'Receipt uploaded', revision: 3 },
} as unknown as WriteConflict;

describe('explicit conflict review gate', () => {
  it('shows every client field alongside the server value', () => {
    expect(fieldsToReview(conflict)).toEqual([
      { field: 'name', attempted: 'My laptop', server: 'Team laptop' },
      { field: 'notes', attempted: 'Warranty requires registration', server: 'Receipt uploaded' },
    ]);
  });

  it('shows lifecycle change instead of an empty payload for delete and restore', () => {
    const deletion = {
      ...conflict,
      operation: 'soft_delete' as const,
      clientPayload: {},
      serverPayload: { lifecycle_state: 'active' },
    };
    expect(fieldsToReview(deletion)).toEqual([
      { field: 'Lifecycle state', attempted: 'deleted', server: 'active' },
    ]);
    expect(fieldsToReview({ ...deletion, operation: 'restore' })).toEqual([
      { field: 'Lifecycle state', attempted: 'active', server: 'active' },
    ]);
  });

  it('refuses rejected/create/no-revision cases, even if a button is requested', () => {
    expect(canReviewAndReapply(conflict)).toBe(true);
    for (const invalid of [
      { conflictType: 'rejected' },
      { operation: 'create' },
      { serverRevision: null },
      { serverRevision: 0 },
      { entityType: 'unsupported' },
      { clientPayload: {} },
      { clientPayload: { revision: 100, source: 'manual' } },
    ]) {
      expect(canReviewAndReapply({ ...conflict, ...invalid } as WriteConflict)).toBe(false);
      expect(snapshotForReview({ ...conflict, ...invalid } as WriteConflict)).toBeNull();
    }
  });

  it('invalidates approval when server revision, server fields, or client payload changes', () => {
    const reviewed = snapshotForReview(conflict);
    expect(reviewed).not.toBeNull();
    expect(matchesReviewedSnapshot(reviewed!, conflict)).toBe(true);
    expect(matchesReviewedSnapshot(reviewed!, null)).toBe(false);
    expect(matchesReviewedSnapshot(reviewed!, { ...conflict, serverRevision: 4 as WriteConflict['serverRevision'] })).toBe(false);
    expect(matchesReviewedSnapshot(reviewed!, { ...conflict, serverPayload: { ...conflict.serverPayload, notes: 'Changed since review' } })).toBe(false);
    expect(matchesReviewedSnapshot(reviewed!, { ...conflict, clientPayload: { name: 'Changed locally' } })).toBe(false);
  });

  it('excludes revision, source and other server-owned attributes from reviewed patch', () => {
    const reviewed = fieldsToReview({
      ...conflict,
      clientPayload: { name: 'New value', revision: 999, source: 'manual', updated_by: 'fake-id' },
      serverPayload: { name: 'Current value', revision: 3 },
    });
    expect(reviewed).toEqual([{ field: 'name', attempted: 'New value', server: 'Current value' }]);
  });

  it('represents missing server fields and multi-field metadata without omitting them', () => {
    const fields = fieldsToReview({
      ...conflict,
      clientPayload: { metadata: { store: 'local', warranty: true }, notes: null },
      serverPayload: {},
    });
    expect(fields).toHaveLength(2);
    expect(fields[0]).toEqual({ field: 'metadata', attempted: JSON.stringify({ store: 'local', warranty: true }, null, 2), server: '(not set)' });
    expect(fields[1]).toEqual({ field: 'notes', attempted: '(empty)', server: '(not set)' });
  });
});
