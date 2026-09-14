import type { CalculationId, CalculationResult, IsoDateTime } from '@uaf/core';
import type { AssetServiceRecord, HouseholdAsset, LocalDate } from './types.js';
import { isLocalDate } from './validation.js';

export type WarrantyStatus = 'active' | 'expiring_soon' | 'expired' | 'unknown';

export const WARRANTY_STATUS_CALCULATION = {
  id: 'household.warranty-status' as CalculationId,
  name: 'Warranty Status',
  version: '1.0.0',
  description: 'Classifies an asset warranty relative to a supplied local calendar date.',
} as const;

export function calculateWarrantyStatus(
  asset: HouseholdAsset,
  today: LocalDate,
  calculatedAt: IsoDateTime,
  expiringSoonDays = 30,
): CalculationResult<WarrantyStatus> {
  if (!isLocalDate(today)) throw new Error('today must be a valid YYYY-MM-DD date.');
  const expiry = asset.warrantyExpiresOn;
  if (!expiry || !isLocalDate(expiry)) {
    return {
      calculationId: WARRANTY_STATUS_CALCULATION.id,
      calculationVersion: WARRANTY_STATUS_CALCULATION.version,
      value: 'unknown',
      confidence: 'low',
      calculatedAt,
      evidence: { inputsUsed: [], inputsExcluded: ['warrantyExpiresOn'] },
      explanation: 'Warranty status is unknown because no valid warranty expiry date is available.',
    };
  }

  const todayMs = Date.parse(`${today}T00:00:00Z`);
  const expiryMs = Date.parse(`${expiry}T00:00:00Z`);
  const daysRemaining = Math.ceil((expiryMs - todayMs) / 86_400_000);
  const value: WarrantyStatus = daysRemaining < 0 ? 'expired' : daysRemaining <= expiringSoonDays ? 'expiring_soon' : 'active';
  return {
    calculationId: WARRANTY_STATUS_CALCULATION.id,
    calculationVersion: WARRANTY_STATUS_CALCULATION.version,
    value,
    confidence: 'high',
    calculatedAt,
    evidence: { inputsUsed: ['warrantyExpiresOn', 'today', 'expiringSoonDays'] },
    explanation: `Warranty has ${daysRemaining} day(s) remaining relative to ${today}.`,
  };
}

export interface CurrencyTotal {
  readonly currency: string;
  readonly amountMinor: number;
}

export const LIFETIME_SERVICE_COST_CALCULATION = {
  id: 'household.lifetime-service-cost' as CalculationId,
  name: 'Lifetime Service Cost',
  version: '1.0.0',
  description: 'Sums active service-record costs by currency without converting currencies.',
} as const;

export function calculateLifetimeServiceCost(
  records: readonly AssetServiceRecord[],
  calculatedAt: IsoDateTime,
): CalculationResult<readonly CurrencyTotal[]> {
  const totals = new Map<string, number>();
  let excluded = 0;
  for (const record of records) {
    if (record.lifecycleState !== 'active' || !record.cost) {
      excluded += 1;
      continue;
    }
    totals.set(record.cost.currency, (totals.get(record.cost.currency) ?? 0) + record.cost.amountMinor);
  }
  const value = [...totals.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([currency, amountMinor]) => ({ currency, amountMinor }));
  return {
    calculationId: LIFETIME_SERVICE_COST_CALCULATION.id,
    calculationVersion: LIFETIME_SERVICE_COST_CALCULATION.version,
    value,
    confidence: excluded === 0 ? 'high' : 'medium',
    calculatedAt,
    evidence: {
      inputsUsed: [`${records.length - excluded} active service record(s) with cost`],
      ...(excluded ? { inputsExcluded: [`${excluded} deleted or costless service record(s)`] } : {}),
      assumptions: ['Currencies are not converted; totals remain separated by currency.'],
    },
    explanation: value.length ? 'Service costs are summed by currency.' : 'No active service costs are available.',
  };
}
