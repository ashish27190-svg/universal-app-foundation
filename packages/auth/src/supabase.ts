import { createClient, type Session, type SupabaseClient, type User } from '@supabase/supabase-js';
import type { UserId, WorkspaceId } from '@uaf/core';
import type {
  AuthService,
  AuthSession,
  AuthUser,
  PasswordCredentials,
  SignUpCredentials,
  WorkspaceContext,
  WorkspaceMembership,
  WorkspaceService,
  WorkspaceSummary,
} from './contracts';

export interface SupabaseAuthAdapterOptions {
  readonly url: string;
  readonly publishableKey: string;
}

function asUserId(value: string): UserId {
  return value as UserId;
}

function asWorkspaceId(value: string): WorkspaceId {
  return value as WorkspaceId;
}

function mapUser(user: User): AuthUser {
  const displayName = user.user_metadata?.display_name ?? user.user_metadata?.full_name;
  return {
    id: asUserId(user.id),
    ...(user.email ? { email: user.email } : {}),
    displayName: typeof displayName === 'string' ? displayName : null,
  };
}

function mapSession(session: Session): AuthSession {
  return {
    accessToken: session.access_token,
    ...(session.expires_at ? { expiresAt: session.expires_at } : {}),
    user: mapUser(session.user),
  };
}

export class SupabaseAuthService implements AuthService {
  constructor(private readonly client: SupabaseClient) {}

  async getSession(): Promise<AuthSession | null> {
    const { data, error } = await this.client.auth.getSession();
    if (error) throw error;
    return data.session ? mapSession(data.session) : null;
  }

  async signInWithPassword(credentials: PasswordCredentials): Promise<AuthSession> {
    const { data, error } = await this.client.auth.signInWithPassword(credentials);
    if (error) throw error;
    if (!data.session) throw new Error('Sign-in completed without an authenticated session.');
    return mapSession(data.session);
  }

  async signUpWithPassword(credentials: SignUpCredentials): Promise<AuthSession | null> {
    const { data, error } = await this.client.auth.signUp({
      email: credentials.email,
      password: credentials.password,
      ...(credentials.displayName
        ? { options: { data: { display_name: credentials.displayName } } }
        : {}),
    });
    if (error) throw error;
    return data.session ? mapSession(data.session) : null;
  }

  async signOut(): Promise<void> {
    const { error } = await this.client.auth.signOut();
    if (error) throw error;
  }

  onAuthStateChange(listener: (session: AuthSession | null) => void): () => void {
    const { data } = this.client.auth.onAuthStateChange((_event, session) => {
      listener(session ? mapSession(session) : null);
    });

    return () => data.subscription.unsubscribe();
  }
}

interface PersonalWorkspaceRpcRow {
  workspace_id: string;
  role: 'owner';
}

interface WorkspaceRow {
  id: string;
  name: string;
  workspace_type: WorkspaceSummary['type'];
  status: WorkspaceSummary['status'];
}

interface MembershipRow {
  workspace_id: string;
  user_id: string;
  role: WorkspaceMembership['role'];
  status: WorkspaceMembership['status'];
}

export class SupabaseWorkspaceService implements WorkspaceService {
  constructor(private readonly client: SupabaseClient) {}

  async ensurePersonalWorkspace(name = 'Personal'): Promise<WorkspaceContext> {
    const { data, error } = await this.client.rpc('ensure_personal_workspace', {
      requested_name: name,
    });
    if (error) throw error;

    const row = (data as PersonalWorkspaceRpcRow[] | null)?.[0];
    if (!row) throw new Error('Personal workspace bootstrap returned no workspace.');

    const workspaceId = asWorkspaceId(row.workspace_id);
    const [workspace, membership] = await Promise.all([
      this.getWorkspace(workspaceId),
      this.getMembership(workspaceId),
    ]);

    if (!workspace || !membership) {
      throw new Error('Personal workspace bootstrap completed without readable workspace context.');
    }

    return { workspace, membership };
  }

  async getWorkspace(workspaceId: WorkspaceId): Promise<WorkspaceSummary | null> {
    const { data, error } = await this.client
      .from('workspaces')
      .select('id,name,workspace_type,status')
      .eq('id', workspaceId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;

    const row = data as WorkspaceRow;
    return {
      id: asWorkspaceId(row.id),
      name: row.name,
      type: row.workspace_type,
      status: row.status,
    };
  }

  async getMembership(workspaceId: WorkspaceId): Promise<WorkspaceMembership | null> {
    const { data: userData, error: userError } = await this.client.auth.getUser();
    if (userError) throw userError;
    if (!userData.user) return null;

    const { data, error } = await this.client
      .from('workspace_memberships')
      .select('workspace_id,user_id,role,status')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userData.user.id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;

    const row = data as MembershipRow;
    return {
      workspaceId: asWorkspaceId(row.workspace_id),
      userId: asUserId(row.user_id),
      role: row.role,
      status: row.status,
    };
  }
}

export interface SupabaseUafServices {
  readonly client: SupabaseClient;
  readonly auth: AuthService;
  readonly workspaces: WorkspaceService;
}

export function createSupabaseUafServices(options: SupabaseAuthAdapterOptions): SupabaseUafServices {
  const client = createClient(options.url, options.publishableKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return {
    client,
    auth: new SupabaseAuthService(client),
    workspaces: new SupabaseWorkspaceService(client),
  };
}
