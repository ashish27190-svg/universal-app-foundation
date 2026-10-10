-- Gate 2: keep-server conflict closure and its audit must commit or roll back together.
-- Only the Edge Function's service_role client may call this RPC.
-- Even that trusted caller must provide an actor with active owner/admin membership.
create or replace function public.keep_server_conflict_transaction(
  p_conflict_id uuid,
  p_actor_user_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target public.write_conflicts%rowtype;
begin
  if p_actor_user_id is null or p_conflict_id is null then
    return pg_catalog.jsonb_build_object('status', 'not_found');
  end if;

  -- Row lock serializes concurrent keep-server attempts on the same conflict.
  select * into target
    from public.write_conflicts
    where id = p_conflict_id
    for update;

  if not found then
    return pg_catalog.jsonb_build_object('status', 'not_found');
  end if;

  -- The Edge Function is not the sole authorization boundary.
  if not exists (
    select 1 from public.workspace_memberships m
    where m.workspace_id = target.workspace_id
      and m.user_id = p_actor_user_id
      and m.status = 'active'
      and m.role in ('owner', 'admin')
  ) then
    return pg_catalog.jsonb_build_object('status', 'denied');
  end if;

  if target.resolved_at is not null then
    return pg_catalog.jsonb_build_object(
      'status', 'already_resolved',
      'resolution', target.resolution
    );
  end if;

  update public.write_conflicts
     set resolved_at = pg_catalog.now(), resolution = 'keep_server'
   where id = target.id;

  -- One DB transaction: an audit failure also rolls back the conflict closure.
  insert into public.audit_events (
    workspace_id, actor_user_id, actor_type, action,
    entity_type, entity_id, before_data, after_data,
    source, correlation_id
  ) values (
    target.workspace_id, p_actor_user_id, 'user', 'write_conflict.keep_server',
    target.entity_type, target.entity_id,
    pg_catalog.jsonb_build_object('client', target.client_payload, 'server', target.server_payload),
    target.server_payload, 'conflict_resolver', target.id
  );

  return pg_catalog.jsonb_build_object('status', 'resolved', 'resolution', 'keep_server');
end;
$$;

-- By default SQL functions grant EXECUTE to PUBLIC; explicitly close the API.
revoke all on function public.keep_server_conflict_transaction(uuid, uuid) from public;
revoke all on function public.keep_server_conflict_transaction(uuid, uuid) from anon, authenticated;
grant execute on function public.keep_server_conflict_transaction(uuid, uuid) to service_role;

comment on function public.keep_server_conflict_transaction(uuid, uuid) is
  'Trusted-server-only RPC for atomic keep-server closure and audit; verifies active workspace writer.';
