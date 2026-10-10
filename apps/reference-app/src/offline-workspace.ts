import type { AuthSession, WorkspaceContext } from '@uaf/auth';
import { LOCAL_VAULT_OWNER_KEY } from './sync/local-vault-ownership';

const CACHE_KEY = 'uaf.household-vault.confirmed-personal-workspace.v1';
const MAX_OFFLINE_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface WorkspaceCacheRecord {
  version: 1;
  userId: string;
  verifiedAt: number;
  context: WorkspaceContext;
}

export interface OfflineWorkspaceStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function isValidPersonalContext(value: WorkspaceContext, userId: string): boolean {
  return UUID.test(String(value.workspace.id)) &&
    value.workspace.type === 'personal' &&
    value.workspace.status === 'active' &&
    value.membership.workspaceId === value.workspace.id &&
    String(value.membership.userId) === userId &&
    value.membership.status === 'active' &&
    value.membership.role === 'owner' &&
    typeof value.workspace.name === 'string' &&
    value.workspace.name.length > 0 &&
    value.workspace.name.length <= 160;
}

/** Save only after an authenticated, successful online workspace lookup. */
export function saveConfirmedPersonalWorkspace(
  storage: OfflineWorkspaceStorage,
  session: AuthSession,
  workspace: WorkspaceContext,
  now = Date.now(),
): void {
  const userId = String(session.user.id);
  if (!isValidPersonalContext(workspace, userId)) {
    throw new Error('Cannot cache an unverified or non-personal workspace.');
  }
  const record: WorkspaceCacheRecord = {
    version: 1,
    userId,
    verifiedAt: now,
    context: workspace,
  };
  storage.setItem(CACHE_KEY, JSON.stringify(record));
}

/**
 * Offline fallback is never a new authorization grant. Server RLS and
 * mutation gateways recheck roles when the device reconnects.
 *
 * Fail closed if identity, local ownership, expiry or cache validation fails.
 * No access token, refresh token, email or password is cached here.
 */
export function readConfirmedPersonalWorkspace(
  storage: OfflineWorkspaceStorage,
  session: AuthSession,
  now = Date.now(),
): WorkspaceContext | null {
  try {
    const userId = String(session.user.id);
    if (!session.accessToken || !session.expiresAt ||
        session.expiresAt * 1000 <= now + 30_000) return null;
    if (storage.getItem(LOCAL_VAULT_OWNER_KEY) !== userId) return null;
    const raw = storage.getItem(CACHE_KEY);
    if (!raw) return null;
    const data: unknown = JSON.parse(raw);
    if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
    const value = data as Partial<WorkspaceCacheRecord>;
    if (value.version !== 1 || value.userId !== userId ||
        typeof value.verifiedAt !== 'number' ||
        !Number.isFinite(value.verifiedAt) ||
        value.verifiedAt > now ||
        now - value.verifiedAt > MAX_OFFLINE_AGE_MS ||
        !value.context || !isValidPersonalContext(value.context, userId)) return null;
    return value.context;
  } catch {
    return null;
  }
}

export function clearConfirmedPersonalWorkspace(storage: OfflineWorkspaceStorage): void {
  storage.removeItem(CACHE_KEY);
}
