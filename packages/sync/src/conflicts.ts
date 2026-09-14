import type { AuthService } from '@uaf/auth';
import type { MutationId, Revision, WorkspaceId } from '@uaf/core';
import type { LocalSqlDatabase } from './local-database';
import type { MutationOperation } from './mutation';

export type ConflictResolutionChoice = 'keep_server' | 'reapply_client';

export interface WriteConflict {
  readonly id: string;
  readonly workspaceId: WorkspaceId;
  readonly mutationId: MutationId | null;
  readonly operation: MutationOperation | null;
  readonly entityType: string;
  readonly entityId: string;
  readonly conflictType: string;
  readonly clientRevision: Revision | null;
  readonly serverRevision: Revision | null;
  readonly clientPayload: Readonly<Record<string, unknown>>;
  readonly serverPayload: Readonly<Record<string, unknown>>;
  readonly createdAt: string;
  readonly resolvedAt: string | null;
  readonly resolution: string | null;
}

interface WriteConflictRow {
  id: string;
  workspace_id: string;
  mutation_id: string | null;
  operation: MutationOperation | null;
  entity_type: string;
  entity_id: string;
  conflict_type: string;
  client_revision: number | null;
  server_revision: number | null;
  client_payload: string | Record<string, unknown> | null;
  server_payload: string | Record<string, unknown> | null;
  created_at: string;
  resolved_at: string | null;
  resolution: string | null;
}

function objectValue(value: WriteConflictRow['client_payload']): Readonly<Record<string, unknown>> {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function toConflict(row: WriteConflictRow): WriteConflict {
  return {
    id: row.id,
    workspaceId: row.workspace_id as WorkspaceId,
    mutationId: row.mutation_id as MutationId | null,
    operation: row.operation,
    entityType: row.entity_type,
    entityId: row.entity_id,
    conflictType: row.conflict_type,
    clientRevision: row.client_revision as Revision | null,
    serverRevision: row.server_revision as Revision | null,
    clientPayload: objectValue(row.client_payload),
    serverPayload: objectValue(row.server_payload),
    createdAt: row.created_at,
    resolvedAt: row.resolved_at,
    resolution: row.resolution,
  };
}

export class LocalWriteConflictRepository {
  constructor(private readonly db: LocalSqlDatabase) {}

  async listUnresolved(workspaceId: WorkspaceId): Promise<readonly WriteConflict[]> {
    const rows = await this.db.getAll<WriteConflictRow>(
      'SELECT * FROM write_conflicts WHERE workspace_id = ? AND resolved_at IS NULL ORDER BY created_at DESC',
      [String(workspaceId)],
    );
    return rows.map(toConflict);
  }

  watchUnresolved(
    workspaceId: WorkspaceId,
    observer: { onData: (conflicts: readonly WriteConflict[]) => void; onError?: (error: Error) => void },
  ): () => void {
    return this.db.watch<WriteConflictRow>(
      'SELECT * FROM write_conflicts WHERE workspace_id = ? AND resolved_at IS NULL ORDER BY created_at DESC',
      [String(workspaceId)],
      {
        onData: (rows) => observer.onData(rows.map(toConflict)),
        ...(observer.onError ? { onError: observer.onError } : {}),
      },
    );
  }
}

export interface HttpConflictResolverOptions {
  readonly endpoint: string;
  readonly auth: AuthService;
  readonly fetchImpl?: typeof fetch;
}

export class HttpConflictResolver {
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly options: HttpConflictResolverOptions) {
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async resolve(conflictId: string, choice: ConflictResolutionChoice): Promise<void> {
    const session = await this.options.auth.getSession();
    if (!session) throw new Error('Cannot resolve a conflict without an authenticated session.');
    const response = await this.fetchImpl(this.options.endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ conflictId, choice }),
    });
    const body = await response.json().catch(() => ({})) as { message?: string };
    if (!response.ok) throw new Error(body.message ?? `Conflict resolver returned HTTP ${response.status}.`);
  }
}
