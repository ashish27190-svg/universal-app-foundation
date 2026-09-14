import type { ReactNode } from 'react';
import * as Sentry from '@sentry/react';
import type { RuntimeEnvironment } from '@uaf/config';
import type { AppManifest } from '@uaf/config';

/**
 * Minimal, privacy-first production monitoring.
 *
 * Deliberately excluded in Phase 1:
 * - Session Replay
 * - Default PII collection
 * - Domain/entity payloads
 * - Performance tracing sampling
 */
export function initializeMonitoring(environment: RuntimeEnvironment, manifest: AppManifest): void {
  if (!environment.VITE_SENTRY_DSN) return;

  Sentry.init({
    dsn: environment.VITE_SENTRY_DSN,
    environment: environment.VITE_UAF_ENVIRONMENT,
    release: `${manifest.app.id}@${manifest.app.version}`,
    sendDefaultPii: false,
    tracesSampleRate: 0,
  });
}

export function MonitoringErrorBoundary({ children }: { readonly children: ReactNode }) {
  return (
    <Sentry.ErrorBoundary
      fallback={
        <main className="vault-shell">
          <section className="vault-panel" role="alert">
            <h1>Household Vault hit an unexpected error</h1>
            <p>Your stored records are not deleted by this screen. Reopen the app and try again.</p>
          </section>
        </main>
      }
    >
      {children}
    </Sentry.ErrorBoundary>
  );
}
