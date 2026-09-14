import type { SupabaseClient } from 'npm:@supabase/server/peer/supabase-js';
import type { MutationEnvelope } from './mutation-protocol.ts';
import { handleAssetServiceRecord, handleHouseholdAsset } from './household-assets-handler.ts';

export interface HandlerResult {
  status: 'applied' | 'conflict' | 'rejected';
  message?: string;
  beforeData?: Record<string, unknown> | null;
  afterData?: Record<string, unknown> | null;
  serverRevision?: number;
  serverData?: Record<string, unknown> | null;
}

export interface MutationHandlerContext {
  /** RLS-scoped user client; reserved for authorization-aware reads. */
  supabase: SupabaseClient;
  /** Server client. May only be used after the gateway's workspace authorization succeeds. */
  supabaseAdmin: SupabaseClient;
  actorUserId: string;
  mutation: MutationEnvelope;
}

export type MutationHandler = (context: MutationHandlerContext) => Promise<HandlerResult>;

export const mutationHandlers: Readonly<Record<string, MutationHandler>> = Object.freeze({
  household_assets: handleHouseholdAsset,
  asset_service_records: handleAssetServiceRecord,
});
