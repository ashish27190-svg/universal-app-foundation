-- Gate 2: authenticated users may edit only their own display name.
-- The initial foundation granted UPDATE across the entire profiles row,
-- including identity and timestamps. RLS filters rows, not columns.
-- Preserve profiles_update_self RLS and the server updated_at trigger.
-- This forward migration does not modify hosted databases by itself.
revoke update on table public.profiles from authenticated;
grant update (display_name) on table public.profiles to authenticated;

comment on column public.profiles.display_name is
  'Only browser-editable profile field; identity and audit times remain server-controlled.';
