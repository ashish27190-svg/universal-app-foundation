import type { UserId, WorkspaceId } from '@uaf/core';

export interface AuthUser {
  readonly id: UserId;
  readonly email?: string;
  readonly displayName?: string | null;
}

export interface AuthSession {
  readonly accessToken: string;
  readonly expiresAt?: number;
  readonly user: AuthUser;
}

export type AuthState =
  | { readonly status: 'loading'; readonly session: null }
  | { readonly status: 'unauthenticated'; readonly session: null }
  | { readonly status: 'authenticated'; readonly session: AuthSession };

export interface PasswordCredentials {
  readonly email: string;
  readonly password: string;
}

export interface SignUpCredentials extends PasswordCredentials {
  readonly displayName?: string;
}

export type Unsubscribe = () => void;

export interface AuthService {
  getSession(): Promise<AuthSession | null>;
  signInWithPassword(credentials: PasswordCredentials): Promise<AuthSession>;
  signUpWithPassword(credentials: SignUpCredentials): Promise<AuthSession | null>;
  signOut(): Promise<void>;
  onAuthStateChange(listener: (session: AuthSession | null) => void): Unsubscribe;
}

export type WorkspaceRole = 'owner' | 'admin' | 'member' | 'viewer';
export type MembershipStatus = 'active' | 'invited' | 'suspended' | 'removed';
export type WorkspaceStatus = 'active' | 'archived';
export type WorkspaceType = 'personal' | 'family' | 'team' | 'business' | 'organization';

export interface WorkspaceSummary {
  readonly id: WorkspaceId;
  readonly name: string;
  readonly type: WorkspaceType;
  readonly status: WorkspaceStatus;
}

export interface WorkspaceMembership {
  readonly workspaceId: WorkspaceId;
  readonly userId: UserId;
  readonly role: WorkspaceRole;
  readonly status: MembershipStatus;
}

export interface WorkspaceContext {
  readonly workspace: WorkspaceSummary;
  readonly membership: WorkspaceMembership;
}

export interface WorkspaceService {
  ensurePersonalWorkspace(name?: string): Promise<WorkspaceContext>;
  getWorkspace(workspaceId: WorkspaceId): Promise<WorkspaceSummary | null>;
  getMembership(workspaceId: WorkspaceId): Promise<WorkspaceMembership | null>;
}
