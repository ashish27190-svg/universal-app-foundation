import type { EntityId, IsoDateTime, UserId, WorkspaceId } from '@uaf/core';
import type { AssetCategory, DomainValidationIssue, HouseholdAsset, LocalDate, MoneyAmount } from './types.js';
import { validateHouseholdAsset } from './validation.js';

export interface NewHouseholdAssetInput {
  readonly name: string;
  readonly category: AssetCategory;
  readonly purchaseDate?: LocalDate | null;
  readonly purchasePrice?: MoneyAmount | null;
  readonly warrantyExpiresOn?: LocalDate | null;
  readonly notes?: string | null;
}

export interface HouseholdAssetFactoryContext {
  readonly id: EntityId;
  readonly workspaceId: WorkspaceId;
  readonly actorId: UserId;
  readonly now: IsoDateTime;
}

export interface HouseholdAssetFactoryResult {
  readonly entity: HouseholdAsset;
  readonly issues: readonly DomainValidationIssue[];
}

export function buildNewHouseholdAsset(
  input: NewHouseholdAssetInput,
  context: HouseholdAssetFactoryContext,
): HouseholdAssetFactoryResult {
  const entity: HouseholdAsset = {
    id: context.id,
    workspaceId: context.workspaceId,
    name: input.name.trim(),
    category: input.category,
    purchaseDate: input.purchaseDate ?? null,
    purchasePrice: input.purchasePrice ?? null,
    warrantyExpiresOn: input.warrantyExpiresOn ?? null,
    notes: input.notes?.trim() || null,
    createdAt: context.now,
    updatedAt: context.now,
    createdBy: context.actorId,
    updatedBy: context.actorId,
    revision: 1 as HouseholdAsset['revision'],
    lifecycleState: 'active',
    source: { type: 'manual' },
    dataQuality: 'complete',
    confidence: 'high',
    metadata: {},
  };
  return { entity, issues: validateHouseholdAsset(entity) };
}
