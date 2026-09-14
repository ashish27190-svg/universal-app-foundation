import { column, Schema, Table } from '@powersync/web';

const workspaces = new Table(
  {
    name: column.text,
    workspace_type: column.text,
    created_by: column.text,
    status: column.text,
    created_at: column.text,
    updated_at: column.text,
  },
  { indexes: { creator: ['created_by'] }, trackMetadata: true },
);

const workspaceMemberships = new Table(
  {
    workspace_id: column.text,
    user_id: column.text,
    role: column.text,
    status: column.text,
    created_at: column.text,
    updated_at: column.text,
  },
  {
    indexes: {
      workspace: ['workspace_id'],
      user: ['user_id'],
    },
  },
);

const writeConflicts = new Table(
  {
    workspace_id: column.text,
    mutation_id: column.text,
    operation: column.text,
    entity_type: column.text,
    entity_id: column.text,
    conflict_type: column.text,
    client_revision: column.integer,
    server_revision: column.integer,
    client_payload: column.text,
    server_payload: column.text,
    created_at: column.text,
    resolved_at: column.text,
    resolution: column.text,
  },
  {
    indexes: {
      workspace: ['workspace_id'],
      entity: ['entity_type', 'entity_id'],
    },
  },
);



const auditEvents = new Table(
  {
    workspace_id: column.text,
    actor_user_id: column.text,
    actor_type: column.text,
    action: column.text,
    entity_type: column.text,
    entity_id: column.text,
    before_data: column.text,
    after_data: column.text,
    source: column.text,
    correlation_id: column.text,
    created_at: column.text,
  },
  {
    indexes: {
      workspace: ['workspace_id'],
      entity: ['entity_type', 'entity_id'],
    },
  },
);

const householdAssets = new Table(
  {
    workspace_id: column.text,
    name: column.text,
    category: column.text,
    purchase_date: column.text,
    purchase_price_minor: column.integer,
    purchase_currency: column.text,
    warranty_expires_on: column.text,
    notes: column.text,
    revision: column.integer,
    lifecycle_state: column.text,
    source: column.text,
    source_reference: column.text,
    data_quality: column.text,
    confidence: column.text,
    metadata: column.text,
    created_at: column.text,
    updated_at: column.text,
    created_by: column.text,
    updated_by: column.text,
  },
  {
    indexes: {
      workspace: ['workspace_id'],
      warranty: ['workspace_id', 'warranty_expires_on'],
    },
    trackMetadata: true,
  },
);

const assetServiceRecords = new Table(
  {
    workspace_id: column.text,
    asset_id: column.text,
    service_date: column.text,
    cost_minor: column.integer,
    cost_currency: column.text,
    provider: column.text,
    notes: column.text,
    revision: column.integer,
    lifecycle_state: column.text,
    source: column.text,
    source_reference: column.text,
    data_quality: column.text,
    confidence: column.text,
    metadata: column.text,
    created_at: column.text,
    updated_at: column.text,
    created_by: column.text,
    updated_by: column.text,
  },
  {
    indexes: {
      workspace: ['workspace_id'],
      asset: ['workspace_id', 'asset_id'],
    },
    trackMetadata: true,
  },
);

/** UAF local schema: foundation plus the first reference domain. */
export const foundationPowerSyncSchema = new Schema({
  workspaces,
  workspace_memberships: workspaceMemberships,
  write_conflicts: writeConflicts,
  audit_events: auditEvents,
  household_assets: householdAssets,
  asset_service_records: assetServiceRecords,
});

export type FoundationPowerSyncDatabase = (typeof foundationPowerSyncSchema)['types'];
