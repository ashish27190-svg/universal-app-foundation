-- LOCAL CI/WSL ONLY: PowerSync's named logical replication publication.
-- Deliberately NOT a Supabase migration: needs hosted-review approval before
-- production/staging replication is configured. Run only inside Docker's
-- disposable supabase_db_uaf-household-vault-local instance.
-- Publish six bounded reference-app tables, not auth.users or all tables.
CREATE PUBLICATION powersync FOR TABLE
  public.workspaces,
  public.workspace_memberships,
  public.household_assets,
  public.asset_service_records,
  public.write_conflicts,
  public.audit_events
WITH (publish = 'insert, update, delete, truncate');

DO $$
DECLARE
  table_count integer;
BEGIN
  SELECT count(*) INTO table_count
    FROM pg_catalog.pg_publication_tables
   WHERE pubname = 'powersync';
  IF table_count <> 6 OR NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_publication
     WHERE pubname = 'powersync' AND NOT puballtables
  ) THEN
    RAISE EXCEPTION 'local PowerSync publication must include exactly six named tables';
  END IF;
END;
$$;
