import { useEffect, useRef, useState } from 'react';
import type { AuthSession, WorkspaceContext } from '@uaf/auth';
import { ErrorState, Loading, type SyncDisplayState } from '@uaf/ui';
import { AuthScreen } from './components/AuthScreen';
import { VaultApp } from './components/VaultApp';
import { PwaUpdatePrompt } from './components/PwaUpdatePrompt';
import { uafServices } from './services';
import {
  connectReferenceAppSync,
  prepareReferenceAppLogout,
  refreshReferenceAppSyncStatus,
  syncStatusStore,
} from './sync/persistence';

interface BootState {
  session: AuthSession | null;
  workspace: WorkspaceContext | null;
  loading: boolean;
  error: string | null;
}

const initialBootState: BootState = { session: null, workspace: null, loading: true, error: null };

export function App() {
  const [boot, setBoot] = useState<BootState>(initialBootState);
  const [syncState, setSyncState] = useState<SyncDisplayState>(syncStatusStore.snapshot.state);
  const bootstrapGeneration = useRef(0);

  useEffect(() => {
    let disposed = false;
    const unsubscribeSync = syncStatusStore.subscribe((status) => {
      if (!disposed) setSyncState(status.state);
    });

    async function applySession(session: AuthSession | null) {
      const generation = ++bootstrapGeneration.current;
      if (!session) {
        if (!disposed) setBoot({ session: null, workspace: null, loading: false, error: null });
        return;
      }
      if (!disposed) setBoot({ session, workspace: null, loading: true, error: null });
      try {
        const workspace = await uafServices.workspaces.ensurePersonalWorkspace();
        await connectReferenceAppSync();
        if (!disposed && generation === bootstrapGeneration.current) {
          setBoot({ session, workspace, loading: false, error: null });
        }
      } catch (cause) {
        if (!disposed && generation === bootstrapGeneration.current) {
          setBoot({
            session,
            workspace: null,
            loading: false,
            error: cause instanceof Error ? cause.message : 'App initialization failed.',
          });
        }
      }
    }

    void uafServices.auth.getSession().then(applySession).catch((cause) => {
      if (!disposed) setBoot({ session: null, workspace: null, loading: false, error: cause instanceof Error ? cause.message : 'Could not read the auth session.' });
    });
    const unsubscribeAuth = uafServices.auth.onAuthStateChange((session) => { void applySession(session); });

    const refreshNetworkState = () => { void refreshReferenceAppSyncStatus(); };
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
      await uafServices.auth.signOut();
    } catch (cause) {
      setBoot((current) => ({ ...current, error: cause instanceof Error ? cause.message : 'Sign out failed.' }));
    }
  }

  if (boot.loading) return <main className="vault-centered"><Loading label="Opening your local vault" /></main>;
  if (boot.error) {
    return (
      <main className="vault-centered">
        <ErrorState title="Household Vault needs attention" description={boot.error} onRetry={() => window.location.reload()} />
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
