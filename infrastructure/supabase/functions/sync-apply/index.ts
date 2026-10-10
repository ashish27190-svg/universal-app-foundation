import { withSupabase } from 'npm:@supabase/server@1.6.0';
import { mutationHandlers } from '../_shared/handlers.ts';
import {
  parseMutationBatch,
  UAF_MUTATION_PROTOCOL_VERSION,
  type MutationEnvelope,
  type MutationOutcome,
} from '../_shared/mutation-protocol.ts';

// A mutation ID is an immutable request identity. Compare the full canonical
// envelope, not just the ID, before treating a retry as idempotent.
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

async function recordIssue(
  supabaseAdmin: any,
  mutation: MutationEnvelope,
  type: string,
  message: string,
  serverRevision?: number,
  serverPayload?: Record<string, unknown> | null,
): Promise<void> {
  await supabaseAdmin.from('write_conflicts').insert({
    workspace_id: mutation.workspaceId,
    mutation_id: mutation.mutationId,
    operation: mutation.operation,
    entity_type: mutation.entityType,
    entity_id: mutation.entityId,
    conflict_type: type,
    client_revision: mutation.expectedRevision,
    client_payload: mutation.payload,
    server_revision: serverRevision ?? null,
    server_payload: serverPayload ?? { message },
  });
}

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

    for (const mutation of mutations) {
      const { data: workspace, error: workspaceError } = await ctx.supabase
        .from('workspaces')
        .select('id')
        .eq('id', mutation.workspaceId)
        .maybeSingle();

      if (workspaceError) return Response.json({ message: 'Workspace authorization failed.' }, { status: 503 });
      if (!workspace) {
        // Never use the admin client to write into an unauthorized workspace.
        outcomes.push({ mutationId: mutation.mutationId, status: 'rejected', message: 'Workspace access denied.' });
        continue;
      }

      // Membership allows reading; only owners/admins may mutate durable rows.
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
      const { data: previousMutation, error: idempotencyReadError } = await ctx.supabaseAdmin
        .from('processed_mutations')
        .select('workspace_id,user_id,entity_type,entity_id,operation,result')
        .eq('mutation_id', mutation.mutationId)
        .maybeSingle();

      if (idempotencyReadError) return Response.json({ message: 'Idempotency check failed.' }, { status: 503 });
      if (previousMutation) {
        const sameRequest =
          previousMutation.workspace_id === mutation.workspaceId &&
          previousMutation.user_id === userId &&
          previousMutation.entity_type === mutation.entityType &&
          previousMutation.entity_id === mutation.entityId &&
          previousMutation.operation === mutation.operation &&
          previousMutation.result?.requestFingerprint === fingerprint;
        if (!sameRequest) {
          return Response.json({ message: 'Mutation ID is already associated with a different or unverifiable request.' }, { status: 409 });
        }
        outcomes.push({ mutationId: mutation.mutationId, status: 'idempotent' });
        continue;
      }

      const handler = mutationHandlers[mutation.entityType];
      if (!handler) {
        await recordIssue(ctx.supabaseAdmin, mutation, 'unsupported_entity', 'No mutation handler is registered.');
        await ctx.supabaseAdmin.from('processed_mutations').insert({
          mutation_id: mutation.mutationId,
          workspace_id: mutation.workspaceId,
          user_id: userId,
          entity_type: mutation.entityType,
          entity_id: mutation.entityId,
          operation: mutation.operation,
          result_status: 'rejected',
          result: { message: 'No mutation handler is registered.', requestFingerprint: fingerprint },
        });
        outcomes.push({ mutationId: mutation.mutationId, status: 'rejected', message: 'Unsupported entity.' });
        continue;
      }

      try {
        const result = await handler({
          supabase: ctx.supabase,
          supabaseAdmin: ctx.supabaseAdmin,
          actorUserId: userId,
          mutation,
        });
        if (result.status !== 'applied') {
          await recordIssue(
            ctx.supabaseAdmin,
            mutation,
            result.status,
            result.message ?? result.status,
            result.serverRevision,
            result.serverData,
          );
        }

        await ctx.supabaseAdmin.from('processed_mutations').insert({
          mutation_id: mutation.mutationId,
          workspace_id: mutation.workspaceId,
          user_id: userId,
          entity_type: mutation.entityType,
          entity_id: mutation.entityId,
          operation: mutation.operation,
          result_status: result.status === 'applied' ? 'processed' : result.status,
          result: { message: result.message ?? null, requestFingerprint: fingerprint },
        });

        if (result.status === 'applied') {
          await ctx.supabaseAdmin.from('audit_events').insert({
            workspace_id: mutation.workspaceId,
            actor_user_id: userId,
            actor_type: 'user',
            action: `${mutation.entityType}.${mutation.operation}`,
            entity_type: mutation.entityType,
            entity_id: mutation.entityId,
            before_data: result.beforeData ?? null,
            after_data: result.afterData ?? null,
            source: 'powersync',
          });
        }

        outcomes.push({
          mutationId: mutation.mutationId,
          status: result.status,
          ...(result.message ? { message: result.message } : {}),
        });
      } catch (error) {
        // Unknown/server failures are retryable: do not write processed_mutations and return 503.
        console.error('sync-apply handler failure', error);
        return Response.json({ message: 'Mutation processing failed; retry later.' }, { status: 503 });
      }
    }

    return Response.json({ protocolVersion: UAF_MUTATION_PROTOCOL_VERSION, outcomes });
  }),
};
