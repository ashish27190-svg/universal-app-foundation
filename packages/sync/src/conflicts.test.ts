import { describe, expect, it, vi } from 'vitest';
import type { AuthService } from '@uaf/auth';
import { HttpConflictResolver } from './conflicts';

function auth(): AuthService {
  return {
    async getSession() { return { accessToken: 'token', user: { id: 'user-1' as never } }; },
    async signInWithPassword() { throw new Error('unused'); },
    async signUpWithPassword() { throw new Error('unused'); },
    async signOut() {},
    onAuthStateChange() { return () => undefined; },
  };
}

describe('HttpConflictResolver', () => {
  it('sends explicit user choice with auth', async () => {
    const fetchImpl = vi.fn(async (_url: string, init?: RequestInit) => {
      expect(init?.headers).toMatchObject({ Authorization: 'Bearer token' });
      expect(JSON.parse(String(init?.body))).toEqual({ conflictId: 'conflict-1', choice: 'keep_server' });
      return Response.json({ status: 'resolved' });
    });
    const resolver = new HttpConflictResolver({ endpoint: 'https://example.test/resolve', auth: auth(), fetchImpl: fetchImpl as never });
    await resolver.resolve('conflict-1', 'keep_server');
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it('requires a reviewed revision and sends it with reapply requests', async () => {
    const fetchImpl = vi.fn(async (_url: string, init?: RequestInit) => {
      expect(JSON.parse(String(init?.body))).toEqual({
        conflictId: 'conflict-2', choice: 'reapply_client', reviewedRevision: 7,
      });
      return Response.json({ status: 'resolved' });
    });
    const resolver = new HttpConflictResolver({
      endpoint: 'https://example.test/resolve', auth: auth(), fetchImpl: fetchImpl as never,
    });
    await expect(resolver.resolve('conflict-2', 'reapply_client')).rejects.toThrow('Review the latest server revision');
    expect(fetchImpl).not.toHaveBeenCalled();
    await resolver.resolve('conflict-2', 'reapply_client', 7 as never);
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it('surfaces resolver failures without pretending resolution succeeded', async () => {
    const resolver = new HttpConflictResolver({
      endpoint: 'https://example.test/resolve',
      auth: auth(),
      fetchImpl: vi.fn(async () => Response.json({ message: 'changed again' }, { status: 409 })) as never,
    });
    await expect(resolver.resolve('conflict-1', 'reapply_client', 5 as never)).rejects.toThrow('changed again');
  });
});
