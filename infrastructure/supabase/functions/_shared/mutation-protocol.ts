export const UAF_MUTATION_PROTOCOL_VERSION = 1 as const;
export type MutationOperation = 'create' | 'update' | 'soft_delete' | 'restore';

export interface MutationEnvelope {
  protocolVersion: 1;
  mutationId: string;
  clientDatabaseId: string;
  clientOperationId: number;
  clientTransactionId?: number;
  workspaceId: string;
  entityType: string;
  entityId: string;
  operation: MutationOperation;
  expectedRevision: number | null;
  payload: Record<string, unknown>;
}

export interface MutationOutcome {
  mutationId: string;
  status: 'applied' | 'idempotent' | 'conflict' | 'rejected';
  message?: string;
}

export function parseMutationBatch(input: unknown): MutationEnvelope[] {
  if (!input || typeof input !== 'object') throw new Error('Invalid mutation request.');
  const body = input as { protocolVersion?: unknown; mutations?: unknown };
  if (body.protocolVersion !== UAF_MUTATION_PROTOCOL_VERSION || !Array.isArray(body.mutations)) {
    throw new Error('Unsupported mutation protocol or malformed batch.');
  }
  if (body.mutations.length === 0 || body.mutations.length > 50) {
    throw new Error('Mutation batch must contain between 1 and 50 operations.');
  }
  return body.mutations.map((value) => parseMutation(value));
}

function parseMutation(input: unknown): MutationEnvelope {
  if (!input || typeof input !== 'object') throw new Error('Malformed mutation.');
  const value = input as Record<string, unknown>;
  const operations = new Set(['create', 'update', 'soft_delete', 'restore']);
  if (
    value.protocolVersion !== 1 ||
    typeof value.mutationId !== 'string' ||
    typeof value.clientDatabaseId !== 'string' ||
    typeof value.clientOperationId !== 'number' ||
    typeof value.workspaceId !== 'string' ||
    typeof value.entityType !== 'string' ||
    typeof value.entityId !== 'string' ||
    typeof value.operation !== 'string' ||
    !operations.has(value.operation) ||
    !(value.expectedRevision === null || typeof value.expectedRevision === 'number') ||
    !value.payload ||
    typeof value.payload !== 'object' ||
    Array.isArray(value.payload)
  ) {
    throw new Error('Malformed mutation fields.');
  }
  return value as unknown as MutationEnvelope;
}
