import { describe, expect, it } from 'vitest';
import {
  UAF_CORE_VERSION,
  createAppError,
  err,
  isErr,
  isOk,
  ok,
  type AppError,
  type BaseEntity,
  type CalculationResult,
  type DomainCommand,
  type DomainEvent,
} from './index';

const asId = <T>(value: string | number) => value as T;

describe('@uaf/core', () => {
  it('exposes the BUILD 0.2 marker', () => {
    expect(UAF_CORE_VERSION).toBe('0.3.0-build.0.7');
  });

  it('models durable entity metadata without device sync state', () => {
    const entity: BaseEntity = {
      id: asId('asset-1'),
      workspaceId: asId('workspace-1'),
      createdAt: asId('2026-09-14T01:00:00.000Z'),
      updatedAt: asId('2026-09-14T01:00:00.000Z'),
      createdBy: asId('user-1'),
      updatedBy: asId('user-1'),
      revision: asId(1),
      lifecycleState: 'active',
      source: { type: 'manual' },
      dataQuality: 'complete',
      confidence: 'high',
      metadata: {},
    };

    expect(entity.lifecycleState).toBe('active');
    expect('syncState' in entity).toBe(false);
  });

  it('supports serializable domain commands and events', () => {
    const command: DomainCommand<{ name: string }> = {
      commandId: asId('command-1'),
      type: 'householdAsset.create',
      context: {
        workspaceId: asId('workspace-1'),
        requestedBy: asId('user-1'),
        requestedAt: asId('2026-09-14T01:00:00.000Z'),
      },
      payload: { name: 'Refrigerator' },
    };

    const event: DomainEvent<{ name: string }> = {
      eventId: asId('event-1'),
      type: 'householdAsset.created',
      occurredAt: asId('2026-09-14T01:00:01.000Z'),
      workspaceId: command.context.workspaceId,
      actor: { type: 'user', userId: command.context.requestedBy },
      payload: command.payload,
    };

    expect(JSON.parse(JSON.stringify(event))).toMatchObject({ type: 'householdAsset.created' });
  });

  it('provides typed success and failure results', () => {
    const success = ok({ saved: true });
    const failure = err('denied');

    expect(isOk(success)).toBe(true);
    expect(isErr(success)).toBe(false);
    expect(isErr(failure)).toBe(true);
  });

  it('creates immutable structured application errors', () => {
    const source: AppError = {
      code: 'AUTH-001',
      category: 'auth',
      severity: 'error',
      userMessage: 'Please sign in again.',
      retryable: false,
      recoveryAction: 'Sign in',
    };

    const error = createAppError(source);
    expect(error).toEqual(source);
    expect(Object.isFrozen(error)).toBe(true);
  });

  it('models explainable calculation results', () => {
    const result: CalculationResult<number> = {
      calculationId: asId('lifetime-service-cost'),
      calculationVersion: '1',
      value: 12500,
      unit: 'INR',
      confidence: 'high',
      calculatedAt: asId('2026-09-14T01:00:00.000Z'),
      evidence: {
        inputsUsed: ['service-1', 'service-2'],
        inputsExcluded: [],
        assumptions: [],
      },
      explanation: 'Sum of all included service records.',
    };

    expect(result.value).toBe(12500);
    expect(result.evidence.inputsUsed).toHaveLength(2);
  });
});
