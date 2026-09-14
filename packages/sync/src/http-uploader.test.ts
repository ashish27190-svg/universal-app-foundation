import { describe, expect, it, vi } from 'vitest';
import type { AuthService } from '@uaf/auth';
import type { MutationId, WorkspaceId } from '@uaf/core';
import { HttpMutationUploader } from './http-uploader';
import { encodeMutationMetadata } from './mutation';

const mutationId = '00000000-0000-4000-8000-000000000101' as MutationId;
const workspaceId = '00000000-0000-4000-8000-000000000201' as WorkspaceId;

function auth(): AuthService {
  return {
    async getSession() { return { accessToken: 'token', user: { id: 'user-1' as never } }; },
    async signInWithPassword() { throw new Error('unused'); },
    async signUpWithPassword() { throw new Error('unused'); },
    async signOut() {},
    onAuthStateChange() { return () => undefined; },
  };
}

function database(complete: () => Promise<void>) {
  return {
    async getCrudBatch() {
      return {
        crud: [{
          clientId: 1,
          id: '00000000-0000-4000-8000-000000000301',
          table: 'household_assets',
          op: 'patch',
          opData: { name: 'Updated' },
          metadata: encodeMutationMetadata({
            version: 1,
            mutationId,
            workspaceId,
            operation: 'update',
            expectedRevision: 1 as never,
          }),
        }],
        complete,
      };
    },
    async getClientId() { return 'client-1'; },
  } as never;
}

describe('HttpMutationUploader failure semantics', () => {
  it('does not complete a CRUD batch when the gateway fails', async () => {
    const complete = vi.fn(async () => undefined);
    const uploader = new HttpMutationUploader({
      endpoint: 'https://example.test/sync',
      auth: auth(),
      fetchImpl: vi.fn(async () => new Response('{}', { status: 503 })) as never,
    });

    await expect(uploader.upload(database(complete))).rejects.toThrow(/HTTP 503/);
    expect(complete).not.toHaveBeenCalled();
  });

  it('completes terminal conflict outcomes so the server conflict can sync back for review', async () => {
    const complete = vi.fn(async () => undefined);
    const uploader = new HttpMutationUploader({
      endpoint: 'https://example.test/sync',
      auth: auth(),
      fetchImpl: vi.fn(async () => Response.json({
        protocolVersion: 1,
        outcomes: [{ mutationId, status: 'conflict', message: 'Revision conflict.' }],
      })) as never,
    });

    await uploader.upload(database(complete));
    expect(complete).toHaveBeenCalledOnce();
  });
});
