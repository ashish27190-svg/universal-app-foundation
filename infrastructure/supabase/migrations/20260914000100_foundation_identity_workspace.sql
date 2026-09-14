-- UAF BUILD 0.4 — identity, workspace and shared server infrastructure foundation.
-- Durable business rows are scoped by workspace_id. Device-local sync state is intentionally absent.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 120),
  workspace_type text not null check (workspace_type in ('personal', 'family', 'team', 'business', 'organization')),
  created_by uuid not null references auth.users(id) on delete restrict,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One active personal workspace per creator. The bootstrap function below is idempotent.
create unique index if not exists workspaces_one_active_personal_per_creator_idx
  on public.workspaces(created_by)
  where workspace_type = 'personal' and status = 'active';

create table if not exists public.workspace_memberships (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'member', 'viewer')),
  status text not null default 'active' check (status in ('active', 'invited', 'suspended', 'removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create index if not exists workspace_memberships_user_idx
  on public.workspace_memberships(user_id, status);

create table if not exists public.processed_mutations (
  mutation_id uuid primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  entity_type text not null,
  entity_id uuid not null,
  operation text not null check (operation in ('create', 'update', 'soft_delete', 'restore')),
  result_status text not null check (result_status in ('processed', 'rejected', 'conflict')),
  result jsonb not null default '{}'::jsonb,
  processed_at timestamptz not null default now()
);

create index if not exists processed_mutations_workspace_processed_idx
  on public.processed_mutations(workspace_id, processed_at desc);

create table if not exists public.write_conflicts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  conflict_type text not null,
  client_revision bigint,
  server_revision bigint,
  client_payload jsonb not null default '{}'::jsonb,
  server_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolution text,
  constraint write_conflicts_revision_nonnegative check (
    (client_revision is null or client_revision >= 0)
    and (server_revision is null or server_revision >= 0)
  )
);

create index if not exists write_conflicts_workspace_created_idx
  on public.write_conflicts(workspace_id, created_at desc);
create index if not exists write_conflicts_entity_idx
  on public.write_conflicts(entity_type, entity_id);

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_type text not null check (actor_type in ('user', 'system', 'agent', 'integration')),
  action text not null,
  entity_type text,
  entity_id uuid,
  before_data jsonb,
  after_data jsonb,
  source text not null default 'app',
  correlation_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists audit_events_workspace_created_idx
  on public.audit_events(workspace_id, created_at desc);
create index if not exists audit_events_entity_idx
  on public.audit_events(entity_type, entity_id, created_at desc);

-- Shared updated_at trigger.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create or replace trigger workspaces_set_updated_at
before update on public.workspaces
for each row execute function public.set_updated_at();

create or replace trigger workspace_memberships_set_updated_at
before update on public.workspace_memberships
for each row execute function public.set_updated_at();

-- Auth user -> public profile. Keep this tiny and failure-resistant because auth triggers run during signup.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    nullif(coalesce(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'full_name', ''), '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- RLS helper functions use SECURITY DEFINER to avoid recursive membership-policy evaluation.
create or replace function public.is_workspace_member(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workspace_memberships membership
    where membership.workspace_id = target_workspace_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
  );
$$;

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
    where membership.workspace_id = target_workspace_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role in ('owner', 'admin')
  );
$$;

-- Atomically returns or creates the signed-in user's one active personal workspace.
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
  on conflict (workspace_id, user_id)
  do update set
    role = 'owner',
    status = 'active',
    updated_at = now();

  return query select resolved_workspace_id, 'owner'::text;
end;
$$;

-- Explicit execution surface for authenticated clients only.
revoke all on function public.is_workspace_member(uuid) from public;
revoke all on function public.can_write_workspace(uuid) from public;
revoke all on function public.ensure_personal_workspace(text) from public;
grant execute on function public.is_workspace_member(uuid) to authenticated;
grant execute on function public.can_write_workspace(uuid) to authenticated;
grant execute on function public.ensure_personal_workspace(text) to authenticated;

-- RLS is enabled on every client-visible/shared table. Server-only tables receive no authenticated policies.
alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_memberships enable row level security;
alter table public.processed_mutations enable row level security;
alter table public.write_conflicts enable row level security;
alter table public.audit_events enable row level security;

create policy profiles_select_self
on public.profiles
for select
to authenticated
using (id = auth.uid());

create policy profiles_update_self
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy workspaces_select_member
on public.workspaces
for select
to authenticated
using (public.is_workspace_member(id));

create policy workspaces_update_writer
on public.workspaces
for update
to authenticated
using (public.can_write_workspace(id))
with check (public.can_write_workspace(id));

create policy workspace_memberships_select_member
on public.workspace_memberships
for select
to authenticated
using (public.is_workspace_member(workspace_id));

create policy write_conflicts_select_member
on public.write_conflicts
for select
to authenticated
using (public.is_workspace_member(workspace_id));

create policy audit_events_select_member
on public.audit_events
for select
to authenticated
using (public.is_workspace_member(workspace_id));

-- Explicit SQL grants complement RLS. Infrastructure tables stay inaccessible to normal clients.
revoke all on table public.profiles from anon, authenticated;
revoke all on table public.workspaces from anon, authenticated;
revoke all on table public.workspace_memberships from anon, authenticated;
revoke all on table public.processed_mutations from anon, authenticated;
revoke all on table public.write_conflicts from anon, authenticated;
revoke all on table public.audit_events from anon, authenticated;

grant select, update on table public.profiles to authenticated;
grant select, update on table public.workspaces to authenticated;
grant select on table public.workspace_memberships to authenticated;
grant select on table public.write_conflicts to authenticated;
grant select on table public.audit_events to authenticated;

comment on table public.processed_mutations is 'Server-owned idempotency ledger. No normal client policies.';
comment on table public.write_conflicts is 'Server-created optimistic-concurrency conflicts; authenticated workspace members may read them.';
comment on function public.ensure_personal_workspace(text) is 'Idempotently creates or returns the signed-in user personal workspace and owner membership.';
