import { readFile } from 'node:fs/promises';

const url = new URL('../infrastructure/supabase/migrations/20260914000100_foundation_identity_workspace.sql', import.meta.url);
const sql = (await readFile(url, 'utf8')).toLowerCase();
const required = [
  'create table if not exists public.profiles',
  'create table if not exists public.workspaces',
  'create table if not exists public.workspace_memberships',
  'create table if not exists public.processed_mutations',
  'create table if not exists public.write_conflicts',
  'create table if not exists public.audit_events',
  'create or replace function public.ensure_personal_workspace',
  'security definer',
  'set search_path =',
  'enable row level security',
  'workspaces_select_member',
  'workspace_memberships_select_member',
  'revoke all on table public.processed_mutations from anon, authenticated',
];
const missing = required.filter((item) => !sql.includes(item));
if (missing.length) {
  console.error(`Supabase foundation static validation failed:\n- ${missing.join('\n- ')}`);
  process.exit(1);
}
console.log('Supabase foundation static validation: PASS');
