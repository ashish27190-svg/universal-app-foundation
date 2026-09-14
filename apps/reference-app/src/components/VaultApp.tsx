import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AuthSession, WorkspaceContext } from '@uaf/auth';
import type { HouseholdAsset } from '@uaf/household-assets';
import { calculateWarrantyStatus } from '@uaf/household-assets';
import type { IsoDateTime } from '@uaf/core';
import type { WriteConflict } from '@uaf/sync';
import type { AuditEventView } from '../data/audit-repository';
import {
  Button,
  Card,
  Dialog,
  EmptyState,
  ErrorState,
  Header,
  ListRow,
  Loading,
  StatusBadge,
  SyncStatus,
} from '@uaf/ui';
import {
  auditRepository,
  conflictResolver,
  householdAssetRepository,
  refreshReferenceAppSyncStatus,
  writeConflictRepository,
} from '../sync/persistence';
import { AddAssetForm } from './AddAssetForm';
import { EditAssetForm } from './EditAssetForm';
import { DiagnosticsPanel } from './DiagnosticsPanel';

function todayLocalDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function categoryLabel(value: HouseholdAsset['category']) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export interface VaultAppProps {
  session: AuthSession;
  workspace: WorkspaceContext;
  syncState: Parameters<typeof SyncStatus>[0]['state'];
  onSignOut: () => Promise<void>;
}

export function VaultApp({ session, workspace, syncState, onSignOut }: VaultAppProps) {
  const [assets, setAssets] = useState<readonly HouseholdAsset[]>([]);
  const [deletedAssets, setDeletedAssets] = useState<readonly HouseholdAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [editingAsset, setEditingAsset] = useState<HouseholdAsset | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<HouseholdAsset | null>(null);
  const [mutationBusy, setMutationBusy] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<readonly WriteConflict[]>([]);
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);
  const [activity, setActivity] = useState<readonly AuditEventView[]>([]);

  const loadAssets = useCallback(async () => {
    setError(null);
    const [activeResult, deletedResult] = await Promise.all([
      householdAssetRepository.list({ workspaceId: workspace.workspace.id, lifecycleStates: ['active'] }),
      householdAssetRepository.list({ workspaceId: workspace.workspace.id, lifecycleStates: ['deleted'] }),
    ]);
    if (!activeResult.ok) {
      setError(activeResult.error.userMessage);
      return;
    }
    if (!deletedResult.ok) {
      setError(deletedResult.error.userMessage);
      return;
    }
    setAssets(activeResult.value);
    setDeletedAssets(deletedResult.value);
  }, [workspace.workspace.id]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    void loadAssets().finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [loadAssets]);

  useEffect(() => {
    const onWatchError = (cause: Error) => setError(cause.message);
    const stopActive = householdAssetRepository.watchList(
      { workspaceId: workspace.workspace.id, lifecycleStates: ['active'] },
      {
        onData: (rows) => { setAssets(rows); setLoading(false); },
        onError: onWatchError,
      },
    );
    const stopDeleted = householdAssetRepository.watchList(
      { workspaceId: workspace.workspace.id, lifecycleStates: ['deleted'] },
      {
        onData: (rows) => setDeletedAssets(rows),
        onError: onWatchError,
      },
    );
    const stopConflicts = writeConflictRepository.watchUnresolved(workspace.workspace.id, {
      onData: (rows) => {
        setConflicts(rows);
        void refreshReferenceAppSyncStatus();
      },
      onError: onWatchError,
    });
    const stopActivity = auditRepository.watchRecent(workspace.workspace.id, 12, {
      onData: setActivity,
      onError: onWatchError,
    });
    return () => { stopActive(); stopDeleted(); stopConflicts(); stopActivity(); };
  }, [workspace.workspace.id]);

  const expiringCount = useMemo(() => {
    const today = todayLocalDate();
    const calculatedAt = new Date().toISOString() as IsoDateTime;
    return assets.filter((asset) => calculateWarrantyStatus(asset, today, calculatedAt).value === 'expiring_soon').length;
  }, [assets]);

  async function create(asset: HouseholdAsset) {
    const result = await householdAssetRepository.create(asset);
    if (!result.ok) throw new Error(result.error.userMessage);
    await refreshReferenceAppSyncStatus();
    await loadAssets();
    setAdding(false);
  }

  async function saveEdit(candidate: HouseholdAsset) {
    const result = await householdAssetRepository.update({
      id: candidate.id,
      workspaceId: candidate.workspaceId,
      expectedRevision: editingAsset?.revision ?? candidate.revision,
      patch: {
        name: candidate.name,
        category: candidate.category,
        purchaseDate: candidate.purchaseDate,
        purchasePrice: candidate.purchasePrice,
        warrantyExpiresOn: candidate.warrantyExpiresOn,
        notes: candidate.notes,
        source: candidate.source,
        dataQuality: candidate.dataQuality,
        confidence: candidate.confidence,
        metadata: candidate.metadata,
      },
      context: { actorId: session.user.id, at: new Date().toISOString() as IsoDateTime },
    });
    if (!result.ok) throw new Error(result.error.userMessage);
    setEditingAsset(null);
    await refreshReferenceAppSyncStatus();
    await loadAssets();
  }

  async function softDelete(asset: HouseholdAsset) {
    setMutationBusy(`delete:${String(asset.id)}`);
    try {
      const result = await householdAssetRepository.softDelete({
        id: asset.id,
        workspaceId: asset.workspaceId,
        expectedRevision: asset.revision,
        context: { actorId: session.user.id, at: new Date().toISOString() as IsoDateTime },
      });
      if (!result.ok) throw new Error(result.error.userMessage);
      setDeleteCandidate(null);
      if (editingAsset?.id === asset.id) setEditingAsset(null);
      await refreshReferenceAppSyncStatus();
      await loadAssets();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Asset could not be deleted.');
    } finally {
      setMutationBusy(null);
    }
  }

  async function restore(asset: HouseholdAsset) {
    setMutationBusy(`restore:${String(asset.id)}`);
    try {
      const result = await householdAssetRepository.restore({
        id: asset.id,
        workspaceId: asset.workspaceId,
        expectedRevision: asset.revision,
        context: { actorId: session.user.id, at: new Date().toISOString() as IsoDateTime },
      });
      if (!result.ok) throw new Error(result.error.userMessage);
      await refreshReferenceAppSyncStatus();
      await loadAssets();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Asset could not be restored.');
    } finally {
      setMutationBusy(null);
    }
  }

  async function resolveConflict(conflict: WriteConflict, choice: 'keep_server' | 'reapply_client') {
    setMutationBusy(`conflict:${conflict.id}`);
    setConflictMessage(null);
    try {
      await conflictResolver.resolve(conflict.id, choice);
      setConflicts((current) => current.filter((item) => item.id !== conflict.id));
      setConflictMessage(choice === 'keep_server'
        ? 'Server version kept. Sync will confirm the resolution.'
        : 'Your version was reapplied against the latest server revision.');
      await refreshReferenceAppSyncStatus();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Conflict could not be resolved.');
    } finally {
      setMutationBusy(null);
    }
  }

  return (
    <div className="vault-app-shell">
      <Header
        title="Household Vault"
        subtitle={workspace.workspace.name}
        actions={
          <div className="vault-header-actions">
            <SyncStatus state={syncState} />
            <Button variant="ghost" size="sm" onClick={() => void onSignOut()}>Sign out</Button>
          </div>
        }
      />
      <main className="vault-main">
        <section className="vault-metrics" aria-label="Vault summary">
          <Card><span className="vault-metric-label">Assets</span><strong className="vault-metric-value">{assets.length}</strong></Card>
          <Card><span className="vault-metric-label">Warranty expiring</span><strong className="vault-metric-value">{expiringCount}</strong></Card>
          <Card><span className="vault-metric-label">Deleted</span><strong className="vault-metric-value">{deletedAssets.length}</strong></Card>
        </section>

        <section className="vault-section">
          <div className="vault-section-heading">
            <div><h2>Your assets</h2><p className="vault-muted">Edits, deletes and restores are local-first and revision guarded.</p></div>
            <div className="vault-actions">
              <Button variant="secondary" onClick={() => void loadAssets()}>Refresh</Button>
              <Button onClick={() => setAdding((value) => !value)}>{adding ? 'Close form' : 'Add asset'}</Button>
            </div>
          </div>

          {adding ? (
            <Card className="vault-editor-card">
              <h3>Add asset</h3>
              <AddAssetForm
                workspaceId={workspace.workspace.id}
                actorId={session.user.id}
                onCreate={create}
                onCancel={() => setAdding(false)}
              />
            </Card>
          ) : null}

          {loading ? <Loading label="Loading local records" /> : null}
          {error ? <ErrorState title="Household Vault needs attention" description={error} onRetry={() => void loadAssets()} /> : null}
          {!loading && !error && assets.length === 0 ? (
            <EmptyState
              title="No active assets"
              description="Add an asset, or restore one from Recently deleted below."
              action={<Button onClick={() => setAdding(true)}>Add asset</Button>}
            />
          ) : null}
          {!loading && !error && assets.length > 0 ? (
            <div className="vault-list">
              {assets.map((asset) => (
                <Card key={String(asset.id)} data-asset-name={asset.name} data-asset-lifecycle="active">
                  <div className="vault-record-row">
                    <ListRow
                      title={asset.name}
                      subtitle={[categoryLabel(asset.category), asset.warrantyExpiresOn ? `Warranty: ${asset.warrantyExpiresOn}` : 'Warranty unknown', `Revision ${Number(asset.revision)}`].join(' · ')}
                      trailing={<StatusBadge tone="success">active</StatusBadge>}
                    />
                    <div className="vault-record-actions">
                      <Button size="sm" variant="secondary" onClick={() => setEditingAsset(asset)}>Edit</Button>
                      <Button size="sm" variant="ghost" onClick={() => setDeleteCandidate(asset)}>Delete</Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : null}
        </section>

        <section className="vault-section" aria-labelledby="conflicts-heading">
          <div className="vault-section-heading">
            <div>
              <h2 id="conflicts-heading">Needs attention</h2>
              <p className="vault-muted">Conflicting or rejected writes never overwrite newer server data silently.</p>
            </div>
            {conflicts.length ? <StatusBadge tone="warning">{conflicts.length} unresolved</StatusBadge> : null}
          </div>
          {conflictMessage ? <div className="vault-callout" role="status">{conflictMessage}</div> : null}
          {conflicts.length === 0 ? (
            <p className="vault-muted">No unresolved conflicts.</p>
          ) : (
            <div className="vault-list">
              {conflicts.map((conflict) => {
                const clientName = typeof conflict.clientPayload.name === 'string' ? conflict.clientPayload.name : null;
                const serverName = typeof conflict.serverPayload.name === 'string' ? conflict.serverPayload.name : null;
                const canReapply = conflict.conflictType === 'conflict' && conflict.operation !== 'create' && conflict.serverRevision !== null;
                return (
                  <Card key={conflict.id}>
                    <div className="vault-conflict">
                      <div>
                        <strong>{serverName ?? clientName ?? conflict.entityType}</strong>
                        <p className="vault-muted">
                          {conflict.conflictType} · client revision {conflict.clientRevision ?? 'new'} · server revision {conflict.serverRevision ?? 'unknown'}
                        </p>
                      </div>
                      <div className="vault-conflict-versions">
                        <div><span>My attempted value</span><code>{clientName ?? 'See record details'}</code></div>
                        <div><span>Server value</span><code>{serverName ?? 'See record details'}</code></div>
                      </div>
                      <div className="vault-record-actions">
                        <Button
                          size="sm"
                          variant="secondary"
                          loading={mutationBusy === `conflict:${conflict.id}`}
                          onClick={() => void resolveConflict(conflict, 'keep_server')}
                        >
                          Keep server version
                        </Button>
                        {canReapply ? (
                          <Button
                            size="sm"
                            loading={mutationBusy === `conflict:${conflict.id}`}
                            onClick={() => void resolveConflict(conflict, 'reapply_client')}
                          >
                            Reapply my version
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        <section className="vault-section" aria-labelledby="activity-heading">
          <div className="vault-section-heading">
            <div>
              <h2 id="activity-heading">Recent activity</h2>
              <p className="vault-muted">Server-confirmed changes are recorded as auditable events.</p>
            </div>
          </div>
          {activity.length === 0 ? (
            <p className="vault-muted">No server-confirmed activity yet.</p>
          ) : (
            <div className="vault-list">
              {activity.map((event) => (
                <Card key={event.id}>
                  <ListRow
                    title={event.action.replace('household_assets.', '').replace('write_conflict.', 'Conflict: ').replaceAll('_', ' ')}
                    subtitle={`${new Date(event.createdAt).toLocaleString()} · ${event.source}`}
                    trailing={<StatusBadge tone="info">{event.actorType}</StatusBadge>}
                  />
                </Card>
              ))}
            </div>
          )}
        </section>

        <section className="vault-section" aria-labelledby="deleted-assets-heading">
          <div className="vault-section-heading">
            <div>
              <h2 id="deleted-assets-heading">Recently deleted</h2>
              <p className="vault-muted">Deletion is reversible. Physical purge is intentionally outside this phase.</p>
            </div>
          </div>
          {deletedAssets.length === 0 ? (
            <p className="vault-muted">No deleted assets.</p>
          ) : (
            <div className="vault-list">
              {deletedAssets.map((asset) => (
                <Card key={String(asset.id)} data-asset-name={asset.name} data-asset-lifecycle="deleted">
                  <div className="vault-record-row">
                    <ListRow
                      title={asset.name}
                      subtitle={`${categoryLabel(asset.category)} · Revision ${Number(asset.revision)}`}
                      trailing={<StatusBadge tone="neutral">deleted</StatusBadge>}
                    />
                    <div className="vault-record-actions">
                      <Button
                        size="sm"
                        variant="secondary"
                        loading={mutationBusy === `restore:${String(asset.id)}`}
                        onClick={() => void restore(asset)}
                      >
                        Restore
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>
      </main>
      <DiagnosticsPanel />
      <footer className="vault-footer">Signed in as {session.user.email ?? String(session.user.id)}</footer>

      <Dialog
        open={editingAsset !== null}
        onOpenChange={(open) => { if (!open) setEditingAsset(null); }}
        title="Edit asset"
        description="Changes are saved locally first and synchronized with revision protection."
      >
        {editingAsset ? (
          <EditAssetForm
            asset={editingAsset}
            actorId={session.user.id}
            onSave={saveEdit}
            onCancel={() => setEditingAsset(null)}
          />
        ) : null}
      </Dialog>

      <Dialog
        open={deleteCandidate !== null}
        onOpenChange={(open) => { if (!open) setDeleteCandidate(null); }}
        title="Delete asset?"
        description="This is a soft delete. You can restore the asset later."
        footer={
          <div className="vault-actions">
            <Button variant="ghost" onClick={() => setDeleteCandidate(null)}>Cancel</Button>
            <Button
              variant="danger"
              loading={Boolean(deleteCandidate && mutationBusy === `delete:${String(deleteCandidate.id)}`)}
              onClick={() => { if (deleteCandidate) void softDelete(deleteCandidate); }}
            >
              Delete asset
            </Button>
          </div>
        }
      >
        <p className="vault-muted">{deleteCandidate ? deleteCandidate.name : ''}</p>
      </Dialog>
    </div>
  );
}
