-- Gate 2: one logical mutation = one database transaction, including its
-- business row, idempotency ledger, conflict record (if any), and audit event.
-- The only caller is the authenticated Edge gateway using its service role.
-- Unlike earlier multi-request writes, exceptions roll back ALL effects.
create or replace function public.apply_atomic_mutation(
  p_mutation_id uuid,
  p_workspace_id uuid,
  p_actor_user_id uuid,
  p_entity_type text,
  p_entity_id uuid,
  p_operation text,
  p_expected_revision bigint,
  p_fingerprint text,
  p_client_payload jsonb,
  p_fields jsonb,
  p_validation_error text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  prior public.processed_mutations%rowtype;
  r_household_assets public.household_assets%rowtype;
  r_asset_service_records public.asset_service_records%rowtype;
  authorized boolean;
  before_data jsonb;
  after_data jsonb;
  status text := 'applied';
  message text := null;
  server_revision bigint;
  permitted_fields text[];
begin
  if p_mutation_id is null or p_workspace_id is null or p_actor_user_id is null
     or p_entity_id is null or p_fingerprint is null or p_fingerprint !~ '^[a-f0-9]{64}$'
     or p_client_payload is null or pg_catalog.jsonb_typeof(p_client_payload) <> 'object'
     or p_fields is null or pg_catalog.jsonb_typeof(p_fields) <> 'object'
     or p_operation not in ('create','update','soft_delete','restore') then
    raise exception 'Malformed atomic mutation request' using errcode = '22023';
  end if;

  -- Serialize same-ID attempts before checking the ledger. Collisions in the
  -- 64-bit advisory hash only serialize unrelated calls, never permit duplicates.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_mutation_id::text, 20261010)
  );

  -- Re-check membership INSIDE the transaction, not solely in the gateway.
  select true into authorized
    from public.workspace_memberships membership
    join public.workspaces workspace on workspace.id = membership.workspace_id
   where membership.workspace_id = p_workspace_id
     and membership.user_id = p_actor_user_id
     and membership.status = 'active'
     and membership.role in ('owner','admin')
     and workspace.status = 'active'
   for share of membership, workspace;
  if authorized is distinct from true then
    return pg_catalog.jsonb_build_object('status','rejected','message','Workspace write access denied.');
  end if;

  select * into prior from public.processed_mutations where mutation_id = p_mutation_id;
  if found then
    if prior.workspace_id = p_workspace_id and prior.user_id = p_actor_user_id
       and prior.entity_type = p_entity_type and prior.entity_id = p_entity_id
       and prior.operation = p_operation
       and prior.result->>'requestFingerprint' = p_fingerprint then
      return pg_catalog.jsonb_build_object('status','idempotent');
    end if;
    return pg_catalog.jsonb_build_object('status','identity_mismatch',
      'message','Mutation ID is associated with another request.');
  end if;

  if p_entity_type not in ('household_assets','asset_service_records') then
    status := 'rejected';
    message := 'Unsupported entity.';
  elsif p_validation_error is not null then
    status := 'rejected';
    message := pg_catalog.left(p_validation_error,500);
  elsif (p_operation = 'create' and p_expected_revision is not null)
     or (p_operation <> 'create' and (p_expected_revision is null or p_expected_revision < 1)) then
    status := 'rejected';
    message := 'Invalid expected revision for operation.';
  else
    -- Do not accept dynamic table names or unreviewed columns from a client.
    permitted_fields := case
      when p_entity_type = 'household_assets' and p_operation = 'create'
        then array['name', 'category', 'purchase_date', 'purchase_price_minor', 'purchase_currency', 'warranty_expires_on', 'notes', 'source', 'source_reference', 'data_quality', 'confidence', 'metadata']
      when p_entity_type = 'household_assets' and p_operation = 'update'
        then array['name', 'category', 'purchase_date', 'purchase_price_minor', 'purchase_currency', 'warranty_expires_on', 'notes', 'source_reference', 'data_quality', 'confidence', 'metadata']
      when p_entity_type = 'asset_service_records' and p_operation = 'create'
        then array['asset_id', 'service_date', 'cost_minor', 'cost_currency', 'provider', 'notes', 'source', 'source_reference', 'data_quality', 'confidence', 'metadata']
      when p_entity_type = 'asset_service_records' and p_operation = 'update'
        then array['service_date', 'cost_minor', 'cost_currency', 'provider', 'notes', 'source_reference', 'data_quality', 'confidence', 'metadata']
      else array[]::text[]
    end;

    if exists (
      select 1 from pg_catalog.jsonb_object_keys(p_fields) as field(key)
      where not field.key = any(permitted_fields)
    ) then
      raise exception 'Unrecognized or immutable mutation field' using errcode = '22023';
    end if;

    if p_entity_type = 'household_assets' then
      if p_operation = 'create' then
      select * into r_household_assets from pg_catalog.jsonb_populate_record(null::public.household_assets, p_fields);
      insert into public.household_assets (
        id, workspace_id, name, category, purchase_date, purchase_price_minor, purchase_currency, warranty_expires_on, notes, source, source_reference, data_quality, confidence, metadata, revision, lifecycle_state, created_by, updated_by
      ) values (
        p_entity_id, p_workspace_id, r_household_assets.name, r_household_assets.category, r_household_assets.purchase_date, r_household_assets.purchase_price_minor, r_household_assets.purchase_currency, r_household_assets.warranty_expires_on, r_household_assets.notes, r_household_assets.source, r_household_assets.source_reference, r_household_assets.data_quality, r_household_assets.confidence, r_household_assets.metadata, 1, 'active', p_actor_user_id, p_actor_user_id
      )
      on conflict (id) do nothing
      returning pg_catalog.to_jsonb(household_assets) into after_data;

      else
        select pg_catalog.to_jsonb(row) into before_data
          from public.household_assets row
         where row.id = p_entity_id and row.workspace_id = p_workspace_id
         for update;
        if before_data is not null then
          if (before_data->>'revision')::bigint <> p_expected_revision then
            status := 'conflict';
            message := 'Revision conflict.';
          elsif (p_operation = 'restore' and before_data->>'lifecycle_state' <> 'deleted')
             or (p_operation <> 'restore' and before_data->>'lifecycle_state' not in ('active','archived','superseded')) then
            status := 'rejected';
            message := 'Invalid lifecycle transition.';
          else
            select * into r_household_assets
              from pg_catalog.jsonb_populate_record(null::public.household_assets, before_data || p_fields);
            update public.household_assets
            set name = r_household_assets.name,
                category = r_household_assets.category,
                purchase_date = r_household_assets.purchase_date,
                purchase_price_minor = r_household_assets.purchase_price_minor,
                purchase_currency = r_household_assets.purchase_currency,
                warranty_expires_on = r_household_assets.warranty_expires_on,
                notes = r_household_assets.notes,
                source_reference = r_household_assets.source_reference,
                data_quality = r_household_assets.data_quality,
                confidence = r_household_assets.confidence,
                metadata = r_household_assets.metadata,
                revision = p_expected_revision + 1,
                lifecycle_state = case when p_operation = 'soft_delete' then 'deleted'
                                       when p_operation = 'restore' then 'active'
                                       else (before_data->>'lifecycle_state') end,
                updated_by = p_actor_user_id
            where id = p_entity_id and workspace_id = p_workspace_id
            returning pg_catalog.to_jsonb(household_assets) into after_data;
          end if;
        end if;
      end if;
    else
      if p_operation = 'create' then
        select * into r_asset_service_records
          from pg_catalog.jsonb_populate_record(null::public.asset_service_records, p_fields);
        -- The foreign-key alone is insufficient: the asset must be in this workspace.
        if not exists (
          select 1 from public.household_assets asset
           where asset.id = r_asset_service_records.asset_id
             and asset.workspace_id = p_workspace_id
             and asset.lifecycle_state <> 'deleted'
           for share
        ) then
          status := 'rejected';
          message := 'Referenced asset is not active in this workspace.';
        else
          insert into public.asset_service_records (
            id, workspace_id, asset_id, service_date, cost_minor, cost_currency, provider, notes, source, source_reference, data_quality, confidence, metadata, revision, lifecycle_state, created_by, updated_by
          ) values (
            p_entity_id, p_workspace_id, r_asset_service_records.asset_id, r_asset_service_records.service_date, r_asset_service_records.cost_minor, r_asset_service_records.cost_currency, r_asset_service_records.provider, r_asset_service_records.notes, r_asset_service_records.source, r_asset_service_records.source_reference, r_asset_service_records.data_quality, r_asset_service_records.confidence, r_asset_service_records.metadata, 1, 'active', p_actor_user_id, p_actor_user_id
          )
          on conflict (id) do nothing
          returning pg_catalog.to_jsonb(asset_service_records) into after_data;
        end if;
      else
        select pg_catalog.to_jsonb(row) into before_data
          from public.asset_service_records row
         where row.id = p_entity_id and row.workspace_id = p_workspace_id
         for update;
        if before_data is not null then
          if (before_data->>'revision')::bigint <> p_expected_revision then
            status := 'conflict';
            message := 'Revision conflict.';
          elsif (p_operation = 'restore' and before_data->>'lifecycle_state' <> 'deleted')
             or (p_operation <> 'restore' and before_data->>'lifecycle_state' not in ('active','archived','superseded')) then
            status := 'rejected';
            message := 'Invalid lifecycle transition.';
          else
            select * into r_asset_service_records
              from pg_catalog.jsonb_populate_record(null::public.asset_service_records, before_data || p_fields);
            update public.asset_service_records
            set service_date = r_asset_service_records.service_date,
                cost_minor = r_asset_service_records.cost_minor,
                cost_currency = r_asset_service_records.cost_currency,
                provider = r_asset_service_records.provider,
                notes = r_asset_service_records.notes,
                source_reference = r_asset_service_records.source_reference,
                data_quality = r_asset_service_records.data_quality,
                confidence = r_asset_service_records.confidence,
                metadata = r_asset_service_records.metadata,
                revision = p_expected_revision + 1,
                lifecycle_state = case when p_operation = 'soft_delete' then 'deleted'
                                       when p_operation = 'restore' then 'active'
                                       else (before_data->>'lifecycle_state') end,
                updated_by = p_actor_user_id
            where id = p_entity_id and workspace_id = p_workspace_id
            returning pg_catalog.to_jsonb(asset_service_records) into after_data;
          end if;
        end if;
      end if;
    end if;

    if status = 'applied' and after_data is null then
      if p_operation = 'create' then
        status := 'conflict';
        message := 'Entity ID already exists.';
        -- Only disclose existing records inside the caller's authorized workspace.
        if p_entity_type = 'household_assets' then
          select pg_catalog.to_jsonb(row) into before_data
            from public.household_assets row
           where row.id = p_entity_id and row.workspace_id = p_workspace_id;
        else
          select pg_catalog.to_jsonb(row) into before_data
            from public.asset_service_records row
           where row.id = p_entity_id and row.workspace_id = p_workspace_id;
        end if;
      else
        status := 'rejected';
        message := 'Record does not exist.';
      end if;
    end if;
  end if;

  if status <> 'applied' then
    server_revision := case when before_data is not null
      then (before_data->>'revision')::bigint else null end;
    insert into public.write_conflicts(
      workspace_id, mutation_id, operation, entity_type, entity_id,
      conflict_type, client_revision, client_payload,
      server_revision, server_payload
    ) values (
      p_workspace_id, p_mutation_id, p_operation, p_entity_type, p_entity_id,
      case when status = 'conflict' then 'conflict' else 'rejected' end,
      case when p_expected_revision >= 0 then p_expected_revision else null end,
      p_client_payload, server_revision,
      coalesce(before_data,pg_catalog.jsonb_build_object('message',message))
    );
  end if;

  insert into public.processed_mutations(
    mutation_id, workspace_id, user_id, entity_type, entity_id,
    operation, result_status, result
  ) values (
    p_mutation_id, p_workspace_id, p_actor_user_id, p_entity_type, p_entity_id,
    p_operation, case when status = 'applied' then 'processed' else status end,
    pg_catalog.jsonb_build_object('message',message,'requestFingerprint',p_fingerprint)
  );

  if status = 'applied' then
    insert into public.audit_events(
      workspace_id, actor_user_id, actor_type, action,
      entity_type, entity_id, before_data, after_data, source, correlation_id
    ) values (
      p_workspace_id, p_actor_user_id, 'user', p_entity_type || '.' || p_operation,
      p_entity_type, p_entity_id, before_data, after_data, 'powersync', p_mutation_id
    );
  end if;

  return pg_catalog.jsonb_build_object('status',status,'message',message);
end;
$$;

-- Crucial: Postgres grants function EXECUTE to PUBLIC by default.
revoke all on function public.apply_atomic_mutation(
  uuid,uuid,uuid,text,uuid,text,bigint,text,jsonb,jsonb,text
) from public, anon, authenticated;
grant execute on function public.apply_atomic_mutation(
  uuid,uuid,uuid,text,uuid,text,bigint,text,jsonb,jsonb,text
) to service_role;

comment on function public.apply_atomic_mutation(
  uuid,uuid,uuid,text,uuid,text,bigint,text,jsonb,jsonb,text
) is 'Service-role-only atomic per-mutation application with concurrency lock, workspace recheck, ledger, conflicts, and audit.';
