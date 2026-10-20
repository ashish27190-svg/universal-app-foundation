import { withSupabase } from 'npm:@supabase/server@1.6.0';
import { prepareAtomicAssetFields } from '../_shared/household-assets-handler.ts';
import type { MutationOperation } from '../_shared/mutation-protocol.ts';

type ConflictResolutionChoice = 'keep_server' | 'reapply_client';

interface ConflictRow {
  id: string;
  workspace_id: string;
  mutation_id: string | null;
  operation: MutationOperation | null;
  entity_type: string;
  entity_id: string;
  conflict_type: string;
  client_revision: number | null;
  server_revision: number | null;
  client_payload: Record<string, unknown>;
  server_payload: Record<string, unknown>;
  resolved_at: string | null;
  resolution: string | null;
}

function parseRequest(input: unknown): { conflictId: string; choice: ConflictResolutionChoice; reviewedRevision?: number } {
  if (!input || typeof input !== 'object') throw new Error('Invalid conflict resolution request.');
  const value = input as Record<string, unknown>;
  if (typeof value.conflictId !== 'string' || !value.conflictId) throw new Error('conflictId is required.');
  if (value.choice !== 'keep_server' && value.choice !== 'reapply_client') throw new Error('Invalid conflict resolution choice.');
  if (value.choice === 'reapply_client' && (!Number.isSafeInteger(value.reviewedRevision) || Number(value.reviewedRevision) < 1)) {
    throw new Error('reapply_client requires the explicitly reviewed positive server revision.');
  }
  return {
    conflictId: value.conflictId,
    choice: value.choice,
    ...(value.choice === 'reapply_client' ? { reviewedRevision: value.reviewedRevision as number } : {}),
  };
}

export default {
  fetch: withSupabase({ auth: 'user' }, async (req, ctx) => {
    if (req.method !== 'POST') return Response.json({ message: 'Method not allowed' }, { status: 405 });

    let request: { conflictId: string; choice: ConflictResolutionChoice; reviewedRevision?: number };
    try {
      request = parseRequest(await req.json());
    } catch (error) {
      return Response.json({ message: error instanceof Error ? error.message : 'Invalid request.' }, { status: 400 });
    }

    const userId = ctx.userClaims?.id;
    if (!userId) return Response.json({ message: 'Authenticated user id is unavailable.' }, { status: 401 });

    const { data: visibleConflict, error: visibleError } = await ctx.supabase
      .from('write_conflicts')
      .select('*')
      .eq('id', request.conflictId)
      .maybeSingle();
    if (visibleError) return Response.json({ message: 'Conflict authorization failed.' }, { status: 503 });
    if (!visibleConflict) return Response.json({ message: 'Conflict not found.' }, { status: 404 });

    const conflict = visibleConflict as ConflictRow;

    // A readable conflict is not necessarily writable by this member.
    // RLS may permit viewers to read, but resolution mutates server-owned rows.
    const { data: canWrite, error: writePermissionError } = await ctx.supabase
      .rpc('can_write_workspace', { target_workspace_id: conflict.workspace_id });
    if (writePermissionError) {
      return Response.json({ message: 'Conflict write authorization failed.' }, { status: 503 });
    }
    if (canWrite !== true) {
      return Response.json({ message: 'Workspace write access denied.' }, { status: 403 });
    }

    if (conflict.resolved_at) {
      return Response.json({ status: 'already_resolved', resolution: conflict.resolution });
    }

    if (request.choice === 'keep_server') {
      // Single server-side transaction: row lock, writer check, conflict close, audit.
      // A retry cannot silently close twice or emit a duplicate audit event.
      const { data, error } = await ctx.supabaseAdmin
        .rpc('keep_server_conflict_transaction', {
          p_conflict_id: conflict.id,
          p_actor_user_id: userId,
        });
      if (error) return Response.json({ message: 'Could not resolve conflict; retry later.' }, { status: 503 });
      if (data?.status === 'denied') {
        return Response.json({ message: 'Workspace write access denied.' }, { status: 403 });
      }
      if (data?.status === 'not_found') return Response.json({ message: 'Conflict not found.' }, { status: 404 });
      if (data?.status === 'already_resolved') {
        return Response.json({ status: 'already_resolved', resolution: data.resolution });
      }
      if (data?.status !== 'resolved' || data.resolution !== 'keep_server') {
        return Response.json({ message: 'Unexpected conflict resolution result.' }, { status: 503 });
      }
      return Response.json({ status: 'resolved', resolution: 'keep_server' });
    }

    if (!conflict.operation || conflict.operation === 'create') {
      return Response.json({ message: 'This conflict cannot be safely reapplied; keep the server version instead.' }, { status: 409 });
    }
    if (conflict.server_revision === null || !Number.isSafeInteger(conflict.server_revision) || conflict.server_revision < 1) {
      return Response.json({ message: 'Conflict is missing a valid server revision.' }, { status: 409 });
    }
    if (!['household_assets', 'asset_service_records'].includes(conflict.entity_type)) {
      return Response.json({ message: 'No safe reapply handler for this entity.' }, { status: 409 });
    }

    // Only derive a sanitized field set from this server-owned conflict.
    // The browser cannot send an arbitrary data patch to the privileged RPC.
    let fields: Record<string, unknown> = {};
    let validationError: string | null = null;
    try {
      fields = prepareAtomicAssetFields(
        conflict.entity_type, conflict.operation, conflict.client_payload ?? {}, userId,
      );
    } catch (error) {
      validationError = error instanceof Error ? error.message : 'Invalid conflict payload.';
    }

    const { data, error } = await ctx.supabaseAdmin.rpc('reapply_conflict_transaction', {
      p_conflict_id: conflict.id,
      p_actor_user_id: userId,
      p_reviewed_server_revision: request.reviewedRevision,
      p_fields: fields,
      p_validation_error: validationError,
    });

    if (error) {
      console.error('atomic conflict reapplication failed', { code: error.code, conflictId: conflict.id });
      return Response.json({ message: 'Reapplication failed without a partial commit; retry later.' }, { status: 503 });
    }
    if (data?.status === 'denied') return Response.json({ message: 'Workspace write access denied.' }, { status: 403 });
    if (data?.status === 'not_found') return Response.json({ message: 'Conflict not found.' }, { status: 404 });
    if (data?.status === 'already_resolved') {
      return Response.json({ status: 'already_resolved', resolution: data.resolution });
    }
    if (data?.status === 'stale' || data?.status === 'review_required') {
      return Response.json({
        message: 'The server record changed. Review its latest version before reapplying.',
        serverRevision: data.serverRevision,
      }, { status: 409 });
    }
    if (data?.status === 'unsupported') {
      return Response.json({ message: 'This conflict cannot be safely reapplied.' }, { status: 409 });
    }
    if (data?.status === 'invalid') {
      return Response.json({ message: data.message ?? 'The client version is no longer valid.' }, { status: 422 });
    }
    if (data?.status !== 'resolved' || data?.resolution !== 'reapply_client') {
      return Response.json({ message: 'Unexpected conflict resolution result.' }, { status: 503 });
    }
    return Response.json({ status: 'resolved', resolution: 'reapply_client' });
  }),
};
