import { PowerSyncDatabase, type CommonPowerSyncDatabase } from '@powersync/web';
import { foundationPowerSyncSchema } from './schema';

export interface PowerSyncDatabaseOptions {
  readonly dbFilename?: string;
}

/**
 * Creates a persistent browser SQLite database using PowerSync's default Web VFS.
 * Phase 1 deliberately keeps the default VFS for compatibility; alternative OPFS
 * modes are a later measured optimization, not a Foundation requirement.
 */
export function createFoundationPowerSyncDatabase(
  options: PowerSyncDatabaseOptions = {},
): CommonPowerSyncDatabase {
  return new PowerSyncDatabase({
    schema: foundationPowerSyncSchema,
    database: {
      dbFilename: options.dbFilename ?? 'uaf-foundation.sqlite',
    },
  });
}
