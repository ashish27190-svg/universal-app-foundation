-- Gate 2: a signed-in user must not regain workspace privileges merely
-- by re-running personal-workspace bootstrap. An existing suspended,
-- removed or downgraded owner membership requires independent remediation.
-- Forward-only migration; previous foundation migrations remain immutable.
create or replace function public.ensure_personal_workspace(requested_name text default 'Personal')
returns table (workspace_id uuid, role text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  resolved_workspace_id uuid;
  safe_name text := nullif(pg_catalog.btrim(requested_name), '');
  recorded_role text;
  recorded_status text;
begin
  if current_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if safe_name is null then
    safe_name := 'Personal';
  end if;

  if pg_catalog.char_length(safe_name) > 120 then
    raise exception 'workspace name is too long' using errcode = '22001';
  end if;

  insert into public.profiles (id)
  values (current_user_id)
  on conflict (id) do nothing;

  select workspace.id
    into resolved_workspace_id
    from public.workspaces workspace
   where workspace.created_by = current_user_id
     and workspace.workspace_type = 'personal'
     and workspace.status = 'active'
   order by workspace.created_at
   limit 1;

  if resolved_workspace_id is null then
    begin
      insert into public.workspaces (name, workspace_type, created_by)
      values (safe_name, 'personal', current_user_id)
      returning id into resolved_workspace_id;
    exception
      when unique_violation then
        select workspace.id
          into resolved_workspace_id
          from public.workspaces workspace
         where workspace.created_by = current_user_id
           and workspace.workspace_type = 'personal'
           and workspace.status = 'active'
         order by workspace.created_at
         limit 1;
    end;
  end if;

  if resolved_workspace_id is null then
    raise exception 'unable to resolve personal workspace';
  end if;

  -- Only insert membership if missing, which is normal for a freshly
  -- created personal workspace. Never upgrade an existing role or
  -- reactivate a suspended/removed owner via login or an RPC retry.
  insert into public.workspace_memberships (workspace_id, user_id, role, status)
  values (resolved_workspace_id, current_user_id, 'owner', 'active')
  on conflict on constraint workspace_memberships_workspace_id_user_id_key
  do nothing;

  -- Retain the membership row lock until the onboarding transaction ends,
  -- so concurrent revocation cannot commit between verification and return.
  select membership.role, membership.status
    into recorded_role, recorded_status
    from public.workspace_memberships membership
   where membership.workspace_id = resolved_workspace_id
     and membership.user_id = current_user_id
   for share;

  if recorded_role is distinct from 'owner'
     or recorded_status is distinct from 'active' then
    raise exception 'personal workspace membership requires administrator review'
      using errcode = '42501';
  end if;

  return query select resolved_workspace_id, 'owner'::text;
end;
$$;

comment on function public.ensure_personal_workspace(text) is
  'Idempotent personal bootstrap; never restores suspended/removed or downgraded existing memberships.';
