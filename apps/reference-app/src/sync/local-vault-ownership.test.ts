import { describe, expect, it, vi } from 'vitest';
import { LOCAL_VAULT_OWNER_KEY, LocalVaultOwnership, type LocalVaultOwnershipIO } from './local-vault-ownership';

function fixture(diskOwner: string | null = null, pending = 0) {
  let savedOwner = diskOwner;
  let pendingCount = pending;
  const events: string[] = [];
  let held = false;
  const io: LocalVaultOwnershipIO = {
    acquireTab: async () => { if (!held) { held = true; events.push('lease'); } },
    releaseTab: async () => { if (held) { held = false; events.push('unlock'); } },
    readOwner: () => savedOwner,
    writeOwner: (userId) => { savedOwner = userId; events.push('mark:' + userId); },
    removeOwner: () => { savedOwner = null; events.push('remove'); },
    pendingCount: async () => pendingCount,
    clearDatabase: async () => { events.push('clear'); },
    disconnect: async () => { events.push('disconnect'); },
    connect: async () => { events.push('connect'); },
  };
  return {
    guard: new LocalVaultOwnership(io),
    events,
    owner: () => savedOwner,
    setPending: (value: number) => { pendingCount = value; },
    io,
  };
}

describe('Household Vault local user/cache isolation', () => {
  it('uses a versioned ownership marker, separate from auth tokens', () => {
    expect(LOCAL_VAULT_OWNER_KEY).toContain('local-owner.v1');
  });

  it('clears unclaimed SQLite before the first account can connect', async () => {
    const x = fixture();
    await x.guard.attach('account-A');
    expect(x.events).toEqual(['lease', 'clear', 'mark:account-A', 'connect']);
    expect(x.owner()).toBe('account-A');
    await x.guard.attach('account-A');
    expect(x.events).toHaveLength(4);
  });

  it('retains the same account cache across reload and login refresh', async () => {
    const x = fixture('account-A');
    await x.guard.attach('account-A');
    expect(x.events).toEqual(['lease', 'connect']);
  });

  it('clears a previous user cache before attaching a different account', async () => {
    const x = fixture('account-A');
    await x.guard.attach('account-A');
    await x.guard.attach('account-B');
    expect(x.events).toEqual(['lease', 'connect', 'disconnect', 'clear', 'mark:account-B', 'connect']);
    expect(x.owner()).toBe('account-B');
  });

  it('blocks an account switch when the old owner has unsent writes', async () => {
    const x = fixture('account-A', 2);
    await expect(x.guard.attach('account-B')).rejects.toThrow('unsynced changes');
    expect(x.owner()).toBe('account-A');
    expect(x.events).toEqual(['lease', 'unlock']);
    x.setPending(0);
    await x.guard.attach('account-B');
    expect(x.events).toEqual(['lease', 'unlock', 'lease', 'clear', 'mark:account-B', 'connect']);
  });

  it('allows the original owner to resume after a refused account switch', async () => {
    const x = fixture('account-A', 2);
    await expect(x.guard.attach('account-B')).rejects.toMatchObject({
      name: 'LocalVaultOwnershipConflictError',
    });
    await x.guard.attach('account-A');
    expect(x.events).toEqual(['lease', 'unlock', 'lease', 'connect']);
    expect(x.owner()).toBe('account-A');
  });

  it('does not lose a prior failed identity transition when requests are queued', async () => {
    const x = fixture('account-A', 1);
    const outcomes = await Promise.allSettled([
      x.guard.attach('account-B'),
      x.guard.attach('account-A'),
    ]);
    expect(outcomes.map((v) => v.status)).toEqual(['rejected', 'fulfilled']);
    expect(x.owner()).toBe('account-A');
    expect(x.events).toEqual(['lease', 'unlock', 'lease', 'connect']);
  });

  it('never attaches an unknown owner over orphaned pending writes', async () => {
    const x = fixture(null, 1);
    await expect(x.guard.attach('account-A')).rejects.toThrow('unsynced changes');
    expect(x.events).toEqual(['lease', 'unlock']);
  });

  it('explicit logout preserves queued changes; clears only after they are sent', async () => {
    const x = fixture('account-A', 3);
    await x.guard.attach('account-A');
    await expect(x.guard.logout()).rejects.toThrow('Cannot sign out');
    expect(x.owner()).toBe('account-A');
    x.setPending(0);
    await x.guard.logout();
    expect(x.events).toEqual(['lease', 'connect', 'clear', 'remove', 'unlock']);
    expect(x.owner()).toBeNull();
  });

  it('auth loss disconnects but preserves cache and queued writes', async () => {
    const x = fixture('account-A', 2);
    await x.guard.attach('account-A');
    await x.guard.authLost();
    expect(x.events).toEqual(['lease', 'connect', 'disconnect', 'unlock']);
    expect(x.owner()).toBe('account-A');
    await x.guard.attach('account-A');
    expect(x.events).toEqual(['lease', 'connect', 'disconnect', 'unlock', 'lease', 'connect']);
  });

  it('refuses a new identity when wiping fails and retains the old marker', async () => {
    const x = fixture('account-A');
    const broken: LocalVaultOwnershipIO = {
      ...x.io,
      clearDatabase: vi.fn(async () => { throw new Error('Local SQLite clear failed'); }),
    };
    const guard = new LocalVaultOwnership(broken);
    await expect(guard.attach('account-B')).rejects.toThrow('Local SQLite clear failed');
    expect(x.owner()).toBe('account-A');
  });

  it('a busy second browser tab cannot even read local SQLite or mutate its owner', async () => {
    const x = fixture('account-A', 2);
    const refused: LocalVaultOwnershipIO = {
      ...x.io,
      acquireTab: async () => { throw new Error('Household Vault is already open in another tab.'); },
    };
    const newTab = new LocalVaultOwnership(refused);
    await expect(newTab.attach('account-B')).rejects.toThrow('another tab');
    expect(x.events).toEqual([]);
    expect(x.owner()).toBe('account-A');
  });

  it('disconnects old JWT uploader before checking old pending writes', async () => {
    const x = fixture('account-A');
    await x.guard.attach('account-A');
    x.setPending(3);
    await expect(x.guard.attach('account-B')).rejects.toThrow('unsynced changes');
    expect(x.events).toEqual(['lease', 'connect', 'disconnect', 'unlock']);
    expect(x.owner()).toBe('account-A');
  });

  it('serializes concurrent handoffs so the latest identity gets its own cache', async () => {
    const x = fixture('account-A');
    await Promise.all([x.guard.attach('account-A'), x.guard.attach('account-B')]);
    expect(x.events).toEqual(['lease', 'connect', 'disconnect', 'clear', 'mark:account-B', 'connect']);
    expect(x.owner()).toBe('account-B');
  });
});
