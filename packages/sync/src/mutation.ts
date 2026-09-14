import type { MutationId, Revision, WorkspaceId } from '@uaf/core';
import type { CrudEntry } from '@powersync/web';

export const UAF_MUTATION_PROTOCOL_VERSION = 1 as const;

export type MutationOperation = 'create' | 'update' | 'soft_delete' | 'restore';

export interface UafMutationMetadata {
  readonly version: typeof UAF_MUTATION_PROTOCOL_VERSION;
  readonly mutationId: MutationId;
  readonly workspaceId: WorkspaceId;
  readonly operation: MutationOperation;
  readonly expectedRevision: Revision | null;
}

export interface UafMutationEnvelope {
  readonly protocolVersion: typeof UAF_MUTATION_PROTOCOL_VERSION;
  readonly mutationId: MutationId;
  readonly clientDatabaseId: string;
  readonly clientOperationId: number;
  readonly clientTransactionId?: number;
  readonly workspaceId: WorkspaceId;
  readonly entityType: string;
  readonly entityId: string;
  readonly operation: MutationOperation;
  readonly expectedRevision: Revision | null;
  readonly payload: Readonly<Record<string, unknown>>;
}

export type MutationTerminalStatus = 'applied' | 'idempotent' | 'conflict' | 'rejected';

export interface MutationOutcome {
  readonly mutationId: MutationId;
  readonly status: MutationTerminalStatus;
  readonly message?: string;
}

export interface MutationBatchRequest {
  readonly protocolVersion: typeof UAF_MUTATION_PROTOCOL_VERSION;
  readonly mutations: readonly UafMutationEnvelope[];
}

export interface MutationBatchResponse {
  readonly protocolVersion: typeof UAF_MUTATION_PROTOCOL_VERSION;
  readonly outcomes: readonly MutationOutcome[];
}

export function createMutationId(): MutationId {
  return crypto.randomUUID() as MutationId;
}

export function encodeMutationMetadata(metadata: UafMutationMetadata): string {
  return JSON.stringify(metadata);
}

export function decodeMutationMetadata(value: string | undefined): UafMutationMetadata {
  if (!value) throw new Error('PowerSync CRUD entry is missing required UAF mutation metadata.');
  const parsed = JSON.parse(value) as Partial<UafMutationMetadata>;
  if (
    parsed.version !== UAF_MUTATION_PROTOCOL_VERSION ||
    typeof parsed.mutationId !== 'string' ||
    typeof parsed.workspaceId !== 'string' ||
    !['create', 'update', 'soft_delete', 'restore'].includes(String(parsed.operation)) ||
    !(parsed.expectedRevision === null || typeof parsed.expectedRevision === 'number')
  ) {
    throw new Error('PowerSync CRUD entry contains invalid UAF mutation metadata.');
  }
  return parsed as UafMutationMetadata;
}

export function crudEntryToMutationEnvelope(
  entry: CrudEntry,
  clientDatabaseId: string,
): UafMutationEnvelope {
  const metadata = decodeMutationMetadata(entry.metadata);
  if (String(entry.op).toLowerCase() === 'delete') {
    throw new Error('Physical DELETE is not supported by the UAF sync protocol; use soft delete.');
  }
  return {
    protocolVersion: UAF_MUTATION_PROTOCOL_VERSION,
    mutationId: metadata.mutationId,
    clientDatabaseId,
    clientOperationId: entry.clientId,
    ...(entry.transactionId !== undefined ? { clientTransactionId: entry.transactionId } : {}),
    workspaceId: metadata.workspaceId,
    entityType: entry.table,
    entityId: entry.id,
    operation: metadata.operation,
    expectedRevision: metadata.expectedRevision,
    payload: entry.opData ?? {},
  };
}
