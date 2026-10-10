import { useEffect, useRef, useState } from 'react';
import type { AuthSession, WorkspaceContext } from '@uaf/auth';
import { Button, ErrorState, Loading, type SyncDisplayState } from '@uaf/ui';
import { AuthScreen } from './components/AuthScreen';
import { VaultApp } from './components/VaultApp';
import { PwaUpdatePrompt } from './components/PwaUpdatePrompt';
import { uafServices } from './services';
import { clearConfirmedPersonalWorkspace, readConfirmedPersonalWorkspace, saveConfirmedPersonalWorkspace } from './offline-workspace';
import { LocalVaultOwnershipConflictError } from './sync/local-vault-ownership';
import {
  connectReferenceAppSync,
  prepareReferenceAppLogout,
  pauseReferenceAppSyncForAuthChange,
  refreshReferenceAppSyncStatus,
  syncStatusStore,
} from './sync/persistence';

interface BootState {
  session: AuthSession | null;
  workspace: WorkspaceContext | null;
  loading: boolean;
  error: string | null;
  accountSwitchAvailable?: boolean;
}

const initialBootState: BootState = { session: null, workspace: null, loading: true, error: null };

export function App() {
  const [boot, setBoot] = useState<BootState>(initialBootState);
  const [syncState, setSyncState] = useState<SyncDisplayState>(syncStatusStore.snapshot.state);
  const bootstrapGeneration = useRef(0);
  const activeUserId = useRef<string | null>(null);

  useEffect(() => {
    let disposed = false;
    const unsubscribeSync = syncStatusStore.subscribe((status) => {
      if (!disposed) setSyncState(status.state);
    });

    let offlineVerification: { userId: string; generation: number } | null = null;

    async function applySession(session: AuthSession | null) {
      const generation = ++bootstrapGeneration.current;
      offlineVerification = null;
      const userId = session ? String(session.user.id) : null;
      const previousUserId = activeUserId.current;
      activeUserId.current = userId;
      if (!session) {
        if (!disposed) setBoot({ session: null, workspace: null, loading: false, error: null });
        void pauseReferenceAppSyncForAuthChange().catch((cause) => {
          if (!disposed && generation === bootstrapGeneration.current) {
            setBoot({
              session: null,
              workspace: null,
              loading: false,
              error: cause instanceof Error ? cause.message : 'Failed to isolate the local database after sign-out.',
            });
          }
        });
        return;
      }
      if (!disposed) setBoot({ session, workspace: null, loading: true, error: null });
      let syncAttached = false;
      try {
        if (previousUserId !== null && previousUserId !== userId) {
          // A different auth identity must immediately stop the previous
          // PowerSync uploader before we bootstrap the new workspace.
          await pauseReferenceAppSyncForAuthChange();
        }
        if (disposed || generation !== bootstrapGeneration.current) return;
        // The ownership Web Lock and account marker must be checked BEFORE
        // any cached workspace context can be read or rendered.
        await connectReferenceAppSync(userId!);
        syncAttached = true;
        if (disposed || generation !== bootstrapGeneration.current) return;

        let workspace: WorkspaceContext;
        if (!navigator.onLine) {
          const saved = readConfirmedPersonalWorkspace(window.localStorage, session);
          if (!saved) {
            throw new Error(
              'Cannot open this vault offline: no recent server-confirmed personal workspace ' +
              'or the session has expired. Reconnect and sign in to verify this account.',
            );
          }
          workspace = saved;
          offlineVerification = { userId: userId!, generation };
        } else {
          workspace = await uafServices.workspaces.ensurePersonalWorkspace();
          if (disposed || generation !== bootstrapGeneration.current) return;
          saveConfirmedPersonalWorkspace(window.localStorage, session, workspace);
        }
        if (!disposed && generation === bootstrapGeneration.current) {
          setBoot({ session, workspace, loading: false, error: null });
        }
      } catch (cause) {
        if (syncAttached && !disposed && generation === bootstrapGeneration.current) {
          // Failed bootstrap must not retain the SQLite lock or a live uploader.
          // disconnect() preserves pending mutations and the owner marker.
          await pauseReferenceAppSyncForAuthChange().catch(() => undefined);
        }
        if (!disposed && generation === bootstrapGeneration.current) {
          setBoot({
            session,
            workspace: null,
            loading: false,
            error: cause instanceof Error ? cause.message : 'App initialization failed.',
            accountSwitchAvailable: cause instanceof LocalVaultOwnershipConflictError,
          });
        }
      }
    }

    void uafServices.auth.getSession().then(applySession).catch((cause) => {
      if (!disposed) setBoot({ session: null, workspace: null, loading: false, error: cause instanceof Error ? cause.message : 'Could not read the auth session.' });
    });
    const unsubscribeAuth = uafServices.auth.onAuthStateChange((session) => { void applySession(session); });

    const refreshNetworkState = () => {
      void refreshReferenceAppSyncStatus();
      if (!navigator.onLine || !offlineVerification) return;
      const pending = offlineVerification;
      offlineVerification = null;
      void (async () => {
        // Once online again, a locally cached membership MUST be rechecked
        // with Supabase before we continue treating it as current.
        const current = await uafServices.auth.getSession();
        if (!current || String(current.user.id) !== pending.userId) {
          throw new Error('Authentication changed while offline.');
        }
        const verified = await uafServices.workspaces.ensurePersonalWorkspace();
        if (disposed || pending.generation !== bootstrapGeneration.current) return;
        saveConfirmedPersonalWorkspace(window.localStorage, current, verified);
        setBoot((previous) => ({ ...previous, session: current, workspace: verified, error: null }));
      })().catch(async (cause) => {
        if (disposed || pending.generation !== bootstrapGeneration.current) return;
        await pauseReferenceAppSyncForAuthChange().catch(() => undefined);
        if (!disposed && pending.generation === bootstrapGeneration.current) {
          setBoot((previous) => ({
            ...previous,
            workspace: null,
            error: cause instanceof Error
              ? 'Could not reverify this workspace after reconnecting: ' + cause.message
              : 'Could not reverify this workspace after reconnecting.',
          }));
        }
      });
    };
    window.addEventListener('online', refreshNetworkState);
    window.addEventListener('offline', refreshNetworkState);

    return () => {
      disposed = true;
      unsubscribeAuth();
      unsubscribeSync();
      window.removeEventListener('online', refreshNetworkState);
      window.removeEventListener('offline', refreshNetworkState);
    };
  }, []);

  async function signOut() {
    try {
      await prepareReferenceAppLogout();
      clearConfirmedPersonalWorkspace(window.localStorage);
      await uafServices.auth.signOut();
    } catch (cause) {
      setBoot((current) => ({ ...current, error: cause instanceof Error ? cause.message : 'Sign out failed.' }));
    }
  }

  if (boot.loading) return <main className="vault-centered"><Loading label="Opening your local vault" /></main>;
  if (boot.error) {
    return (
      <main className="vault-centered">
        <div className="vault-auth-card">
          <ErrorState title="Household Vault needs attention" description={boot.error} onRetry={() => window.location.reload()} />
          {boot.accountSwitchAvailable ? (
            <Button
              variant="secondary"
              onClick={() => {
                // This is NOT the ordinary logout path: pending writes belong
                // to another user and must NOT be deleted by the current one.
                void uafServices.auth.signOut().catch((cause) => {
                  setBoot((current) => ({
                    ...current,
                    error: cause instanceof Error ? cause.message : 'Could not return to account selection.',
                  }));
                });
              }}
            >
              Switch back to previous account
            </Button>
          ) : null}
        </div>
      </main>
    );
  }
  if (!boot.session) return <AuthScreen />;
  if (!boot.workspace) return <main className="vault-centered"><Loading label="Preparing your workspace" /></main>;

  return (
    <>
      <VaultApp session={boot.session} workspace={boot.workspace} syncState={syncState} onSignOut={signOut} />
      <PwaUpdatePrompt />
    </>
  );
}
