import { describe, expect, it } from 'vitest';
import type { MutationId, Revision, WorkspaceId } from '@uaf/core';
import { crudEntryToMutationEnvelope, decodeMutationMetadata, encodeMutationMetadata } from './mutation';

const metadata = {
  version: 1 as const,
  mutationId: '00000000-0000-4000-8000-000000000001' as MutationId,
  workspaceId: '00000000-0000-4000-8000-000000000010' as WorkspaceId,
  operation: 'update' as const,
  expectedRevision: 3 as Revision,
};

describe('UAF PowerSync mutation protocol', () => {
  it('round-trips metadata', () => {
    expect(decodeMutationMetadata(encodeMutationMetadata(metadata))).toEqual(metadata);
  });

  it('maps a PowerSync CRUD operation into the gateway envelope', () => {
    const envelope = crudEntryToMutationEnvelope(
      {
        clientId: 7,
        id: 'asset-1',
        table: 'household_assets',
        op: 'patch',
        opData: { name: 'Updated' },
        metadata: encodeMutationMetadata(metadata),
        transactionId: 12,
      } as never,
      'client-db-1',
    );
    expect(envelope.expectedRevision).toBe(3);
    expect(envelope.clientTransactionId).toBe(12);
  });

  it('rejects physical deletes', () => {
    expect(() =>
      crudEntryToMutationEnvelope(
        {
          clientId: 8,
          id: 'asset-1',
          table: 'household_assets',
          op: 'delete',
          metadata: encodeMutationMetadata(metadata),
        } as never,
        'client-db-1',
      ),
    ).toThrow(/soft delete/i);
  });
});
