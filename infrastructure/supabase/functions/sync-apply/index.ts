import { withSupabase } from 'npm:@supabase/server@1.6.0';
import { prepareAtomicAssetFields } from '../_shared/household-assets-handler.ts';
import {
  parseMutationBatch,
  UAF_MUTATION_PROTOCOL_VERSION,
  type MutationEnvelope,
  type MutationOutcome,
} from '../_shared/mutation-protocol.ts';

// Canonical fingerprint binds one mutationId to its complete original request.
// Field preparation is a pure validation step; all durable effects happen in SQL.
function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonicalJson).join(',') + ']';
  const data = value as Record<string, unknown>;
  return '{' + Object.keys(data).sort()
    .map(key => JSON.stringify(key) + ':' + canonicalJson(data[key]))
    .join(',') + '}';
}

async function requestFingerprint(mutation: MutationEnvelope): Promise<string> {
  const input = new TextEncoder().encode(canonicalJson(mutation));
  const digest = await crypto.subtle.digest('SHA-256', input);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

type AtomicResult = {
  status: 'applied' | 'idempotent' | 'conflict' | 'rejected' | 'identity_mismatch';
  message?: string | null;
};

export default {
  fetch: withSupabase({ auth: 'user' }, async (req, ctx) => {
    if (req.method !== 'POST') {
      return Response.json({ message: 'Method not allowed' }, { status: 405 });
    }

    let mutations: MutationEnvelope[];
    try {
      mutations = parseMutationBatch(await req.json());
    } catch (error) {
      return Response.json(
        { message: error instanceof Error ? error.message : 'Invalid mutation request' },
        { status: 400 },
      );
    }

    const userId = ctx.userClaims?.id;
    if (!userId) return Response.json({ message: 'Authenticated user id is unavailable.' }, { status: 401 });
    const outcomes: MutationOutcome[] = [];

    // A batch is a sequence of independently atomic mutations. An error on
    // mutation N never partially commits N, but earlier successful mutations
    // in the batch remain committed (as in the existing sync protocol).
    for (const mutation of mutations) {
      const { data: workspace, error: workspaceError } = await ctx.supabase
        .from('workspaces')
        .select('id')
        .eq('id', mutation.workspaceId)
        .maybeSingle();
      if (workspaceError) return Response.json({ message: 'Workspace authorization failed.' }, { status: 503 });
      if (!workspace) {
        outcomes.push({ mutationId: mutation.mutationId, status: 'rejected', message: 'Workspace access denied.' });
        continue;
      }

      const { data: canWrite, error: writePermissionError } = await ctx.supabase
        .rpc('can_write_workspace', { target_workspace_id: mutation.workspaceId });
      if (writePermissionError) {
        return Response.json({ message: 'Workspace write authorization failed.' }, { status: 503 });
      }
      if (canWrite !== true) {
        outcomes.push({ mutationId: mutation.mutationId, status: 'rejected', message: 'Workspace write access denied.' });
        continue;
      }

      const fingerprint = await requestFingerprint(mutation);
      let fields: Record<string, unknown> = {};
      let validationError: string | null = null;
      try {
        fields = prepareAtomicAssetFields(mutation.entityType, mutation.operation, mutation.payload, userId);
      } catch (error) {
        validationError = error instanceof Error ? error.message : 'Invalid mutation fields.';
      }

      // This one PostgREST RPC is one PostgreSQL transaction. Authorization is
      // also rechecked inside SQL. No standalone table writes are permitted here.
      const { data, error } = await ctx.supabaseAdmin.rpc('apply_atomic_mutation', {
        p_mutation_id: mutation.mutationId,
        p_workspace_id: mutation.workspaceId,
        p_actor_user_id: userId,
        p_entity_type: mutation.entityType,
        p_entity_id: mutation.entityId,
        p_operation: mutation.operation,
        p_expected_revision: mutation.expectedRevision,
        p_fingerprint: fingerprint,
        p_client_payload: mutation.payload,
        p_fields: fields,
        p_validation_error: validationError,
      });

      if (error) {
        console.error('sync-apply atomic mutation failure', {
          code: error.code, mutationId: mutation.mutationId,
        });
        // The RPC rolled back all writes for THIS mutation; safe to retry.
        return Response.json({ message: 'Mutation processing failed; retry later.' }, { status: 503 });
      }

      const result = data as AtomicResult | null;
      if (!result || !['applied', 'idempotent', 'conflict', 'rejected', 'identity_mismatch'].includes(result.status)) {
        return Response.json({ message: 'Unexpected atomic mutation response.' }, { status: 503 });
      }
      if (result.status === 'identity_mismatch') {
        return Response.json({ message: 'Mutation ID is already associated with a different request.' }, { status: 409 });
      }

      outcomes.push({
        mutationId: mutation.mutationId,
        status: result.status,
        ...(result.message ? { message: result.message } : {}),
      });
    }

    return Response.json({ protocolVersion: UAF_MUTATION_PROTOCOL_VERSION, outcomes });
  }),
};
