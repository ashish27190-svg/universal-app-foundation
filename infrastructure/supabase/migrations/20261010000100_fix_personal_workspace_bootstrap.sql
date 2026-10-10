-- Gate 2 hardening: resolve OUT-param / workspace_id name ambiguity in PL/pgSQL.
-- This is forward-only: avoid rewriting previously applied foundation migrations.
-- SQLSTATE 42702 affected the ON CONFLICT target in ensure_personal_workspace.

create or replace function public.ensure_personal_workspace(requested_name text default 'Personal')
returns table (workspace_id uuid, role text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  resolved_workspace_id uuid;
  safe_name text := nullif(trim(requested_name), '');
begin
  if current_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if safe_name is null then
    safe_name := 'Personal';
  end if;

  if char_length(safe_name) > 120 then
    raise exception 'workspace name is too long' using errcode = '22001';
  end if;

  -- Ensure a profile exists even for auth users created before the profile trigger existed.
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
        -- Concurrent retries converge on the workspace protected by the partial unique index.
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

  insert into public.workspace_memberships (workspace_id, user_id, role, status)
  values (resolved_workspace_id, current_user_id, 'owner', 'active')
  on conflict on constraint workspace_memberships_workspace_id_user_id_key
  do update set
    role = 'owner',
    status = 'active',
    updated_at = now();

  return query select resolved_workspace_id, 'owner'::text;
end;
$$;

comment on function public.ensure_personal_workspace(text) is
  'Idempotent personal workspace bootstrap; qualified unique constraint avoids PL/pgSQL ambiguity.';
