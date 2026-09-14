import type {
  AppError,
  BaseEntity,
  EntityId,
  IsoDateTime,
  LifecycleState,
  Result,
  Revision,
  UserId,
  WorkspaceId,
} from '@uaf/core';

export interface RepositoryListQuery {
  readonly workspaceId: WorkspaceId;
  /** Defaults to active-only when omitted. */
  readonly lifecycleStates?: readonly LifecycleState[];
}

export interface RepositoryWriteContext {
  readonly actorId: UserId | null;
  readonly at: IsoDateTime;
}

export type EntityUpdatePatch<TEntity extends BaseEntity> = Partial<
  Omit<
    TEntity,
    'id' | 'workspaceId' | 'createdAt' | 'createdBy' | 'updatedAt' | 'updatedBy' | 'revision' | 'lifecycleState'
  >
>;

export interface RepositoryUpdate<TEntity extends BaseEntity> {
  readonly id: EntityId;
  readonly workspaceId: WorkspaceId;
  readonly expectedRevision: Revision;
  readonly patch: EntityUpdatePatch<TEntity>;
  readonly context: RepositoryWriteContext;
}

export interface RepositoryLifecycleMutation {
  readonly id: EntityId;
  readonly workspaceId: WorkspaceId;
  readonly expectedRevision: Revision;
  readonly context: RepositoryWriteContext;
}

export type RepositoryResult<T> = Result<T, AppError>;

export interface Repository<TEntity extends BaseEntity> {
  getById(id: EntityId, workspaceId: WorkspaceId): Promise<RepositoryResult<TEntity | null>>;
  list(query: RepositoryListQuery): Promise<RepositoryResult<readonly TEntity[]>>;
  create(entity: TEntity): Promise<RepositoryResult<TEntity>>;
  update(request: RepositoryUpdate<TEntity>): Promise<RepositoryResult<TEntity>>;
  softDelete(request: RepositoryLifecycleMutation): Promise<RepositoryResult<TEntity>>;
  restore(request: RepositoryLifecycleMutation): Promise<RepositoryResult<TEntity>>;
}
