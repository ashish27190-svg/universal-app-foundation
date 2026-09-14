import { withSupabase } from 'npm:@supabase/server@1.6.0';
import { mutationHandlers } from '../_shared/handlers.ts';
import type { MutationEnvelope, MutationOperation } from '../_shared/mutation-protocol.ts';

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

function parseRequest(input: unknown): { conflictId: string; choice: ConflictResolutionChoice } {
  if (!input || typeof input !== 'object') throw new Error('Invalid conflict resolution request.');
  const value = input as Record<string, unknown>;
  if (typeof value.conflictId !== 'string' || !value.conflictId) throw new Error('conflictId is required.');
  if (value.choice !== 'keep_server' && value.choice !== 'reapply_client') throw new Error('Invalid conflict resolution choice.');
  return { conflictId: value.conflictId, choice: value.choice };
}

export default {
  fetch: withSupabase({ auth: 'user' }, async (req, ctx) => {
    if (req.method !== 'POST') return Response.json({ message: 'Method not allowed' }, { status: 405 });

    let request: { conflictId: string; choice: ConflictResolutionChoice };
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
    if (conflict.resolved_at) {
      return Response.json({ status: 'already_resolved', resolution: conflict.resolution });
    }

    if (request.choice === 'keep_server') {
      const { error } = await ctx.supabaseAdmin
        .from('write_conflicts')
        .update({ resolved_at: new Date().toISOString(), resolution: 'keep_server' })
        .eq('id', conflict.id)
        .is('resolved_at', null);
      if (error) return Response.json({ message: 'Could not resolve conflict.' }, { status: 503 });

      await ctx.supabaseAdmin.from('audit_events').insert({
        workspace_id: conflict.workspace_id,
        actor_user_id: userId,
        actor_type: 'user',
        action: 'write_conflict.keep_server',
        entity_type: conflict.entity_type,
        entity_id: conflict.entity_id,
        before_data: { client: conflict.client_payload, server: conflict.server_payload },
        after_data: conflict.server_payload,
        source: 'conflict_resolver',
        correlation_id: conflict.id,
      });
      return Response.json({ status: 'resolved', resolution: 'keep_server' });
    }

    if (!conflict.operation || conflict.operation === 'create') {
      return Response.json({ message: 'This conflict cannot be safely reapplied; keep the server version instead.' }, { status: 409 });
    }
    if (conflict.server_revision === null || !Number.isSafeInteger(conflict.server_revision) || conflict.server_revision < 1) {
      return Response.json({ message: 'Conflict is missing a valid server revision.' }, { status: 409 });
    }

    const handler = mutationHandlers[conflict.entity_type];
    if (!handler) return Response.json({ message: 'No mutation handler exists for this conflict.' }, { status: 409 });

    const replayMutation: MutationEnvelope = {
      protocolVersion: 1,
      mutationId: crypto.randomUUID(),
      clientDatabaseId: 'conflict-resolver',
      clientOperationId: 0,
      workspaceId: conflict.workspace_id,
      entityType: conflict.entity_type,
      entityId: conflict.entity_id,
      operation: conflict.operation,
      expectedRevision: conflict.server_revision,
      payload: conflict.client_payload ?? {},
    };

    try {
      const result = await handler({
        supabase: ctx.supabase,
        supabaseAdmin: ctx.supabaseAdmin,
        actorUserId: userId,
        mutation: replayMutation,
      });

      if (result.status === 'conflict') {
        await ctx.supabaseAdmin
          .from('write_conflicts')
          .update({
            server_revision: result.serverRevision ?? conflict.server_revision,
            server_payload: result.serverData ?? conflict.server_payload,
          })
          .eq('id', conflict.id)
          .is('resolved_at', null);
        return Response.json({ message: 'The server record changed again. Review the latest version before retrying.' }, { status: 409 });
      }
      if (result.status === 'rejected') {
        return Response.json({ message: result.message ?? 'The client version can no longer be reapplied safely.' }, { status: 422 });
      }

      const { error: resolveError } = await ctx.supabaseAdmin
        .from('write_conflicts')
        .update({ resolved_at: new Date().toISOString(), resolution: 'reapply_client' })
        .eq('id', conflict.id)
        .is('resolved_at', null);
      if (resolveError) return Response.json({ message: 'The change was reapplied but conflict closure failed; refresh before retrying.' }, { status: 503 });

      await ctx.supabaseAdmin.from('audit_events').insert({
        workspace_id: conflict.workspace_id,
        actor_user_id: userId,
        actor_type: 'user',
        action: 'write_conflict.reapply_client',
        entity_type: conflict.entity_type,
        entity_id: conflict.entity_id,
        before_data: result.beforeData ?? conflict.server_payload,
        after_data: result.afterData ?? null,
        source: 'conflict_resolver',
        correlation_id: conflict.id,
      });

      return Response.json({ status: 'resolved', resolution: 'reapply_client' });
    } catch (error) {
      console.error('resolve-conflict handler failure', error);
      return Response.json({ message: 'Conflict resolution failed; retry later.' }, { status: 503 });
    }
  }),
};
