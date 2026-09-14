import type { BaseEntity, EntityId } from '@uaf/core';

export type AssetCategory = 'appliance' | 'electronics' | 'furniture' | 'other';
export type LocalDate = string;
export type CurrencyCode = string;

export interface MoneyAmount {
  readonly amountMinor: number;
  readonly currency: CurrencyCode;
}

export interface HouseholdAsset extends BaseEntity {
  readonly name: string;
  readonly category: AssetCategory;
  readonly purchaseDate: LocalDate | null;
  readonly purchasePrice: MoneyAmount | null;
  readonly warrantyExpiresOn: LocalDate | null;
  readonly notes: string | null;
}

export interface AssetServiceRecord extends BaseEntity {
  readonly assetId: EntityId;
  readonly serviceDate: LocalDate;
  readonly cost: MoneyAmount | null;
  readonly provider: string | null;
  readonly notes: string | null;
}

export interface DomainValidationIssue {
  readonly code: string;
  readonly severity: 'warning' | 'error';
  readonly field?: string;
  readonly message: string;
}
