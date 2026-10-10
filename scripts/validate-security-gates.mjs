import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const clientRoots = [
  path.join(root, 'apps'),
  path.join(root, 'packages'),
  path.join(root, 'domains'),
];
const forbidden = [
  /service[_-]?role/i,
  /SUPABASE_SERVICE_ROLE/i,
  /POWER[Ss]YNC_REPLICATION/i,
];
const allowedServerFragments = ['/infrastructure/'];
const violations = [];

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'dist' || entry.name === 'node_modules') continue;
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (/\.(?:ts|tsx|js|mjs|json|env|example)$/.test(entry.name)) {
      const relative = `/${path.relative(root, file).replaceAll('\\', '/')}`;
      if (allowedServerFragments.some((fragment) => relative.includes(fragment))) continue;
      const text = fs.readFileSync(file, 'utf8');
      for (const rule of forbidden) {
        if (rule.test(text)) violations.push(`${relative}: matches forbidden client-secret pattern ${rule}`);
      }
    }
  }
}

for (const dir of clientRoots) walk(dir);

const migrations = fs.readdirSync(path.join(root, 'infrastructure/supabase/migrations'))
  .filter((name) => name.endsWith('.sql'))
  .map((name) => fs.readFileSync(path.join(root, 'infrastructure/supabase/migrations', name), 'utf8'))
  .join('\n');

for (const table of ['workspaces', 'workspace_memberships', 'write_conflicts', 'audit_events', 'household_assets', 'asset_service_records']) {
  if (!new RegExp(`alter\\s+table\\s+public\\.${table}\\s+enable\\s+row\\s+level\\s+security`, 'i').test(migrations)) {
    violations.push(`RLS enable statement missing for public.${table}`);
  }
}

if (!/revoke\s+all\s+on\s+table\s+public\.processed_mutations\s+from\s+anon,\s*authenticated/i.test(migrations)) {
  violations.push('processed_mutations is not explicitly revoked from normal clients');
}


const functionsConfig = fs.readFileSync(path.join(root, 'infrastructure/supabase/config.toml'), 'utf8');
for (const functionName of ['sync-apply', 'resolve-conflict']) {
  const escaped = functionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`\\[functions\\.${escaped}\\]\\s*verify_jwt\\s*=\\s*true`, 'i');
  if (!pattern.test(functionsConfig)) violations.push(`${functionName} must keep Supabase platform JWT verification enabled`);
}

// Static regression checks complement (but do not replace) connected role tests.
const syncGateway = fs.readFileSync(
  path.join(root, 'infrastructure/supabase/functions/sync-apply/index.ts'),
  'utf8',
);
const conflictResolver = fs.readFileSync(
  path.join(root, 'infrastructure/supabase/functions/resolve-conflict/index.ts'),
  'utf8',
);
for (const [name, source] of [['sync-apply', syncGateway], ['resolve-conflict', conflictResolver]]) {
  if (!/\.rpc\(['"]can_write_workspace['"]/.test(source)) {
    violations.push(`${name} must verify writer permission before admin-backed mutations`);
  }
}
if (/if\s*\(!workspace\)\s*\{\s*await\s+recordIssue/.test(syncGateway)) {
  violations.push('sync-apply must not log unauthorized mutations into another workspace');
}

// A persistent browser SQLite file is shared across sessions unless its
// account identity is checked before mounting. Require the fail-closed owner
// gate to stay wired to both login and logout paths.
const localOwnerGate = fs.readFileSync(
  path.join(root, 'apps/reference-app/src/sync/local-vault-ownership.ts'),
  'utf8',
);
const persistence = fs.readFileSync(
  path.join(root, 'apps/reference-app/src/sync/persistence.ts'),
  'utf8',
);
const app = fs.readFileSync(
  path.join(root, 'apps/reference-app/src/App.tsx'),
  'utf8',
);
for (const token of ['readOwner', 'writeOwner', 'pendingCount', 'clearDatabase',
                     'authLost', 'LocalVaultOwnershipConflictError']) {
  if (!localOwnerGate.includes(token)) violations.push('Missing local account isolation guard: ' + token);
}
for (const token of ['LOCAL_VAULT_OWNER_KEY', 'localVaultOwnership.attach(userId)',
                     'localVaultOwnership.logout()', 'localVaultOwnership.authLost()']) {
  if (!persistence.includes(token)) violations.push('PowerSync account handoff is not enforced: ' + token);
}
if (!app.includes('connectReferenceAppSync(userId!)') ||
    !app.includes('pauseReferenceAppSyncForAuthChange')) {
  violations.push('The reference app must bind the PowerSync cache to its authenticated user.');
}
if (!fs.existsSync(path.join(root, 'apps/reference-app/src/sync/local-vault-ownership.test.ts'))) {
  violations.push('Local offline account isolation must have regression tests.');
}

if (violations.length) {
  console.error('Security invariant validation failed:\n' + violations.map((item) => `- ${item}`).join('\n'));
  process.exit(1);
}
console.log('Security invariant validation: PASS');
