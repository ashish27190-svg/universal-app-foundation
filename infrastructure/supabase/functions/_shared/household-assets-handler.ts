import type { SupabaseClient } from 'npm:@supabase/server/peer/supabase-js';
import type { HandlerResult, MutationHandlerContext } from './handlers.ts';

const ASSET_CATEGORIES = new Set(['appliance', 'electronics', 'furniture', 'other']);
const SOURCE = new Set(['manual', 'import', 'integration', 'system', 'calculated', 'ai', 'ai_assisted', 'migration']);
const DATA_QUALITY = new Set(['verified', 'complete', 'incomplete', 'estimated', 'conflicting', 'invalid', 'needs_review']);
const CONFIDENCE = new Set(['high', 'medium', 'low', 'unknown']);
const CURRENCY = /^[A-Z]{3}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

function optionalString(value: unknown, max: number): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  if (typeof value !== 'string' || value.length > max) throw new Error('Invalid text field.');
  return value;
}

function optionalDate(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  if (typeof value !== 'string' || !DATE.test(value)) throw new Error('Invalid date field.');
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(year!, month! - 1, day));
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month! - 1 || parsed.getUTCDate() !== day) {
    throw new Error('Invalid date field.');
  }
  return value;
}

function optionalMoney(amount: unknown, currency: unknown, amountKey: string, currencyKey: string) {
  if (amount === undefined && currency === undefined) return {};
  if (amount === null && (currency === null || currency === undefined)) return { [amountKey]: null, [currencyKey]: null };
  if (!Number.isSafeInteger(amount) || Number(amount) < 0 || typeof currency !== 'string' || !CURRENCY.test(currency)) {
    throw new Error('Invalid money field.');
  }
  return { [amountKey]: amount, [currencyKey]: currency };
}

function objectMetadata(value: unknown): Record<string, unknown> {
  if (value === undefined || value === null || value === '') return {};
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
    } catch { /* handled below */ }
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>;
  throw new Error('Invalid metadata object.');
}

function baseCreateFields(payload: Record<string, unknown>, actorUserId: string) {
  const source = typeof payload.source === 'string' && SOURCE.has(payload.source) ? payload.source : 'manual';
  const dataQuality = typeof payload.data_quality === 'string' && DATA_QUALITY.has(payload.data_quality) ? payload.data_quality : 'complete';
  const confidence = typeof payload.confidence === 'string' && CONFIDENCE.has(payload.confidence) ? payload.confidence : 'high';
  return {
    revision: 1,
    lifecycle_state: 'active',
    source,
    source_reference: optionalString(payload.source_reference, 500) ?? null,
    data_quality: dataQuality,
    confidence,
    metadata: objectMetadata(payload.metadata),
    created_by: actorUserId,
    updated_by: actorUserId,
  };
}

function baseUpdateFields(payload: Record<string, unknown>, actorUserId: string) {
  const fields: Record<string, unknown> = { updated_by: actorUserId };
  if (payload.source_reference !== undefined) fields.source_reference = optionalString(payload.source_reference, 500);
  if (payload.data_quality !== undefined) {
    if (typeof payload.data_quality !== 'string' || !DATA_QUALITY.has(payload.data_quality)) throw new Error('Invalid data quality.');
    fields.data_quality = payload.data_quality;
  }
  if (payload.confidence !== undefined) {
    if (typeof payload.confidence !== 'string' || !CONFIDENCE.has(payload.confidence)) throw new Error('Invalid confidence.');
    fields.confidence = payload.confidence;
  }
  if (payload.metadata !== undefined) fields.metadata = objectMetadata(payload.metadata);
  return fields;
}

async function currentRow(admin: SupabaseClient, table: string, workspaceId: string, id: string) {
  const { data, error } = await admin.from(table).select('*').eq('workspace_id', workspaceId).eq('id', id).maybeSingle();
  if (error) throw error;
  return data as Record<string, unknown> | null;
}

async function applyRevisionUpdate(
  admin: SupabaseClient,
  table: string,
  context: MutationHandlerContext,
  patch: Record<string, unknown>,
  allowedLifecycleStates: readonly string[] = ['active', 'archived', 'superseded'],
): Promise<HandlerResult> {
  const { mutation } = context;
  if (mutation.expectedRevision === null || !Number.isSafeInteger(mutation.expectedRevision) || mutation.expectedRevision < 1) {
    return { status: 'rejected', message: 'Update requires a positive expected revision.' };
  }

  const before = await currentRow(admin, table, mutation.workspaceId, mutation.entityId);
  if (!before) return { status: 'rejected', message: 'Record does not exist.' };
  if (Number(before.revision) !== mutation.expectedRevision) {
    return { status: 'conflict', message: 'Revision conflict.', serverRevision: Number(before.revision), serverData: before };
  }
  if (!allowedLifecycleStates.includes(String(before.lifecycle_state))) {
    return { status: 'rejected', message: `Operation is not valid while record is ${String(before.lifecycle_state)}.` };
  }

  const { data, error } = await admin
    .from(table)
    .update({ ...patch, revision: mutation.expectedRevision + 1 })
    .eq('workspace_id', mutation.workspaceId)
    .eq('id', mutation.entityId)
    .eq('revision', mutation.expectedRevision)
    .select('*')
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    const latest = await currentRow(admin, table, mutation.workspaceId, mutation.entityId);
    return {
      status: 'conflict',
      message: 'Record changed before this mutation could be committed.',
      ...(latest ? { serverRevision: Number(latest.revision) } : {}),
      serverData: latest,
    };
  }
  return { status: 'applied', beforeData: before, afterData: data as Record<string, unknown> };
}

function assetCreatePayload(payload: Record<string, unknown>) {
  if (typeof payload.name !== 'string' || payload.name.trim().length < 1 || payload.name.trim().length > 120) throw new Error('Asset name is required and must be 120 characters or fewer.');
  if (typeof payload.category !== 'string' || !ASSET_CATEGORIES.has(payload.category)) throw new Error('Invalid asset category.');
  return {
    name: payload.name.trim(),
    category: payload.category,
    purchase_date: optionalDate(payload.purchase_date) ?? null,
    ...optionalMoney(payload.purchase_price_minor, payload.purchase_currency, 'purchase_price_minor', 'purchase_currency'),
    warranty_expires_on: optionalDate(payload.warranty_expires_on) ?? null,
    notes: optionalString(payload.notes, 5000) ?? null,
  };
}

function assetUpdatePayload(payload: Record<string, unknown>, actorUserId: string) {
  const patch: Record<string, unknown> = baseUpdateFields(payload, actorUserId);
  if (payload.name !== undefined) {
    if (typeof payload.name !== 'string' || payload.name.trim().length < 1 || payload.name.trim().length > 120) throw new Error('Invalid asset name.');
    patch.name = payload.name.trim();
  }
  if (payload.category !== undefined) {
    if (typeof payload.category !== 'string' || !ASSET_CATEGORIES.has(payload.category)) throw new Error('Invalid asset category.');
    patch.category = payload.category;
  }
  if (payload.purchase_date !== undefined) patch.purchase_date = optionalDate(payload.purchase_date);
  if (payload.purchase_price_minor !== undefined || payload.purchase_currency !== undefined) Object.assign(patch, optionalMoney(payload.purchase_price_minor, payload.purchase_currency, 'purchase_price_minor', 'purchase_currency'));
  if (payload.warranty_expires_on !== undefined) patch.warranty_expires_on = optionalDate(payload.warranty_expires_on);
  if (payload.notes !== undefined) patch.notes = optionalString(payload.notes, 5000);
  return patch;
}

export async function handleHouseholdAsset(context: MutationHandlerContext): Promise<HandlerResult> {
  const { mutation, supabaseAdmin, actorUserId } = context;
  if (mutation.operation === 'create') {
    if (mutation.expectedRevision !== null) return { status: 'rejected', message: 'Create must not specify an expected revision.' };
    let insert;
    try {
      insert = {
        id: mutation.entityId,
        workspace_id: mutation.workspaceId,
        ...assetCreatePayload(mutation.payload),
        ...baseCreateFields(mutation.payload, actorUserId),
      };
    } catch (error) {
      return { status: 'rejected', message: error instanceof Error ? error.message : 'Invalid asset.' };
    }
    const { data, error } = await supabaseAdmin.from('household_assets').insert(insert).select('*').single();
    if (error) {
      if ((error as { code?: string }).code === '23505') {
        const existing = await currentRow(supabaseAdmin, 'household_assets', mutation.workspaceId, mutation.entityId);
        return { status: 'conflict', message: 'Asset id already exists.', ...(existing ? { serverRevision: Number(existing.revision) } : {}), serverData: existing };
      }
      throw error;
    }
    return { status: 'applied', beforeData: null, afterData: data as Record<string, unknown> };
  }

  if (mutation.operation === 'soft_delete') {
    return applyRevisionUpdate(supabaseAdmin, 'household_assets', context, { lifecycle_state: 'deleted', updated_by: actorUserId }, ['active', 'archived', 'superseded']);
  }
  if (mutation.operation === 'restore') {
    return applyRevisionUpdate(supabaseAdmin, 'household_assets', context, { lifecycle_state: 'active', updated_by: actorUserId }, ['deleted']);
  }
  try {
    return await applyRevisionUpdate(supabaseAdmin, 'household_assets', context, assetUpdatePayload(mutation.payload, actorUserId));
  } catch (error) {
    return { status: 'rejected', message: error instanceof Error ? error.message : 'Invalid asset update.' };
  }
}

function serviceCreatePayload(payload: Record<string, unknown>) {
  if (typeof payload.asset_id !== 'string' || !payload.asset_id) throw new Error('asset_id is required.');
  const date = optionalDate(payload.service_date);
  if (!date) throw new Error('service_date is required.');
  return {
    asset_id: payload.asset_id,
    service_date: date,
    ...optionalMoney(payload.cost_minor, payload.cost_currency, 'cost_minor', 'cost_currency'),
    provider: optionalString(payload.provider, 160) ?? null,
    notes: optionalString(payload.notes, 5000) ?? null,
  };
}

function serviceUpdatePayload(payload: Record<string, unknown>, actorUserId: string) {
  const patch: Record<string, unknown> = baseUpdateFields(payload, actorUserId);
  if (payload.asset_id !== undefined) throw new Error('asset_id is immutable after creation.');
  if (payload.service_date !== undefined) {
    const date = optionalDate(payload.service_date);
    if (!date) throw new Error('service_date cannot be empty.');
    patch.service_date = date;
  }
  if (payload.cost_minor !== undefined || payload.cost_currency !== undefined) Object.assign(patch, optionalMoney(payload.cost_minor, payload.cost_currency, 'cost_minor', 'cost_currency'));
  if (payload.provider !== undefined) patch.provider = optionalString(payload.provider, 160);
  if (payload.notes !== undefined) patch.notes = optionalString(payload.notes, 5000);
  return patch;
}

async function assetBelongsToWorkspace(admin: SupabaseClient, workspaceId: string, assetId: string): Promise<boolean> {
  const { data, error } = await admin.from('household_assets').select('id').eq('id', assetId).eq('workspace_id', workspaceId).neq('lifecycle_state', 'deleted').maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

export async function handleAssetServiceRecord(context: MutationHandlerContext): Promise<HandlerResult> {
  const { mutation, supabaseAdmin, actorUserId } = context;
  if (mutation.operation === 'create') {
    if (mutation.expectedRevision !== null) return { status: 'rejected', message: 'Create must not specify an expected revision.' };
    let fields;
    try { fields = serviceCreatePayload(mutation.payload); }
    catch (error) { return { status: 'rejected', message: error instanceof Error ? error.message : 'Invalid service record.' }; }
    if (!(await assetBelongsToWorkspace(supabaseAdmin, mutation.workspaceId, String(fields.asset_id)))) {
      return { status: 'rejected', message: 'Referenced asset does not belong to this workspace or is deleted.' };
    }
    const { data, error } = await supabaseAdmin.from('asset_service_records').insert({
      id: mutation.entityId,
      workspace_id: mutation.workspaceId,
      ...fields,
      ...baseCreateFields(mutation.payload, actorUserId),
    }).select('*').single();
    if (error) {
      if ((error as { code?: string }).code === '23505') {
        const existing = await currentRow(supabaseAdmin, 'asset_service_records', mutation.workspaceId, mutation.entityId);
        return { status: 'conflict', message: 'Service-record id already exists.', ...(existing ? { serverRevision: Number(existing.revision) } : {}), serverData: existing };
      }
      throw error;
    }
    return { status: 'applied', beforeData: null, afterData: data as Record<string, unknown> };
  }
  if (mutation.operation === 'soft_delete') return applyRevisionUpdate(supabaseAdmin, 'asset_service_records', context, { lifecycle_state: 'deleted', updated_by: actorUserId }, ['active', 'archived', 'superseded']);
  if (mutation.operation === 'restore') return applyRevisionUpdate(supabaseAdmin, 'asset_service_records', context, { lifecycle_state: 'active', updated_by: actorUserId }, ['deleted']);
  try {
    return await applyRevisionUpdate(supabaseAdmin, 'asset_service_records', context, serviceUpdatePayload(mutation.payload, actorUserId));
  } catch (error) {
    return { status: 'rejected', message: error instanceof Error ? error.message : 'Invalid service-record update.' };
  }
}
