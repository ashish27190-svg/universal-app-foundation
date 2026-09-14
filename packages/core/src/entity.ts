import type { EntityId, IsoDateTime, Revision, UserId, WorkspaceId } from './ids';

export type LifecycleState = 'active' | 'archived' | 'superseded' | 'deleted';

export type DataQuality =
  | 'verified'
  | 'complete'
  | 'incomplete'
  | 'estimated'
  | 'conflicting'
  | 'invalid'
  | 'needs_review';

export type Confidence = 'high' | 'medium' | 'low' | 'unknown';

export type SourceType =
  | 'manual'
  | 'import'
  | 'integration'
  | 'system'
  | 'calculated'
  | 'ai'
  | 'ai_assisted'
  | 'migration';

export interface DataSource {
  readonly type: SourceType;
  readonly reference?: string;
}

/**
 * Durable, domain-independent metadata shared by meaningful persisted entities.
 * Device-specific sync state intentionally does not belong here.
 */
export interface BaseEntity {
  readonly id: EntityId;
  readonly workspaceId: WorkspaceId;
  readonly createdAt: IsoDateTime;
  readonly updatedAt: IsoDateTime;
  readonly createdBy: UserId | null;
  readonly updatedBy: UserId | null;
  readonly revision: Revision;
  readonly lifecycleState: LifecycleState;
  readonly source: DataSource;
  readonly dataQuality: DataQuality;
  readonly confidence: Confidence;
  readonly metadata: Readonly<Record<string, unknown>>;
}
