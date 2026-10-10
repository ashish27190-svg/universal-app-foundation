/**
 * A single browser origin may authenticate different users while PowerSync
 * retains SQLite across reloads. Never attach an account to an unrelated
 * user's cached rows or upload its pending CRUD mutations under another user.
 *
 * This marker is not a security boundary against someone who can tamper with
 * browser storage. It is a fail-closed account handoff and data-loss guard.
 */
export const LOCAL_VAULT_OWNER_KEY = 'uaf.household-vault.local-owner.v1';

export class LocalVaultOwnershipConflictError extends Error {
  constructor() {
    super(
      'This device has unsynced changes from a different or unknown account. ' +
      'Switch back to the account that made them and sync before continuing. ' +
      'The unsynced changes remain safely stored on this device.',
    );
    this.name = 'LocalVaultOwnershipConflictError';
  }
}

export interface LocalVaultOwnershipIO {
  readonly readOwner: () => string | null;
  readonly writeOwner: (userId: string) => void;
  readonly removeOwner: () => void;
  readonly pendingCount: () => Promise<number>;
  readonly clearDatabase: () => Promise<void>;
  readonly disconnect: () => Promise<void>;
  readonly connect: () => Promise<void>;
}

export class LocalVaultOwnership {
  private tail: Promise<void> = Promise.resolve();
  private connectedUser: string | null = null;

  constructor(private readonly io: LocalVaultOwnershipIO) {}

  private serialize<T>(task: () => Promise<T>): Promise<T> {
    const next = this.tail.then(task);
    this.tail = next.then(() => undefined, () => undefined);
    return next;
  }

  attach(userId: string): Promise<void> {
    return this.serialize(async () => {
      if (!userId.trim()) throw new Error('Missing authenticated user identity.');
      const diskOwner = this.io.readOwner();
      if (this.connectedUser === userId && diskOwner === userId) return;
      if (diskOwner !== userId || (this.connectedUser !== null && this.connectedUser !== userId)) {
        const pending = await this.io.pendingCount();
        if (pending > 0) {
          throw new LocalVaultOwnershipConflictError();
        }
        // Clear before writing the new marker. On a failed clear, the old
        // owner remains recorded and a new user is NOT attached.
        await this.io.clearDatabase();
        this.connectedUser = null;
        this.io.writeOwner(userId);
      }
      await this.io.connect();
      this.connectedUser = userId;
    });
  }

  logout(): Promise<void> {
    return this.serialize(async () => {
      const pending = await this.io.pendingCount();
      if (pending > 0) {
        throw new Error(`Cannot sign out while ${pending} local change(s) are waiting to sync.`);
      }
      await this.io.clearDatabase();
      this.connectedUser = null;
      this.io.removeOwner();
    });
  }

  /** Session expired/signed out in another tab: hide data, stop streaming,
   * but do NOT destroy unknown queued local writes. Next attach checks owner. */
  authLost(): Promise<void> {
    return this.serialize(async () => {
      await this.io.disconnect();
      this.connectedUser = null;
    });
  }
}
