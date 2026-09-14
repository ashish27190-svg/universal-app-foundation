import type { CommonPowerSyncDatabase, SyncStatus as PowerSyncStatus } from '@powersync/web';

export type SyncState = 'idle' | 'syncing' | 'offline' | 'pending' | 'attention_required';

export interface SyncStatus {
  readonly state: SyncState;
  readonly connected: boolean;
  readonly hasSynced: boolean;
  readonly pendingMutations: number;
  readonly lastSyncedAt?: Date;
  readonly errorMessage?: string;
}

export interface SyncStatusEnvironment {
  readonly isOnline?: () => boolean;
}

export function mapPowerSyncStatus(
  status: PowerSyncStatus,
  pendingMutations: number,
  browserOnline = true,
  unresolvedConflicts = 0,
): SyncStatus {
  const error = status.uploadError ?? status.downloadError;
  let state: SyncState;

  if (error || unresolvedConflicts > 0) state = 'attention_required';
  else if (!browserOnline) state = 'offline';
  else if (status.uploading || status.downloading || status.connecting || status.hasSynced === false) {
    state = 'syncing';
  } else if (pendingMutations > 0) state = 'pending';
  else if (!status.connected) state = 'offline';
  else state = 'idle';

  return {
    state,
    connected: status.connected,
    hasSynced: status.hasSynced === true,
    pendingMutations,
    ...(status.lastSyncedAt ? { lastSyncedAt: status.lastSyncedAt } : {}),
    ...(error ? { errorMessage: error.message } : {}),
  };
}

export async function getPendingMutationCount(database: CommonPowerSyncDatabase): Promise<number> {
  const row = await database.get<{ count: number | string }>('SELECT count(*) AS count FROM ps_crud');
  return Number(row.count) || 0;
}

export async function getUnresolvedConflictCount(database: CommonPowerSyncDatabase): Promise<number> {
  try {
    const row = await database.get<{ count: number | string }>(
      'SELECT count(*) AS count FROM write_conflicts WHERE resolved_at IS NULL',
    );
    return Number(row.count) || 0;
  } catch {
    // During very early schema/bootstrap states the table may not be available yet.
    return 0;
  }
}

export class PowerSyncStatusStore {
  private current: SyncStatus;
  private readonly listeners = new Set<(status: SyncStatus) => void>();
  private readonly unregister: () => void;

  constructor(
    private readonly database: CommonPowerSyncDatabase,
    private readonly environment: SyncStatusEnvironment = {},
  ) {
    this.current = mapPowerSyncStatus(
      database.currentStatus,
      0,
      this.environment.isOnline?.() ?? true,
    );
    this.unregister = database.registerListener({
      statusChanged: () => {
        void this.refresh();
      },
    });
  }

  get snapshot(): SyncStatus {
    return this.current;
  }

  subscribe(listener: (status: SyncStatus) => void): () => void {
    this.listeners.add(listener);
    listener(this.current);
    return () => this.listeners.delete(listener);
  }

  async refresh(): Promise<SyncStatus> {
    const [pending, unresolvedConflicts] = await Promise.all([
      getPendingMutationCount(this.database),
      getUnresolvedConflictCount(this.database),
    ]);
    this.current = mapPowerSyncStatus(
      this.database.currentStatus,
      pending,
      this.environment.isOnline?.() ?? true,
      unresolvedConflicts,
    );
    for (const listener of this.listeners) listener(this.current);
    return this.current;
  }

  dispose(): void {
    this.unregister();
    this.listeners.clear();
  }
}
