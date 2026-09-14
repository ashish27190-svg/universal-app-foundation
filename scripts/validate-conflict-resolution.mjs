import { readFileSync, existsSync } from 'node:fs';

const requiredFiles = [
  'infrastructure/supabase/migrations/20260914000300_conflict_resolution.sql',
  'infrastructure/supabase/functions/resolve-conflict/index.ts',
  'packages/sync/src/conflicts.ts',
  'apps/reference-app/src/components/VaultApp.tsx',
];
for (const file of requiredFiles) {
  if (!existsSync(file)) throw new Error(`Missing conflict-resolution file: ${file}`);
}

const migration = readFileSync(requiredFiles[0], 'utf8');
for (const token of ['mutation_id uuid', 'operation text', 'write_conflicts_mutation_id_idx', "'soft_delete'", "'restore'"]) {
  if (!migration.includes(token)) throw new Error(`Conflict migration missing invariant: ${token}`);
}

const resolver = readFileSync(requiredFiles[1], 'utf8');
for (const token of [
  "'keep_server'",
  "'reapply_client'",
  "mutationHandlers[conflict.entity_type]",
  'expectedRevision: conflict.server_revision',
  ".from('write_conflicts')",
  ".from('audit_events')",
]) {
  if (!resolver.includes(token)) throw new Error(`Conflict resolver missing invariant: ${token}`);
}
if (/\.from\(['\"]household_assets['\"]\)\.update/.test(resolver)) {
  throw new Error('Conflict resolver must reuse domain handlers rather than blind-write household assets.');
}

const client = readFileSync(requiredFiles[2], 'utf8');
for (const token of ['LocalWriteConflictRepository', 'HttpConflictResolver', 'keep_server', 'reapply_client']) {
  if (!client.includes(token)) throw new Error(`Client conflict layer missing invariant: ${token}`);
}

const ui = readFileSync(requiredFiles[3], 'utf8');
if (!ui.includes('Needs attention')) throw new Error('Conflict review must be visible to the user.');
if (!ui.includes('Keep server version') || !ui.includes('Reapply my version')) {
  throw new Error('Conflict UI must expose both safe Phase-1 choices when applicable.');
}

console.log('Conflict-resolution invariant validation: PASS');
