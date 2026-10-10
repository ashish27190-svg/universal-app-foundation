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
import { LOCAL_VAULT_OWNER_KEY, LocalVaultOwnership } from './local-vault-ownership';

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

const localVaultOwnership = new LocalVaultOwnership({
  // Persistent marker is intentionally limited to opaque user ID. If browser
  // storage is blocked, abort rather than risking a cross-account cache.
  readOwner: () => window.localStorage.getItem(LOCAL_VAULT_OWNER_KEY),
  writeOwner: (userId) => window.localStorage.setItem(LOCAL_VAULT_OWNER_KEY, userId),
  removeOwner: () => window.localStorage.removeItem(LOCAL_VAULT_OWNER_KEY),
  pendingCount: () => getPendingMutationCount(powerSyncDatabase),
  clearDatabase: () => powerSyncDatabase.disconnectAndClear(),
  disconnect: () => powerSyncDatabase.disconnect(),
  connect: async () => {
    await powerSyncDatabase.connect(connector);
    await syncStatusStore.refresh();
  },
});

/**
 * Never reuse another signed-in person's persistent local SQLite cache.
 * Transitions are serialized and cannot drop unsynced changes.
 */
export async function connectReferenceAppSync(userId: string): Promise<void> {
  await localVaultOwnership.attach(userId);
}

export async function refreshReferenceAppSyncStatus(): Promise<void> {
  await syncStatusStore.refresh();
}

/**
 * An external auth change (another tab, session expiry) preserves queued data.
 * The next account has to pass the ownership gate before any local UI loads.
 */
export async function pauseReferenceAppSyncForAuthChange(): Promise<void> {
  await localVaultOwnership.authLost();
  await syncStatusStore.refresh();
}

export async function prepareReferenceAppLogout(): Promise<void> {
  await localVaultOwnership.logout();
  await syncStatusStore.refresh();
}
