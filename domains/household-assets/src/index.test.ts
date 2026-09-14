import { describe, expect, it } from 'vitest';
import type { EntityId, IsoDateTime } from '@uaf/core';
import { calculateLifetimeServiceCost, calculateWarrantyStatus, isLocalDate, validateMoney } from './index.js';

const calculatedAt = '2026-09-14T04:00:00.000Z' as IsoDateTime;

describe('household assets domain', () => {
  it('validates real calendar dates rather than regex alone', () => {
    expect(isLocalDate('2026-02-28')).toBe(true);
    expect(isLocalDate('2026-02-31')).toBe(false);
  });

  it('classifies warranty boundary dates', () => {
    const base = {
      id: 'asset-1' as EntityId,
      workspaceId: 'workspace-1' as any,
      createdAt: calculatedAt,
      updatedAt: calculatedAt,
      createdBy: null,
      updatedBy: null,
      revision: 1 as any,
      lifecycleState: 'active' as const,
      source: { type: 'manual' as const },
      dataQuality: 'complete' as const,
      confidence: 'high' as const,
      metadata: {},
      name: 'Refrigerator',
      category: 'appliance' as const,
      purchaseDate: '2026-01-01',
      purchasePrice: null,
      notes: null,
    };
    expect(calculateWarrantyStatus({ ...base, warrantyExpiresOn: '2026-09-14' }, '2026-09-14', calculatedAt).value).toBe('expiring_soon');
    expect(calculateWarrantyStatus({ ...base, warrantyExpiresOn: '2026-10-20' }, '2026-09-14', calculatedAt).value).toBe('active');
    expect(calculateWarrantyStatus({ ...base, warrantyExpiresOn: '2026-09-13' }, '2026-09-14', calculatedAt).value).toBe('expired');
  });

  it('keeps service-cost currencies separate', () => {
    const makeRecord = (id: string, currency: string, amountMinor: number) => ({
      id: id as EntityId,
      workspaceId: 'workspace-1' as any,
      createdAt: calculatedAt,
      updatedAt: calculatedAt,
      createdBy: null,
      updatedBy: null,
      revision: 1 as any,
      lifecycleState: 'active' as const,
      source: { type: 'manual' as const },
      dataQuality: 'complete' as const,
      confidence: 'high' as const,
      metadata: {},
      assetId: 'asset-1' as EntityId,
      serviceDate: '2026-01-01',
      cost: { currency, amountMinor },
      provider: null,
      notes: null,
    });
    expect(calculateLifetimeServiceCost([makeRecord('1', 'INR', 10000), makeRecord('2', 'INR', 2500), makeRecord('3', 'USD', 100)], calculatedAt).value).toEqual([
      { currency: 'INR', amountMinor: 12500 },
      { currency: 'USD', amountMinor: 100 },
    ]);
  });

  it('rejects decimal minor-unit amounts', () => {
    expect(validateMoney({ currency: 'INR', amountMinor: 12.5 }, 'cost').some((issue) => issue.severity === 'error')).toBe(true);
  });
});
