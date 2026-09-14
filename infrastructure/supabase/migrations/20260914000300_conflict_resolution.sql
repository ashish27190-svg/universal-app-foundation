-- UAF BUILD 0.13 — enrich conflict records so users can safely resolve/reapply them.

alter table public.write_conflicts
  add column if not exists mutation_id uuid,
  add column if not exists operation text;

alter table public.write_conflicts
  drop constraint if exists write_conflicts_operation_valid;

alter table public.write_conflicts
  add constraint write_conflicts_operation_valid
  check (operation is null or operation in ('create', 'update', 'soft_delete', 'restore'));

create unique index if not exists write_conflicts_mutation_id_idx
  on public.write_conflicts(mutation_id)
  where mutation_id is not null;

create index if not exists write_conflicts_workspace_unresolved_idx
  on public.write_conflicts(workspace_id, created_at desc)
  where resolved_at is null;

comment on column public.write_conflicts.mutation_id is 'Originating UAF mutation UUID when conflict came from the sync gateway.';
comment on column public.write_conflicts.operation is 'Original logical UAF operation required for reviewed reapplication.';
