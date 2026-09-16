import { useState } from 'react';
import { Button, Card, ErrorState, Loading } from '@uaf/ui';
import { getReferenceAppDiagnostics, type ReferenceAppDiagnostics } from '../diagnostics';

export function DiagnosticsPanel() {
  const [data, setData] = useState<ReferenceAppDiagnostics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      setData(await getReferenceAppDiagnostics());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Diagnostics could not be read.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <details className="vault-diagnostics" onToggle={(event) => {
      if (event.currentTarget.open && !data && !loading) void refresh();
    }}>
      <summary>Diagnostics</summary>
      <Card className="vault-diagnostics-card">
        <div className="vault-section-heading">
          <div>
            <h3>Privacy-safe runtime diagnostics</h3>
            <p className="vault-muted">No access token, password, email, or raw business record content is shown here.</p>
          </div>
          <Button size="sm" variant="secondary" onClick={() => void refresh()}>Refresh</Button>
        </div>
        {loading ? <Loading label="Reading diagnostics" /> : null}
        {error ? <ErrorState title="Diagnostics unavailable" description={error} onRetry={() => void refresh()} /> : null}
        {data ? (
          <dl className="vault-diagnostics-grid">
            <div><dt>App</dt><dd>{data.appId} · {data.appVersion}</dd></div>
            <div><dt>Environment</dt><dd>{data.environment}</dd></div>
            <div><dt>Sync state</dt><dd>{data.syncState}</dd></div>
            <div><dt>Pending writes</dt><dd>{data.pendingMutations}</dd></div>
            <div><dt>Unresolved conflicts</dt><dd>{data.unresolvedConflicts}</dd></div>
            <div><dt>Connected</dt><dd>{String(data.connected)}</dd></div>
            <div><dt>Initial sync complete</dt><dd>{String(data.hasSynced)}</dd></div>
            <div><dt>Last sync</dt><dd>{data.lastSyncedAt ?? 'Not yet'}</dd></div>
            <div><dt>Device suffix</dt><dd>{data.clientIdSuffix}</dd></div>
            <div><dt>UAF Core</dt><dd>{data.coreVersion}</dd></div>
            <div><dt>UAF Config/Auth</dt><dd>{data.configVersion} / {data.authVersion}</dd></div>
            <div><dt>UAF Sync/UI</dt><dd>{data.syncVersion} / {data.uiVersion}</dd></div>
          </dl>
        ) : null}
      </Card>
    </details>
  );
}
