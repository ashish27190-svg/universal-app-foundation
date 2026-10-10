-- Gate 2: conflict reapplication is atomic and requires explicit review of a
-- particular server revision. Never use a live project for unverified migration.
-- Called only by the authenticated Edge gateway using its service-role client.

create or replace function public.reapply_conflict_transaction(
  p_conflict_id uuid,
  p_actor_user_id uuid,
  p_reviewed_server_revision bigint,
  p_fields jsonb,
  p_validation_error text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target public.write_conflicts%rowtype;
  current_entity jsonb;
  current_revision bigint;
  active_state text;
  allowed_fields text[];
  result jsonb;
  replay_id uuid;
begin
  if p_conflict_id is null or p_actor_user_id is null
     or p_reviewed_server_revision is null or p_reviewed_server_revision < 1
     or p_fields is null or pg_catalog.jsonb_typeof(p_fields) <> 'object' then
    raise exception 'Malformed reapply request' using errcode = '22023';
  end if;

  -- Also serializes keep_server and reapply_client, which lock the same row.
  select * into target from public.write_conflicts
    where id = p_conflict_id for update;

  if not found then
    return pg_catalog.jsonb_build_object('status','not_found');
  end if;

  -- The SQL transaction re-authorizes the claimed actor, rather than trusting
  -- just the Edge function's earlier membership check.
  if not exists (
    select 1 from public.workspace_memberships membership
      join public.workspaces workspace on workspace.id = membership.workspace_id
    where membership.workspace_id = target.workspace_id
      and membership.user_id = p_actor_user_id
      and membership.status = 'active'
      and membership.role in ('owner','admin')
      and workspace.status = 'active'
  ) then
    return pg_catalog.jsonb_build_object('status','denied');
  end if;

  if target.resolved_at is not null then
    return pg_catalog.jsonb_build_object('status','already_resolved',
                                         'resolution',target.resolution);
  end if;

  if target.operation not in ('update','soft_delete','restore')
     or target.entity_type not in ('household_assets','asset_service_records')
     or target.server_revision is null or target.server_revision < 1 then
    return pg_catalog.jsonb_build_object('status','unsupported');
  end if;

  -- A stale request may NEVER silently reapply after the server snapshot has
  -- been refreshed. The client must fetch, review, and submit the new revision.
  if p_reviewed_server_revision <> target.server_revision then
    return pg_catalog.jsonb_build_object('status','review_required',
      'serverRevision',target.server_revision);
  end if;

  if p_validation_error is not null then
    return pg_catalog.jsonb_build_object('status','invalid',
      'message',pg_catalog.left(p_validation_error,500));
  end if;

  allowed_fields := case
    when target.entity_type = 'household_assets' and target.operation = 'update'
      then array['name','category','purchase_date','purchase_price_minor',
                 'purchase_currency','warranty_expires_on','notes',
                 'source_reference','data_quality','confidence','metadata']
    when target.entity_type = 'asset_service_records' and target.operation = 'update'
      then array['service_date','cost_minor','cost_currency','provider','notes',
                 'source_reference','data_quality','confidence','metadata']
    else array[]::text[]
  end;
  if exists (
    select 1 from pg_catalog.jsonb_object_keys(p_fields) as field(key)
    where not field.key = any(allowed_fields)
  ) then
    return pg_catalog.jsonb_build_object('status','invalid',
      'message','Unrecognized or immutable field');
  end if;

  -- Lock the actual entity so another writer cannot advance its revision
  -- between the review check and the reapplication.
  if target.entity_type = 'household_assets' then
    select pg_catalog.to_jsonb(entity) into current_entity
      from public.household_assets entity
      where entity.id = target.entity_id
        and entity.workspace_id = target.workspace_id
      for update;
  else
    select pg_catalog.to_jsonb(entity) into current_entity
      from public.asset_service_records entity
      where entity.id = target.entity_id
        and entity.workspace_id = target.workspace_id
      for update;
  end if;

  if current_entity is null then
    return pg_catalog.jsonb_build_object('status','invalid',
      'message','Server record no longer exists');
  end if;

  current_revision := (current_entity->>'revision')::bigint;
  active_state := current_entity->>'lifecycle_state';

  if current_revision <> target.server_revision then
    update public.write_conflicts
       set server_revision = current_revision,
           server_payload = current_entity
     where id = target.id and resolved_at is null;

    return pg_catalog.jsonb_build_object('status','stale',
      'serverRevision',current_revision);
  end if;

  if (target.operation = 'restore' and active_state <> 'deleted')
     or (target.operation <> 'restore' and active_state not in
         ('active','archived','superseded')) then
    return pg_catalog.jsonb_build_object('status','invalid',
      'message','Server lifecycle does not permit this operation');
  end if;

  -- A nested SQL function runs in this same PostgREST transaction.
  -- Any exception in entity, ledger, audit, or closure rolls everything back.
  -- This UUID never leaves the server. The fixed 64-hex fingerprint is for
  -- an internal single-use ID and is NOT a client-authentication credential.
  replay_id := pg_catalog.gen_random_uuid();
  result := public.apply_atomic_mutation(
    replay_id, target.workspace_id, p_actor_user_id,
    target.entity_type, target.entity_id, target.operation,
    current_revision, pg_catalog.repeat('0',64),
    target.client_payload, p_fields, null
  );

  if result->>'status' <> 'applied' then
    raise exception 'Atomic replay failed: %', result->>'status'
      using errcode = 'P0001';
  end if;

  update public.write_conflicts
     set resolved_at = pg_catalog.now(),
         resolution = 'reapply_client'
   where id = target.id and resolved_at is null;

  insert into public.audit_events (
    workspace_id, actor_user_id, actor_type, action,
    entity_type, entity_id, before_data, after_data,
    source, correlation_id
  ) values (
    target.workspace_id, p_actor_user_id, 'user',
    'write_conflict.reapply_client', target.entity_type, target.entity_id,
    current_entity,
    case when target.entity_type = 'household_assets'
      then (select pg_catalog.to_jsonb(entity)
            from public.household_assets entity
            where entity.id = target.entity_id)
      else (select pg_catalog.to_jsonb(entity)
            from public.asset_service_records entity
            where entity.id = target.entity_id)
    end,
    'conflict_resolver', target.id
  );

  return pg_catalog.jsonb_build_object('status','resolved',
    'resolution','reapply_client');
end;
$$;

revoke all on function public.reapply_conflict_transaction(
  uuid,uuid,bigint,jsonb,text
) from public, anon, authenticated;
grant execute on function public.reapply_conflict_transaction(
  uuid,uuid,bigint,jsonb,text
) to service_role;

comment on function public.reapply_conflict_transaction(
  uuid,uuid,bigint,jsonb,text
) is 'Service-role-only atomic conflict replay with explicit revision review, row locking, and audit.';
