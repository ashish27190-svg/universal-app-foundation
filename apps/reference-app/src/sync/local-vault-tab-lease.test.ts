import { afterEach, describe, expect, it, vi } from 'vitest';
import { LocalVaultBusyError, LocalVaultTabLease, LOCAL_VAULT_TAB_LOCK_NAME } from './local-vault-tab-lease';

function fakeBrowserLocks() {
  let locked = false;
  const request = vi.fn(async (
    _name: string,
    options: { mode: string; ifAvailable: boolean },
    callback: (lock: { name: string } | null) => Promise<void>,
  ) => {
    expect(options).toMatchObject({ mode: 'exclusive', ifAvailable: true });
    const granted = !locked;
    if (granted) locked = true;
    try {
      await callback(granted ? { name: LOCAL_VAULT_TAB_LOCK_NAME } : null);
    } finally {
      if (granted) locked = false;
    }
  });
  vi.stubGlobal('navigator', { locks: { request } });
  return { request, isLocked: () => locked };
}

afterEach(() => vi.unstubAllGlobals());

describe('cross-tab SQLite Web Lock lease', () => {
  it('prevents two tabs from using the same local database at once', async () => {
    const browser = fakeBrowserLocks();
    const first = new LocalVaultTabLease();
    const second = new LocalVaultTabLease();
    await first.acquire();
    expect(browser.isLocked()).toBe(true);
    await expect(second.acquire()).rejects.toBeInstanceOf(LocalVaultBusyError);
    expect(browser.isLocked()).toBe(true);

    // A single tab can refresh its own session without dropping the lease.
    await first.acquire();
    expect(browser.request).toHaveBeenCalledTimes(2);
    await first.release();
    expect(browser.isLocked()).toBe(false);
    await second.acquire();
    expect(browser.isLocked()).toBe(true);
    await second.release();
    expect(browser.isLocked()).toBe(false);
  });

  it('fails closed when Web Locks are unavailable', async () => {
    vi.stubGlobal('navigator', {});
    await expect(new LocalVaultTabLease().acquire()).rejects.toThrow('Web Locks');
  });

  it('allows repeated release after auth-loss without re-opening the SQLite file', async () => {
    const browser = fakeBrowserLocks();
    const lease = new LocalVaultTabLease();
    await lease.acquire();
    await lease.release();
    await lease.release();
    expect(browser.isLocked()).toBe(false);
    expect(browser.request).toHaveBeenCalledTimes(1);
  });
});
