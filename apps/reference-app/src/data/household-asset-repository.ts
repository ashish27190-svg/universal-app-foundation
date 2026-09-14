import {
  createAppError,
  err,
  ok,
  type BaseEntity,
  type Confidence,
  type DataQuality,
  type DataSource,
  type EntityId,
  type IsoDateTime,
  type LifecycleState,
  type Revision,
  type SourceType,
  type UserId,
  type WorkspaceId,
} from '@uaf/core';
import {
  repositoryDuplicateId,
  repositoryInvalidLifecycle,
  repositoryNotFound,
  repositoryRevisionConflict,
  type RepositoryLifecycleMutation,
  type RepositoryListQuery,
  type RepositoryResult,
  type RepositoryUpdate,
} from '@uaf/data';
import type { HouseholdAsset, HouseholdAssetRepository, MoneyAmount } from '@uaf/household-assets';
import {
  createMutationId,
  encodeMutationMetadata,
  type LocalSqlDatabase,
  type MutationOperation,
} from '@uaf/sync';

interface HouseholdAssetRow {
  id: string;
  workspace_id: string;
  name: string;
  category: HouseholdAsset['category'];
  purchase_date: string | null;
  purchase_price_minor: number | null;
  purchase_currency: string | null;
  warranty_expires_on: string | null;
  notes: string | null;
  revision: number;
  lifecycle_state: LifecycleState;
  source: SourceType;
  source_reference: string | null;
  data_quality: DataQuality;
  confidence: Confidence;
  metadata: string | Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

function metadataObject(value: HouseholdAssetRow['metadata']): Readonly<Record<string, unknown>> {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function money(amountMinor: number | null, currency: string | null): MoneyAmount | null {
  return amountMinor === null || currency === null ? null : { amountMinor, currency };
}

function toEntity(row: HouseholdAssetRow): HouseholdAsset {
  const source: DataSource = { type: row.source, ...(row.source_reference ? { reference: row.source_reference } : {}) };
  return {
    id: row.id as EntityId,
    workspaceId: row.workspace_id as WorkspaceId,
    name: row.name,
    category: row.category,
    purchaseDate: row.purchase_date,
    purchasePrice: money(row.purchase_price_minor, row.purchase_currency),
    warrantyExpiresOn: row.warranty_expires_on,
    notes: row.notes,
    revision: row.revision as Revision,
    lifecycleState: row.lifecycle_state,
    source,
    dataQuality: row.data_quality,
    confidence: row.confidence,
    metadata: metadataObject(row.metadata),
    createdAt: row.created_at as IsoDateTime,
    updatedAt: row.updated_at as IsoDateTime,
    createdBy: row.created_by as UserId | null,
    updatedBy: row.updated_by as UserId | null,
  };
}

function storageError(error: unknown) {
  return createAppError({
    code: 'DATA-LOCAL-001',
    category: 'storage',
    severity: 'error',
    userMessage: 'The record could not be saved on this device.',
    retryable: true,
    technicalContext: { message: error instanceof Error ? error.message : String(error) },
  });
}

function sourceColumns(entity: BaseEntity) {
  return [entity.source.type, entity.source.reference ?? null];
}

function mutationMetadata(workspaceId: WorkspaceId, operation: MutationOperation, expectedRevision: Revision | null) {
  return encodeMutationMetadata({
    version: 1,
    mutationId: createMutationId(),
    workspaceId,
    operation,
    expectedRevision,
  });
}

export class PowerSyncHouseholdAssetRepository implements HouseholdAssetRepository {
  constructor(private readonly db: LocalSqlDatabase) {}

  async getById(id: EntityId, workspaceId: WorkspaceId): Promise<RepositoryResult<HouseholdAsset | null>> {
    try {
      const rows = await this.db.getAll<HouseholdAssetRow>(
        'SELECT * FROM household_assets WHERE id = ? AND workspace_id = ? LIMIT 1',
        [String(id), String(workspaceId)],
      );
      return ok(rows[0] ? toEntity(rows[0]) : null);
    } catch (error) {
      return err(storageError(error));
    }
  }

  async list(query: RepositoryListQuery): Promise<RepositoryResult<readonly HouseholdAsset[]>> {
    try {
      const states = query.lifecycleStates ?? ['active'];
      const placeholders = states.map(() => '?').join(',');
      const rows = await this.db.getAll<HouseholdAssetRow>(
        `SELECT * FROM household_assets WHERE workspace_id = ? AND lifecycle_state IN (${placeholders}) ORDER BY updated_at DESC`,
        [String(query.workspaceId), ...states],
      );
      return ok(rows.map(toEntity));
    } catch (error) {
      return err(storageError(error));
    }
  }


  watchList(
    query: RepositoryListQuery,
    observer: { onData: (assets: readonly HouseholdAsset[]) => void; onError?: (error: Error) => void },
  ): () => void {
    const states = query.lifecycleStates ?? ['active'];
    const placeholders = states.map(() => '?').join(',');
    return this.db.watch<HouseholdAssetRow>(
      `SELECT * FROM household_assets WHERE workspace_id = ? AND lifecycle_state IN (${placeholders}) ORDER BY updated_at DESC`,
      [String(query.workspaceId), ...states],
      {
        onData: (rows) => observer.onData(rows.map(toEntity)),
        ...(observer.onError ? { onError: observer.onError } : {}),
      },
    );
  }

  async create(entity: HouseholdAsset): Promise<RepositoryResult<HouseholdAsset>> {
    if (Number(entity.revision) !== 1 || entity.lifecycleState !== 'active') {
      return err(repositoryInvalidLifecycle('New assets must begin active at revision 1.'));
    }
    const existing = await this.getById(entity.id, entity.workspaceId);
    if (!existing.ok) return existing;
    if (existing.value) return err(repositoryDuplicateId());
    try {
      const [source, sourceReference] = sourceColumns(entity);
      await this.db.execute(
        `INSERT INTO household_assets (
          id, workspace_id, name, category, purchase_date, purchase_price_minor, purchase_currency,
          warranty_expires_on, notes, revision, lifecycle_state, source, source_reference,
          data_quality, confidence, metadata, created_at, updated_at, created_by, updated_by, _metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          String(entity.id), String(entity.workspaceId), entity.name, entity.category, entity.purchaseDate,
          entity.purchasePrice?.amountMinor ?? null, entity.purchasePrice?.currency ?? null,
          entity.warrantyExpiresOn, entity.notes, 1, 'active', source, sourceReference,
          entity.dataQuality, entity.confidence, JSON.stringify(entity.metadata), entity.createdAt, entity.updatedAt,
          entity.createdBy ? String(entity.createdBy) : null, entity.updatedBy ? String(entity.updatedBy) : null,
          mutationMetadata(entity.workspaceId, 'create', null),
        ],
      );
      return ok(entity);
    } catch (error) {
      return err(storageError(error));
    }
  }

  async update(request: RepositoryUpdate<HouseholdAsset>): Promise<RepositoryResult<HouseholdAsset>> {
    const currentResult = await this.getById(request.id, request.workspaceId);
    if (!currentResult.ok) return currentResult;
    const current = currentResult.value;
    if (!current) return err(repositoryNotFound());
    if (current.revision !== request.expectedRevision) return err(repositoryRevisionConflict(Number(request.expectedRevision), Number(current.revision)));
    if (current.lifecycleState === 'deleted') return err(repositoryInvalidLifecycle('Deleted assets must be restored before editing.'));

    const next: HouseholdAsset = {
      ...current,
      ...request.patch,
      updatedAt: request.context.at,
      updatedBy: request.context.actorId,
      revision: (Number(current.revision) + 1) as Revision,
    };
    try {
      const [source, sourceReference] = sourceColumns(next);
      const result = await this.db.execute(
        `UPDATE household_assets SET
          name = ?, category = ?, purchase_date = ?, purchase_price_minor = ?, purchase_currency = ?,
          warranty_expires_on = ?, notes = ?, revision = ?, source = ?, source_reference = ?, data_quality = ?,
          confidence = ?, metadata = ?, updated_at = ?, updated_by = ?, _metadata = ?
         WHERE id = ? AND workspace_id = ? AND revision = ? RETURNING id`,
        [
          next.name, next.category, next.purchaseDate, next.purchasePrice?.amountMinor ?? null, next.purchasePrice?.currency ?? null,
          next.warrantyExpiresOn, next.notes, Number(next.revision), source, sourceReference, next.dataQuality,
          next.confidence, JSON.stringify(next.metadata), next.updatedAt, next.updatedBy ? String(next.updatedBy) : null,
          mutationMetadata(request.workspaceId, 'update', request.expectedRevision),
          String(request.id), String(request.workspaceId), Number(request.expectedRevision),
        ],
      );
      if ((result.rows?.length ?? 0) === 0) {
        const latest = await this.getById(request.id, request.workspaceId);
        if (latest.ok && latest.value) return err(repositoryRevisionConflict(Number(request.expectedRevision), Number(latest.value.revision)));
        return err(repositoryNotFound());
      }
      return ok(next);
    } catch (error) {
      return err(storageError(error));
    }
  }

  softDelete(request: RepositoryLifecycleMutation): Promise<RepositoryResult<HouseholdAsset>> {
    return this.changeLifecycle(request, 'deleted', 'soft_delete');
  }

  restore(request: RepositoryLifecycleMutation): Promise<RepositoryResult<HouseholdAsset>> {
    return this.changeLifecycle(request, 'active', 'restore');
  }

  private async changeLifecycle(
    request: RepositoryLifecycleMutation,
    target: 'active' | 'deleted',
    operation: 'restore' | 'soft_delete',
  ): Promise<RepositoryResult<HouseholdAsset>> {
    const currentResult = await this.getById(request.id, request.workspaceId);
    if (!currentResult.ok) return currentResult;
    const current = currentResult.value;
    if (!current) return err(repositoryNotFound());
    if (current.revision !== request.expectedRevision) return err(repositoryRevisionConflict(Number(request.expectedRevision), Number(current.revision)));
    if (target === 'deleted' && current.lifecycleState === 'deleted') return err(repositoryInvalidLifecycle('Asset is already deleted.'));
    if (target === 'active' && current.lifecycleState !== 'deleted') return err(repositoryInvalidLifecycle('Only deleted assets can be restored.'));

    const next = {
      ...current,
      lifecycleState: target,
      updatedAt: request.context.at,
      updatedBy: request.context.actorId,
      revision: (Number(current.revision) + 1) as Revision,
    } as HouseholdAsset;
    try {
      const result = await this.db.execute(
        'UPDATE household_assets SET lifecycle_state = ?, revision = ?, updated_at = ?, updated_by = ?, _metadata = ? WHERE id = ? AND workspace_id = ? AND revision = ? RETURNING id',
        [
          target, Number(next.revision), next.updatedAt, next.updatedBy ? String(next.updatedBy) : null,
          mutationMetadata(request.workspaceId, operation, request.expectedRevision), String(request.id), String(request.workspaceId), Number(request.expectedRevision),
        ],
      );
      if ((result.rows?.length ?? 0) === 0) {
        const latest = await this.getById(request.id, request.workspaceId);
        if (latest.ok && latest.value) return err(repositoryRevisionConflict(Number(request.expectedRevision), Number(latest.value.revision)));
        return err(repositoryNotFound());
      }
      return ok(next);
    } catch (error) {
      return err(storageError(error));
    }
  }
}
