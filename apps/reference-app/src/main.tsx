import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@uaf/ui/styles.css';
import './styles.css';
import { localVaultTabLease } from './sync/local-vault-tab-lease';

const root = document.getElementById('root');
if (!root) throw new Error('Household Vault root element was not found.');

/**
 * PowerSync starts initializing its persistent database from its constructor.
 * A lock acquired only before database.connect() is TOO LATE. Do not import
 * App (and therefore sync/persistence) before the document-wide lease exists.
 */
async function bootstrap(): Promise<void> {
  await localVaultTabLease.acquire();
  try {
    const [
      { App },
      { householdVaultManifest },
      { initializeMonitoring, MonitoringErrorBoundary },
      { runtimeEnvironment },
    ] = await Promise.all([
      import('./App'),
      import('./app-manifest'),
      import('./monitoring'),
      import('./services'),
    ]);
    initializeMonitoring(runtimeEnvironment, householdVaultManifest);
    createRoot(root!).render(
      <StrictMode>
        <MonitoringErrorBoundary>
          <App />
        </MonitoringErrorBoundary>
      </StrictMode>,
    );
  } catch (cause) {
    // Some imported modules may already have opened SQLite. Do not release
    // the lock while this document is alive; user can close/reload the tab.
    throw cause;
  }
}

void bootstrap().catch((cause) => {
  root!.setAttribute('role', 'alert');
  root!.textContent = cause instanceof Error
    ? cause.message
    : 'Household Vault could not start securely. Close other tabs and retry.';
});
