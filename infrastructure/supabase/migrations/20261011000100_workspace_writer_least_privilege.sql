-- Gate 2: client-facing workspace writers must not change tenant identity
-- or audit metadata. This is additive: previous migrations remain immutable.
-- Keep archived workspaces readable to current members, but NOT writable.
create or replace function public.can_write_workspace(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.workspace_memberships membership
      join public.workspaces workspace on workspace.id = membership.workspace_id
     where membership.workspace_id = target_workspace_id
       and membership.user_id = auth.uid()
       and membership.status = 'active'
       and membership.role in ('owner','admin')
       and workspace.status = 'active'
  );
$$;

-- The legacy foundation granted table-wide UPDATE to authenticated users.
-- RLS limits rows, not columns; a writer could modify created_by, workspace_type
-- and other immutable tenant identity fields. Scope updates to display name
-- and archive state; the updated_at trigger is retained.
revoke update on table public.workspaces from authenticated;
grant update (name, status) on table public.workspaces to authenticated;

comment on function public.can_write_workspace(uuid) is
  'Authenticated active owner/admin of an active workspace only; denies archived workspace writes.';
