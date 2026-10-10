import { describe, expect, it } from 'vitest';
import type { AuthSession, WorkspaceContext } from '@uaf/auth';
import {
  clearConfirmedPersonalWorkspace,
  readConfirmedPersonalWorkspace,
  saveConfirmedPersonalWorkspace,
  type OfflineWorkspaceStorage,
} from './offline-workspace';
import { LOCAL_VAULT_OWNER_KEY } from './sync/local-vault-ownership';

const now = Date.UTC(2026, 9, 10, 15, 0);
const accountA = '11111111-1111-4111-8111-111111111111';
const accountB = '22222222-2222-4222-8222-222222222222';
const workspaceId = '33333333-3333-4333-8333-333333333333';
const session = {
  user: { id: accountA },
  accessToken: 'synthetic-valid-offline-test-token',
  expiresAt: Math.floor((now + 60 * 60_000) / 1000),
} as AuthSession;
const context = {
  workspace: { id: workspaceId, name: 'Personal', status: 'active', type: 'personal' },
  membership: { workspaceId, userId: accountA, status: 'active', role: 'owner' },
} as WorkspaceContext;

function fixture() {
  const items = new Map<string, string>([[LOCAL_VAULT_OWNER_KEY, accountA]]);
  const storage: OfflineWorkspaceStorage = {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => { items.set(key, value); },
    removeItem: (key) => { items.delete(key); },
  };
  return { storage, items };
}

describe('last-confirmed personal workspace offline startup', () => {
  it('restores the same owner only with a valid locally held session', () => {
    const { storage, items } = fixture();
    saveConfirmedPersonalWorkspace(storage, session, context, now);
    expect(readConfirmedPersonalWorkspace(storage, session, now + 60_000)).toEqual(context);
    expect(JSON.stringify([...items.values()])).not.toContain(session.accessToken);
  });

  it('rejects account B even if the old workspace cache remains on disk', () => {
    const { storage } = fixture();
    saveConfirmedPersonalWorkspace(storage, session, context, now);
    expect(readConfirmedPersonalWorkspace(storage, {
      ...session,
      user: { id: accountB as AuthSession['user']['id'] },
    }, now)).toBeNull();
    storage.setItem(LOCAL_VAULT_OWNER_KEY, accountB);
    expect(readConfirmedPersonalWorkspace(storage, session, now)).toBeNull();
  });

  it('refuses expired or absent sessions and near-expiry credentials', () => {
    const { storage } = fixture();
    saveConfirmedPersonalWorkspace(storage, session, context, now);
    const { expiresAt: _expiresAt, ...withoutExpiry } = session;
    expect(readConfirmedPersonalWorkspace(storage, withoutExpiry, now)).toBeNull();
    expect(readConfirmedPersonalWorkspace(storage, { ...session, expiresAt: Math.floor((now - 1000) / 1000) }, now)).toBeNull();
    expect(readConfirmedPersonalWorkspace(storage, { ...session, expiresAt: Math.floor((now + 10_000) / 1000) }, now)).toBeNull();
  });

  it('rejects stale cached membership and invalid workspace role or status', () => {
    const { storage } = fixture();
    saveConfirmedPersonalWorkspace(storage, session, context, now);
    expect(readConfirmedPersonalWorkspace(storage, session, now + 8 * 24 * 60 * 60_000)).toBeNull();
    expect(() => saveConfirmedPersonalWorkspace(storage, session, {
      ...context, membership: { ...context.membership, role: 'viewer' },
    }, now)).toThrow('non-personal');
    expect(() => saveConfirmedPersonalWorkspace(storage, session, {
      ...context, workspace: { ...context.workspace, status: 'archived' },
    }, now)).toThrow('non-personal');
  });

  it('rejects malformed, substituted or future-dated cached JSON', () => {
    const { storage, items } = fixture();
    saveConfirmedPersonalWorkspace(storage, session, context, now);
    const key = [...items.keys()].find((s) => s.includes('confirmed-personal-workspace'))!;
    const valid = JSON.parse(items.get(key)!) as Record<string, unknown>;
    storage.setItem(key, '{broken');
    expect(readConfirmedPersonalWorkspace(storage, session, now)).toBeNull();
    storage.setItem(key, JSON.stringify({ ...valid, verifiedAt: now + 1 }));
    expect(readConfirmedPersonalWorkspace(storage, session, now)).toBeNull();
    storage.setItem(key, JSON.stringify({ ...valid, context: { ...context, membership: {
      ...context.membership, userId: accountB,
    } } }));
    expect(readConfirmedPersonalWorkspace(storage, session, now)).toBeNull();
  });

  it('clears stale context on logout or user handoff', () => {
    const { storage } = fixture();
    saveConfirmedPersonalWorkspace(storage, session, context, now);
    clearConfirmedPersonalWorkspace(storage);
    expect(readConfirmedPersonalWorkspace(storage, session, now)).toBeNull();
  });
});
