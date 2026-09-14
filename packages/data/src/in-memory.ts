import { err, ok, type BaseEntity, type EntityId, type Revision, type WorkspaceId } from '@uaf/core';
import type {
  Repository,
  RepositoryLifecycleMutation,
  RepositoryListQuery,
  RepositoryResult,
  RepositoryUpdate,
} from './contracts';
import {
  repositoryDuplicateId,
  repositoryInvalidLifecycle,
  repositoryNotFound,
  repositoryRevisionConflict,
  repositoryWorkspaceMismatch,
} from './errors';

function clone<TEntity>(value: TEntity): TEntity {
  return structuredClone(value);
}

function nextRevision(revision: Revision): Revision {
  return (Number(revision) + 1) as Revision;
}

export class InMemoryRepository<TEntity extends BaseEntity> implements Repository<TEntity> {
  private readonly records = new Map<string, TEntity>();

  async getById(id: EntityId, workspaceId: WorkspaceId): Promise<RepositoryResult<TEntity | null>> {
    const entity = this.records.get(String(id));
    if (!entity) return ok(null);
    if (entity.workspaceId !== workspaceId) return err(repositoryWorkspaceMismatch());
    return ok(clone(entity));
  }

  async list(query: RepositoryListQuery): Promise<RepositoryResult<readonly TEntity[]>> {
    const states = query.lifecycleStates ?? ['active'];
    const results = [...this.records.values()]
      .filter((entity) => entity.workspaceId === query.workspaceId && states.includes(entity.lifecycleState))
      .map(clone);
    return ok(results);
  }

  async create(entity: TEntity): Promise<RepositoryResult<TEntity>> {
    const key = String(entity.id);
    if (this.records.has(key)) return err(repositoryDuplicateId());
    if (Number(entity.revision) !== 1) {
      return err(repositoryInvalidLifecycle('New records must begin at revision 1.'));
    }
    this.records.set(key, clone(entity));
    return ok(clone(entity));
  }

  async update(request: RepositoryUpdate<TEntity>): Promise<RepositoryResult<TEntity>> {
    const currentResult = this.requireEntity(request.id, request.workspaceId);
    if (!currentResult.ok) return currentResult;
    const current = currentResult.value;
    if (current.revision !== request.expectedRevision) {
      return err(repositoryRevisionConflict(Number(request.expectedRevision), Number(current.revision)));
    }
    if (current.lifecycleState === 'deleted') {
      return err(repositoryInvalidLifecycle('Deleted records must be restored before they can be edited.'));
    }

    const updated = {
      ...current,
      ...request.patch,
      updatedAt: request.context.at,
      updatedBy: request.context.actorId,
      revision: nextRevision(current.revision),
    } as TEntity;
    this.records.set(String(updated.id), clone(updated));
    return ok(clone(updated));
  }

  async softDelete(request: RepositoryLifecycleMutation): Promise<RepositoryResult<TEntity>> {
    return this.changeLifecycle(request, 'deleted');
  }

  async restore(request: RepositoryLifecycleMutation): Promise<RepositoryResult<TEntity>> {
    const currentResult = this.requireEntity(request.id, request.workspaceId);
    if (!currentResult.ok) return currentResult;
    if (currentResult.value.lifecycleState !== 'deleted') {
      return err(repositoryInvalidLifecycle('Only deleted records can be restored.'));
    }
    return this.changeLifecycle(request, 'active');
  }

  private requireEntity(id: EntityId, workspaceId: WorkspaceId): RepositoryResult<TEntity> {
    const entity = this.records.get(String(id));
    if (!entity) return err(repositoryNotFound());
    if (entity.workspaceId !== workspaceId) return err(repositoryWorkspaceMismatch());
    return ok(entity);
  }

  private async changeLifecycle(
    request: RepositoryLifecycleMutation,
    lifecycleState: TEntity['lifecycleState'],
  ): Promise<RepositoryResult<TEntity>> {
    const currentResult = this.requireEntity(request.id, request.workspaceId);
    if (!currentResult.ok) return currentResult;
    const current = currentResult.value;
    if (current.revision !== request.expectedRevision) {
      return err(repositoryRevisionConflict(Number(request.expectedRevision), Number(current.revision)));
    }
    if (current.lifecycleState === lifecycleState) {
      return err(repositoryInvalidLifecycle(`Record is already ${lifecycleState}.`));
    }

    const updated = {
      ...current,
      lifecycleState,
      updatedAt: request.context.at,
      updatedBy: request.context.actorId,
      revision: nextRevision(current.revision),
    } as TEntity;
    this.records.set(String(updated.id), clone(updated));
    return ok(clone(updated));
  }
}
