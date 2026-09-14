import type { WorkspaceId } from '@uaf/core';
import type { LocalSqlDatabase } from '@uaf/sync';

export interface AuditEventView {
  readonly id: string;
  readonly workspaceId: WorkspaceId;
  readonly actorType: 'user' | 'system' | 'agent' | 'integration';
  readonly action: string;
  readonly entityType: string | null;
  readonly entityId: string | null;
  readonly source: string;
  readonly createdAt: string;
}

interface AuditEventRow {
  id: string;
  workspace_id: string;
  actor_type: AuditEventView['actorType'];
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  source: string;
  created_at: string;
}

function toView(row: AuditEventRow): AuditEventView {
  return {
    id: row.id,
    workspaceId: row.workspace_id as WorkspaceId,
    actorType: row.actor_type,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    source: row.source,
    createdAt: row.created_at,
  };
}

export class LocalAuditRepository {
  constructor(private readonly db: LocalSqlDatabase) {}

  watchRecent(
    workspaceId: WorkspaceId,
    limit: number,
    observer: { onData: (events: readonly AuditEventView[]) => void; onError?: (error: Error) => void },
  ): () => void {
    return this.db.watch<AuditEventRow>(
      'SELECT id, workspace_id, actor_type, action, entity_type, entity_id, source, created_at FROM audit_events WHERE workspace_id = ? ORDER BY created_at DESC LIMIT ?',
      [String(workspaceId), limit],
      {
        onData: (rows) => observer.onData(rows.map(toView)),
        ...(observer.onError ? { onError: observer.onError } : {}),
      },
    );
  }
}
