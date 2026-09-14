import { describe, expect, it } from 'vitest';
import { mapPowerSyncStatus } from './status';

function status(overrides: Record<string, unknown> = {}) {
  return {
    connected: true,
    connecting: false,
    uploading: false,
    downloading: false,
    hasSynced: true,
    uploadError: undefined,
    downloadError: undefined,
    lastSyncedAt: undefined,
    ...overrides,
  } as never;
}

describe('UAF sync status mapping', () => {
  it('is stable idle after completed sync', () => {
    expect(mapPowerSyncStatus(status(), 0).state).toBe('idle');
  });

  it('only reports syncing while active sync/connection work is occurring', () => {
    expect(mapPowerSyncStatus(status({ uploading: true }), 0).state).toBe('syncing');
  });

  it('reports queued local changes separately from active syncing', () => {
    expect(mapPowerSyncStatus(status(), 3).state).toBe('pending');
  });

  it('prioritizes sync errors as attention required', () => {
    expect(mapPowerSyncStatus(status({ uploadError: new Error('failed') }), 2).state).toBe(
      'attention_required',
    );
  });

  it('reports browser offline explicitly', () => {
    expect(mapPowerSyncStatus(status({ connected: false }), 2, false).state).toBe('offline');
  });

  it('reports unresolved conflicts as attention required even when transport is healthy', () => {
    expect(mapPowerSyncStatus(status(), 0, true, 1).state).toBe('attention_required');
  });
});
