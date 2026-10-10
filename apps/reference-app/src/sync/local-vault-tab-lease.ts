/**
 * Protect the persistent Household Vault SQLite file from simultaneous access
 * by multiple tabs under different Supabase sessions.
 *
 * Browser Web Locks are cross-tab, same-origin and automatically released if
 * the owning document closes/crashes. Do NOT silently fall back to localStorage
 * timestamps: they are not an atomic mutual-exclusion primitive.
 */
export const LOCAL_VAULT_TAB_LOCK_NAME = 'uaf.household-vault.sqlite.exclusive.v1';

export class LocalVaultBusyError extends Error {
  constructor() {
    super('Household Vault is already open in another tab. Close the other tab, then retry here. No local changes were deleted.');
    this.name = 'LocalVaultBusyError';
  }
}

export class LocalVaultTabLease {
  private releaseHolding: (() => void) | null = null;
  private requestFinished: Promise<void> | null = null;

  async acquire(): Promise<void> {
    if (this.releaseHolding) return;
    if (typeof navigator === 'undefined' || !navigator.locks?.request) {
      throw new Error('This browser cannot safely isolate the local vault across tabs. Use a browser supporting Web Locks.');
    }

    let ready!: (granted: boolean) => void;
    const availability = new Promise<boolean>((resolve) => { ready = resolve; });
    const running = navigator.locks.request(
      LOCAL_VAULT_TAB_LOCK_NAME,
      { mode: 'exclusive', ifAvailable: true },
      async (lock) => {
        if (!lock) {
          ready(false);
          return;
        }
        let release!: () => void;
        const holding = new Promise<void>((resolve) => { release = resolve; });
        this.releaseHolding = release;
        ready(true);
        await holding;
      },
    );
    // Hold the request promise until explicit release. If the callback is
    // rejected during acquisition, propagate the error, not an endless wait.
    this.requestFinished = running.then(() => undefined);
    const granted = await Promise.race([
      availability,
      running.then(() => false),
    ]);
    if (!granted) {
      await running;
      this.requestFinished = null;
      throw new LocalVaultBusyError();
    }
  }

  async release(): Promise<void> {
    const release = this.releaseHolding;
    if (!release) return;
    release();
    await this.requestFinished;
    this.releaseHolding = null;
    this.requestFinished = null;
  }
}
