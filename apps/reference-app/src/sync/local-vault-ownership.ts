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
  readonly acquireTab: () => Promise<void>;
  readonly releaseTab: () => Promise<void>;
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
      // Acquire the cross-tab mutex BEFORE reading owner, checking pending
      // SQLite writes, or starting a sync connector for the new identity.
      await this.io.acquireTab();
      let cleanupDisconnectRequired = false;
      try {
        const diskOwner = this.io.readOwner();
        if (this.connectedUser === userId && diskOwner === userId) return;

        // An auth switch must halt the OLD uploader before we inspect its
        // pending queue. Otherwise it could fetch a JWT for the NEW user.
        if (this.connectedUser !== null && (this.connectedUser !== userId || diskOwner !== userId)) {
          await this.io.disconnect();
          this.connectedUser = null;
        }
        if (diskOwner !== userId) {
          const pending = await this.io.pendingCount();
          if (pending > 0) throw new LocalVaultOwnershipConflictError();
          // Clear before writing the new marker. A failed clear leaves the
          // prior marker in place and must never attach a second account.
          cleanupDisconnectRequired = true;
          await this.io.clearDatabase();
          cleanupDisconnectRequired = false;
          this.connectedUser = null;
          this.io.writeOwner(userId);
        }
        cleanupDisconnectRequired = true;
        await this.io.connect();
        cleanupDisconnectRequired = false;
        this.connectedUser = userId;
      } catch (error) {
        // An unsuccessful new attachment must not hold the mutex. Ensure no
        // partial connector remains active before another tab can acquire.
        // Also stop an already-active connector if readOwner() throws
        // (for example, browser storage revoked mid-session).
        if (cleanupDisconnectRequired || this.connectedUser !== null) await this.io.disconnect();
        this.connectedUser = null;
        await this.io.releaseTab();
        throw error;
      }
    });
  }

  /**
   * On network restoration, attach the remote connector for the same owner
   * without clearing or changing its offline queue. Cross-account reconnect
   * is never allowed.
   */
  reconnectSameOwner(userId: string): Promise<void> {
    return this.serialize(async () => {
      if (!userId.trim() || this.connectedUser !== userId ||
          this.io.readOwner() !== userId) {
        throw new Error('Cannot reconnect a local vault belonging to another account.');
      }
      await this.io.acquireTab();
      await this.io.connect();
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
      await this.io.releaseTab();
    });
  }

  /** Session expired/signed out in another tab: hide data, stop streaming,
   * but do NOT destroy unknown queued local writes. Next attach checks owner. */
  authLost(): Promise<void> {
    return this.serialize(async () => {
      await this.io.disconnect();
      this.connectedUser = null;
      await this.io.releaseTab();
    });
  }
}
