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

if (violations.length) {
  console.error('Security invariant validation failed:\n' + violations.map((item) => `- ${item}`).join('\n'));
  process.exit(1);
}
console.log('Security invariant validation: PASS');
