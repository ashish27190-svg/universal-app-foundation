-- UAF BUILD 0.9 — first reference domain tables.
-- Browser clients receive SELECT-only access; durable writes go through the UAF sync gateway.

create table if not exists public.household_assets (
  id uuid primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  category text not null check (category in ('appliance', 'electronics', 'furniture', 'other')),
  purchase_date date,
  purchase_price_minor bigint check (purchase_price_minor is null or purchase_price_minor >= 0),
  purchase_currency text check (purchase_currency is null or purchase_currency ~ '^[A-Z]{3}$'),
  warranty_expires_on date,
  notes text check (notes is null or char_length(notes) <= 5000),
  revision bigint not null default 1 check (revision >= 1),
  lifecycle_state text not null default 'active' check (lifecycle_state in ('active', 'archived', 'superseded', 'deleted')),
  source text not null default 'manual' check (source in ('manual', 'import', 'integration', 'system', 'calculated', 'ai', 'ai_assisted', 'migration')),
  source_reference text,
  data_quality text not null default 'complete' check (data_quality in ('verified', 'complete', 'incomplete', 'estimated', 'conflicting', 'invalid', 'needs_review')),
  confidence text not null default 'high' check (confidence in ('high', 'medium', 'low', 'unknown')),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  constraint household_asset_purchase_money_pair check (
    (purchase_price_minor is null and purchase_currency is null)
    or (purchase_price_minor is not null and purchase_currency is not null)
  )
);

create index if not exists household_assets_workspace_updated_idx
  on public.household_assets(workspace_id, updated_at desc);
create index if not exists household_assets_workspace_lifecycle_idx
  on public.household_assets(workspace_id, lifecycle_state);
create index if not exists household_assets_workspace_warranty_idx
  on public.household_assets(workspace_id, warranty_expires_on)
  where lifecycle_state = 'active' and warranty_expires_on is not null;

create table if not exists public.asset_service_records (
  id uuid primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  asset_id uuid not null references public.household_assets(id) on delete restrict,
  service_date date not null,
  cost_minor bigint check (cost_minor is null or cost_minor >= 0),
  cost_currency text check (cost_currency is null or cost_currency ~ '^[A-Z]{3}$'),
  provider text check (provider is null or char_length(provider) <= 160),
  notes text check (notes is null or char_length(notes) <= 5000),
  revision bigint not null default 1 check (revision >= 1),
  lifecycle_state text not null default 'active' check (lifecycle_state in ('active', 'archived', 'superseded', 'deleted')),
  source text not null default 'manual' check (source in ('manual', 'import', 'integration', 'system', 'calculated', 'ai', 'ai_assisted', 'migration')),
  source_reference text,
  data_quality text not null default 'complete' check (data_quality in ('verified', 'complete', 'incomplete', 'estimated', 'conflicting', 'invalid', 'needs_review')),
  confidence text not null default 'high' check (confidence in ('high', 'medium', 'low', 'unknown')),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  constraint service_record_cost_money_pair check (
    (cost_minor is null and cost_currency is null)
    or (cost_minor is not null and cost_currency is not null)
  )
);

create index if not exists asset_service_records_workspace_asset_date_idx
  on public.asset_service_records(workspace_id, asset_id, service_date desc);
create index if not exists asset_service_records_workspace_lifecycle_idx
  on public.asset_service_records(workspace_id, lifecycle_state);

create or replace trigger household_assets_set_updated_at
before update on public.household_assets
for each row execute function public.set_updated_at();

create or replace trigger asset_service_records_set_updated_at
before update on public.asset_service_records
for each row execute function public.set_updated_at();

alter table public.household_assets enable row level security;
alter table public.asset_service_records enable row level security;

create policy household_assets_select_member
on public.household_assets
for select
to authenticated
using (public.is_workspace_member(workspace_id));

create policy asset_service_records_select_member
on public.asset_service_records
for select
to authenticated
using (public.is_workspace_member(workspace_id));

revoke all on table public.household_assets from anon, authenticated;
revoke all on table public.asset_service_records from anon, authenticated;
grant select on table public.household_assets to authenticated;
grant select on table public.asset_service_records to authenticated;

comment on table public.household_assets is 'Household Vault reference-domain assets. Durable writes are gateway-controlled; RLS clients are read-only.';
comment on table public.asset_service_records is 'Service history linked to Household Vault assets. Money is stored in integer minor units.';
