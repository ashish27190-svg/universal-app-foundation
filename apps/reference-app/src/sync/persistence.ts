import type { LocalSqlDatabase, LocalSqlWatchObserver } from '@uaf/sync';
import {
  createFoundationPowerSyncDatabase,
  getPendingMutationCount,
  HttpConflictResolver,
  HttpMutationUploader,
  LocalWriteConflictRepository,
  PowerSyncStatusStore,
  UafPowerSyncConnector,
} from '@uaf/sync';
import { PowerSyncHouseholdAssetRepository } from '../data/household-asset-repository';
import { LocalAuditRepository } from '../data/audit-repository';
import { runtimeEnvironment, uafServices } from '../services';

if (!runtimeEnvironment.VITE_POWERSYNC_URL) {
  throw new Error('PowerSync configuration is required by the Household Vault manifest.');
}

const supabaseUrl = runtimeEnvironment.VITE_SUPABASE_URL;
if (!supabaseUrl) throw new Error('Supabase URL is required before sync can start.');

export const powerSyncDatabase = createFoundationPowerSyncDatabase({
  dbFilename: 'household-vault.sqlite',
});

export const localDatabase: LocalSqlDatabase = {
  async execute(sql, parameters = []) {
    const result = await powerSyncDatabase.execute(sql, parameters);
    return {
      ...(result.rows ? { rows: result.rows } : {}),
      ...(typeof result.rowsAffected === 'number' ? { rowsAffected: result.rowsAffected } : {}),
    };
  },
  getAll<T>(sql: string, parameters: any[] = []) {
    return powerSyncDatabase.getAll<T>(sql, parameters);
  },
  watch<T>(sql: string, parameters: any[] = [], observer: LocalSqlWatchObserver<T>) {
    const watched = powerSyncDatabase.query({ sql, parameters }).watch();
    const dispose = watched.registerListener({
      onData: (rows) => observer.onData(rows as readonly T[]),
      onError: (error) => observer.onError?.(error instanceof Error ? error : new Error(String(error))),
    });
    return dispose;
  },
};

export const householdAssetRepository = new PowerSyncHouseholdAssetRepository(localDatabase);
export const auditRepository = new LocalAuditRepository(localDatabase);
export const writeConflictRepository = new LocalWriteConflictRepository(localDatabase);

export const conflictResolver = new HttpConflictResolver({
  endpoint: new URL('/functions/v1/resolve-conflict', supabaseUrl).toString(),
  auth: uafServices.auth,
});

const uploader = new HttpMutationUploader({
  endpoint: new URL('/functions/v1/sync-apply', supabaseUrl).toString(),
  auth: uafServices.auth,
});

const connector = new UafPowerSyncConnector(
  runtimeEnvironment.VITE_POWERSYNC_URL,
  uafServices.auth,
  uploader,
);

export const syncStatusStore = new PowerSyncStatusStore(powerSyncDatabase, {
  isOnline: () => (typeof navigator === 'undefined' ? true : navigator.onLine),
});

let connectionPromise: Promise<void> | null = null;

/** Connect once per authenticated app session. Safe to call repeatedly. */
export async function connectReferenceAppSync(): Promise<void> {
  if (!connectionPromise) {
    connectionPromise = powerSyncDatabase
      .connect(connector)
      .then(() => syncStatusStore.refresh())
      .then(() => undefined)
      .catch((error: unknown) => {
        connectionPromise = null;
        throw error;
      });
  }
  await connectionPromise;
}

export async function refreshReferenceAppSyncStatus(): Promise<void> {
  await syncStatusStore.refresh();
}

/**
 * Logout safety: never clear the local PowerSync database while mutations are
 * still waiting to upload. The UI must surface the pending state instead.
 */
export async function prepareReferenceAppLogout(): Promise<void> {
  const pending = await getPendingMutationCount(powerSyncDatabase);
  if (pending > 0) {
    throw new Error(`Cannot sign out while ${pending} local change(s) are waiting to sync.`);
  }
  connectionPromise = null;
  await powerSyncDatabase.disconnectAndClear();
  await syncStatusStore.refresh();
}
