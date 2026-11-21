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
  'prepareAtomicAssetFields',
  'request.reviewedRevision',
  "rpc('reapply_conflict_transaction'",
  "rpc('keep_server_conflict_transaction'",
  ".from('write_conflicts')",
]) {
  if (!resolver.includes(token)) throw new Error(`Conflict resolver missing invariant: ${token}`);
}
if (/\.from\(['"]household_assets['"]\)\.update/.test(resolver)) {
  throw new Error('Conflict resolver must use transaction RPCs, not direct entity writes.');
}

const atomicMigration = readFileSync('infrastructure/supabase/migrations/20261010000400_atomic_reapply_conflict.sql', 'utf8');
for (const token of [
  'for update',
  'p_reviewed_server_revision',
  'public.apply_atomic_mutation(',
  "resolution = 'reapply_client'",
  'revoke all on function public.reapply_conflict_transaction',
]) {
  if (!atomicMigration.includes(token)) throw new Error(`Atomic reapply migration missing invariant: ${token}`);
}

const client = readFileSync(requiredFiles[2], 'utf8');
for (const token of ['LocalWriteConflictRepository', 'HttpConflictResolver', 'keep_server', 'reapply_client', 'reviewedRevision']) {
  if (!client.includes(token)) throw new Error(`Client conflict layer missing invariant: ${token}`);
}

const ui = readFileSync(requiredFiles[3], 'utf8');
if (!ui.includes('Needs attention')) throw new Error('Conflict review must be visible to the user.');
if (!ui.includes('Keep server version') ||
    !ui.includes('Review reapplication') ||
    !ui.includes('Confirm reapply my version') ||
    !ui.includes('matchesReviewedSnapshot') ||
    !ui.includes('fieldsToReview')) {
  throw new Error('Conflict UI must require a current, field-by-field review before reapplication.');
}
const review = readFileSync('apps/reference-app/src/components/conflict-review.ts', 'utf8');
for (const token of ['canReviewAndReapply', 'snapshotForReview', 'matchesReviewedSnapshot',
                     'serverPayloadJson', 'clientPayloadJson', 'fieldsToReview']) {
  if (!review.includes(token)) throw new Error(`Conflict review requires ${token}.`);
}
if (!existsSync('apps/reference-app/src/components/conflict-review.test.ts')) {
  throw new Error('Conflict review regression tests are required.');
}

console.log('Conflict-resolution invariant validation: PASS');
