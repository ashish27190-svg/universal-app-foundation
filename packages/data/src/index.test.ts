import { describe, expect, it } from 'vitest';
import type { BaseEntity, EntityId, IsoDateTime, Revision, UserId, WorkspaceId } from '@uaf/core';
import { InMemoryRepository } from './index';

interface TestEntity extends BaseEntity {
  readonly name: string;
}

const asEntityId = (value: string) => value as EntityId;
const asWorkspaceId = (value: string) => value as WorkspaceId;
const asUserId = (value: string) => value as UserId;
const asTime = (value: string) => value as IsoDateTime;
const asRevision = (value: number) => value as Revision;

function entity(overrides: Partial<TestEntity> = {}): TestEntity {
  return {
    id: asEntityId('00000000-0000-4000-8000-000000000001'),
    workspaceId: asWorkspaceId('00000000-0000-4000-8000-000000000010'),
    name: 'Fridge',
    createdAt: asTime('2026-09-14T01:00:00.000Z'),
    updatedAt: asTime('2026-09-14T01:00:00.000Z'),
    createdBy: asUserId('00000000-0000-4000-8000-000000000100'),
    updatedBy: asUserId('00000000-0000-4000-8000-000000000100'),
    revision: asRevision(1),
    lifecycleState: 'active',
    source: { type: 'manual' },
    dataQuality: 'complete',
    confidence: 'high',
    metadata: {},
    ...overrides,
  };
}

describe('InMemoryRepository contract', () => {
  it('creates and retrieves a record inside the workspace', async () => {
    const repository = new InMemoryRepository<TestEntity>();
    const created = await repository.create(entity());
    expect(created.ok).toBe(true);
    const found = await repository.getById(entity().id, entity().workspaceId);
    expect(found.ok && found.value?.name).toBe('Fridge');
  });

  it('increments revision on a valid update', async () => {
    const repository = new InMemoryRepository<TestEntity>();
    await repository.create(entity());
    const updated = await repository.update({
      id: entity().id,
      workspaceId: entity().workspaceId,
      expectedRevision: asRevision(1),
      patch: { name: 'Refrigerator' },
      context: { actorId: entity().createdBy, at: asTime('2026-09-14T02:00:00.000Z') },
    });
    expect(updated.ok && Number(updated.value.revision)).toBe(2);
  });

  it('rejects stale revisions', async () => {
    const repository = new InMemoryRepository<TestEntity>();
    await repository.create(entity({ revision: asRevision(2) }));
    // creation at revision 2 is itself invalid, so create a valid row then advance it.
    const validRepository = new InMemoryRepository<TestEntity>();
    await validRepository.create(entity());
    await validRepository.update({
      id: entity().id,
      workspaceId: entity().workspaceId,
      expectedRevision: asRevision(1),
      patch: { name: 'Updated' },
      context: { actorId: entity().createdBy, at: asTime('2026-09-14T02:00:00.000Z') },
    });
    const stale = await validRepository.update({
      id: entity().id,
      workspaceId: entity().workspaceId,
      expectedRevision: asRevision(1),
      patch: { name: 'Stale' },
      context: { actorId: entity().createdBy, at: asTime('2026-09-14T03:00:00.000Z') },
    });
    expect(stale.ok).toBe(false);
    if (!stale.ok) expect(stale.error.code).toBe('DATA-002');
  });

  it('soft deletes and restores without changing identity', async () => {
    const repository = new InMemoryRepository<TestEntity>();
    await repository.create(entity());
    const deleted = await repository.softDelete({
      id: entity().id,
      workspaceId: entity().workspaceId,
      expectedRevision: asRevision(1),
      context: { actorId: entity().createdBy, at: asTime('2026-09-14T02:00:00.000Z') },
    });
    expect(deleted.ok && deleted.value.lifecycleState).toBe('deleted');
    if (!deleted.ok) return;
    const restored = await repository.restore({
      id: deleted.value.id,
      workspaceId: deleted.value.workspaceId,
      expectedRevision: deleted.value.revision,
      context: { actorId: entity().createdBy, at: asTime('2026-09-14T03:00:00.000Z') },
    });
    expect(restored.ok && restored.value.lifecycleState).toBe('active');
  });
});
