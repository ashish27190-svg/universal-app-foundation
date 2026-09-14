import { describe, expect, it } from 'vitest';
import type { AuthSession, AuthState, WorkspaceContext } from './index';

const fixture = <T>(value: unknown) => value as T;

describe('@uaf/auth contracts', () => {
  it('keeps unauthenticated state explicit', () => {
    const state: AuthState = { status: 'unauthenticated', session: null };
    expect(state.session).toBeNull();
  });

  it('binds an authenticated session to one typed user', () => {
    const session: AuthSession = {
      accessToken: 'test-token',
      user: {
        id: fixture('00000000-0000-4000-8000-000000000001'),
        email: 'person@example.test',
        displayName: 'Test Person',
      },
    };
    expect(session.user.email).toBe('person@example.test');
  });

  it('models current workspace and membership together', () => {
    const context: WorkspaceContext = {
      workspace: {
        id: fixture('00000000-0000-4000-8000-000000000010'),
        name: 'Personal',
        type: 'personal',
        status: 'active',
      },
      membership: {
        workspaceId: fixture('00000000-0000-4000-8000-000000000010'),
        userId: fixture('00000000-0000-4000-8000-000000000001'),
        role: 'owner',
        status: 'active',
      },
    };
    expect(context.membership.role).toBe('owner');
  });
});
