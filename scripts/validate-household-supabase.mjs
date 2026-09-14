import fs from 'node:fs';

const migration = fs.readFileSync('infrastructure/supabase/migrations/20260914000200_household_assets.sql', 'utf8');
const handlerRegistry = fs.readFileSync('infrastructure/supabase/functions/_shared/handlers.ts', 'utf8');
const syncSchema = fs.readFileSync('packages/sync/src/schema.ts', 'utf8');
const syncConfig = fs.readFileSync('infrastructure/powersync/sync-config.yaml', 'utf8');

const requiredMigration = [
  'create table if not exists public.household_assets',
  'create table if not exists public.asset_service_records',
  'alter table public.household_assets enable row level security',
  'alter table public.asset_service_records enable row level security',
  'grant select on table public.household_assets to authenticated',
  'grant select on table public.asset_service_records to authenticated',
];
for (const token of requiredMigration) if (!migration.includes(token)) throw new Error(`Household migration invariant missing: ${token}`);
if (/grant\s+(insert|update|delete).*household_assets/i.test(migration)) throw new Error('Household assets must not grant direct client DML.');
if (/grant\s+(insert|update|delete).*asset_service_records/i.test(migration)) throw new Error('Service records must not grant direct client DML.');
for (const table of ['household_assets', 'asset_service_records']) {
  if (!handlerRegistry.includes(`${table}:`)) throw new Error(`Mutation handler not registered for ${table}.`);
  if (!syncSchema.includes(`${table}:`)) throw new Error(`PowerSync schema missing ${table}.`);
  if (!syncConfig.includes(`FROM ${table}`)) throw new Error(`Sync stream missing ${table}.`);
}
const metadataCount = (syncSchema.match(/trackMetadata:\s*true/g) ?? []).length;
if (metadataCount < 3) throw new Error('Writable PowerSync tables must enable metadata tracking.');
console.log('Household Supabase/PowerSync static validation: PASS');
