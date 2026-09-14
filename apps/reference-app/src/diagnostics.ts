import { UAF_AUTH_VERSION } from '@uaf/auth';
import { UAF_CONFIG_VERSION } from '@uaf/config';
import { UAF_CORE_VERSION } from '@uaf/core';
import {
  getPendingMutationCount,
  getUnresolvedConflictCount,
  UAF_SYNC_VERSION,
} from '@uaf/sync';
import { UAF_UI_VERSION } from '@uaf/ui';
import { householdVaultManifest } from './app-manifest';
import { powerSyncDatabase, syncStatusStore } from './sync/persistence';
import { runtimeEnvironment } from './services';

export interface ReferenceAppDiagnostics {
  readonly appId: string;
  readonly appVersion: string;
  readonly environment: string;
  readonly coreVersion: string;
  readonly configVersion: string;
  readonly authVersion: string;
  readonly syncVersion: string;
  readonly uiVersion: string;
  readonly syncState: string;
  readonly connected: boolean;
  readonly hasSynced: boolean;
  readonly pendingMutations: number;
  readonly unresolvedConflicts: number;
  readonly lastSyncedAt: string | null;
  readonly clientIdSuffix: string;
}

export async function getReferenceAppDiagnostics(): Promise<ReferenceAppDiagnostics> {
  const [pendingMutations, unresolvedConflicts, clientId] = await Promise.all([
    getPendingMutationCount(powerSyncDatabase),
    getUnresolvedConflictCount(powerSyncDatabase),
    powerSyncDatabase.getClientId(),
  ]);
  const status = syncStatusStore.snapshot;
  return {
    appId: householdVaultManifest.app.id,
    appVersion: householdVaultManifest.app.version,
    environment: runtimeEnvironment.VITE_UAF_ENVIRONMENT,
    coreVersion: UAF_CORE_VERSION,
    configVersion: UAF_CONFIG_VERSION,
    authVersion: UAF_AUTH_VERSION,
    syncVersion: UAF_SYNC_VERSION,
    uiVersion: UAF_UI_VERSION,
    syncState: status.state,
    connected: status.connected,
    hasSynced: status.hasSynced,
    pendingMutations,
    unresolvedConflicts,
    lastSyncedAt: status.lastSyncedAt?.toISOString() ?? null,
    clientIdSuffix: clientId.slice(-8),
  };
}
