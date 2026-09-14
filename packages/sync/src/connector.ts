import type {
  CommonPowerSyncDatabase,
  PowerSyncBackendConnector,
  PowerSyncCredentials,
} from '@powersync/web';
import type { AuthService } from '@uaf/auth';

export interface PowerSyncMutationUploader {
  upload(database: CommonPowerSyncDatabase): Promise<void>;
}

/**
 * PowerSync connector boundary. BUILD 0.6 implements credentials; BUILD 0.7
 * supplies the real mutation uploader that calls the UAF write gateway.
 */
export class UafPowerSyncConnector implements PowerSyncBackendConnector {
  constructor(
    private readonly endpoint: string,
    private readonly auth: AuthService,
    private readonly uploader: PowerSyncMutationUploader,
  ) {}

  async fetchCredentials(): Promise<PowerSyncCredentials | null> {
    const session = await this.auth.getSession();
    if (!session) return null;

    return {
      endpoint: this.endpoint,
      token: session.accessToken,
      ...(session.expiresAt ? { expiresAt: new Date(session.expiresAt * 1000) } : {}),
    };
  }

  async uploadData(database: CommonPowerSyncDatabase): Promise<void> {
    await this.uploader.upload(database);
  }
}
