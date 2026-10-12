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


// Workspace owners may rename/archive, never rewrite creator/type/audit
// metadata. Deny writer RPC on an archived workspace even with active member.
const workspaceLockdown = fs.readFileSync(
  path.join(root, 'infrastructure/supabase/migrations/20261011000100_workspace_writer_least_privilege.sql'),
  'utf8');
for (const token of [
  "workspace.status = 'active'",
  'revoke update on table public.workspaces from authenticated;',
  'grant update (name, status) on table public.workspaces to authenticated;',
]) {
  if (!workspaceLockdown.includes(token)) {
    violations.push('Missing workspace least-privilege migration invariant: ' + token);
  }
}

// A bootstrap RPC is a one-time membership initializer, NEVER an authorization
// reset. Login retries must not silently reverse suspension or role downgrades.
const bootstrapLockdown = fs.readFileSync(
  path.join(root, 'infrastructure/supabase/migrations/20261012000100_prevent_personal_membership_reactivation.sql'),
  'utf8');
for (const token of [
  'do nothing;',
  'for share;',
  "recorded_role is distinct from 'owner'",
  "recorded_status is distinct from 'active'",
  "using errcode = '42501'",
]) {
  if (!bootstrapLockdown.includes(token)) {
    violations.push('Missing fail-closed personal workspace bootstrap authorization: ' + token);
  }
}
for (const assertion of [
  'Suspended personal owner cannot reactivate via bootstrap',
  'Downgraded personal owner cannot regain owner via bootstrap',
  'Removed personal owner cannot reactivate via bootstrap',
]) {
  const tests = fs.readFileSync(
    path.join(root, 'infrastructure/supabase/tests/database/gate2_rls_test.sql'), 'utf8');
  if (!tests.includes(assertion)) {
    violations.push('Missing bootstrap privilege-regression test: ' + assertion);
  }
}

// RLS row restrictions cannot prevent authenticated users from forging
// profile audit fields when table-wide UPDATE is granted. Restrict to name.
const profileLockdown = fs.readFileSync(
  path.join(root, 'infrastructure/supabase/migrations/20261012000200_profiles_display_name_only.sql'),
  'utf8');
for (const required of [
  'revoke update on table public.profiles from authenticated;',
  'grant update (display_name) on table public.profiles to authenticated;',
]) {
  if (!profileLockdown.includes(required)) {
    violations.push('Missing profile least-privilege grant: ' + required);
  }
}
const securityTap = fs.readFileSync(
  path.join(root, 'infrastructure/supabase/tests/database/gate2_rls_test.sql'),
  'utf8');
for (const test of [
  'Profile creation time cannot be changed by signed-in client',
  'Profile audit time cannot be changed by signed-in client',
  'Other user profile remains unchanged after unauthorized update',
]) {
  if (!securityTap.includes(test)) violations.push('Missing profile security regression: ' + test);
}

const functionsConfig = fs.readFileSync(path.join(root, 'infrastructure/supabase/config.toml'), 'utf8');
// Server-side conflict resolutions must keep the authoritative workspace
// state and actor role stable until the atomic SQL transaction completes.
for (const migration of [
  '20261010000200_atomic_keep_server_conflict.sql',
  '20261010000400_atomic_reapply_conflict.sql',
]) {
  const sql = fs.readFileSync(path.join(root, 'infrastructure/supabase/migrations', migration), 'utf8');
  for (const required of [
    'workspace.status = \'active\'',
    'membership.status = \'active\'',
    'for share of membership, workspace',
    'if authorized is distinct from true then',
  ]) {
    if (!sql.includes(required)) violations.push(migration + ' lacks transaction-held writer authorization: ' + required);
  }
  if (!/membership\.role\s+in\s*\(\s*'owner'\s*,\s*'admin'\s*\)/i.test(sql)) {
    violations.push(migration + ' lacks owner/admin writer authorization.');
  }
}
const pgtap = fs.readFileSync(
  path.join(root, 'infrastructure/supabase/tests/database/gate2_rls_test.sql'), 'utf8');
for (const regression of [
  'Archived workspace denies conflict reapply',
  'Viewer cannot replay conflicts after owner role revoked',
  'Archived workspace blocks keep-server resolution',
]) {
  if (!pgtap.includes(regression)) violations.push('Missing local pgTAP conflict authorization coverage: ' + regression);
}

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
const tabLease = fs.readFileSync(
  path.join(root, 'apps/reference-app/src/sync/local-vault-tab-lease.ts'),
  'utf8',
);
for (const token of ['navigator.locks.request', "ifAvailable: true", "mode: 'exclusive'",
                     'LocalVaultBusyError']) {
  if (!tabLease.includes(token)) violations.push('Cross-tab SQLite lock missing: ' + token);
}
for (const token of ['localVaultTabLease.acquire()', 'releaseTab: async () => {}',
                     'getSession()', 'localVaultOwnership.attach(userId)']) {
  if (!persistence.includes(token)) violations.push('Browser identity/lock wiring missing: ' + token);
}
// @powersync/web starts opening its SQLite adapter in its constructor,
// which is invoked at module-import time. The exclusive browser lease MUST
// therefore be held before import('./App') loads sync/persistence.
const bootstrapMain = fs.readFileSync(
  path.join(root, 'apps/reference-app/src/main.tsx'),
  'utf8',
);
const leaseIndex = bootstrapMain.indexOf('await localVaultTabLease.acquire()');
const appImportIndex = bootstrapMain.indexOf("import('./App')");
if (leaseIndex < 0 || appImportIndex < 0 || leaseIndex >= appImportIndex ||
    bootstrapMain.includes("import { App } from './App'") ||
    bootstrapMain.includes('localVaultTabLease.release()')) {
  violations.push('Web Lock must be obtained before the eager PowerSync constructor and held for the full page lifetime.');
}
if (!tabLease.includes('export const localVaultTabLease = new LocalVaultTabLease()') ||
    !persistence.includes('releaseTab: async () => {}')) {
  violations.push('Persistent SQLite owner must share bootstrap lease and not release it on auth loss.');
}
if (!app.includes('if (previousUserId !== null)') ||
    !app.includes('generation !== bootstrapGeneration.current')) {
  violations.push('Any resumed auth identity must halt prior sync and cancel stale bootstraps.');
}
if (!fs.existsSync(path.join(root, 'apps/reference-app/src/sync/local-vault-tab-lease.test.ts'))) {
  violations.push('Cross-tab Web Locks must have explicit regression tests.');
}
if (!fs.existsSync(path.join(root, 'apps/reference-app/src/sync/local-vault-ownership.test.ts'))) {
  violations.push('Local offline account isolation must have regression tests.');
}

for (const token of [
  'reconnectSameOwner(userId)',
  'const stillCurrent = await uafServices.auth.getSession()',
  "throw new Error('Authentication changed during offline sync reconnection.')",
]) {
  if (!persistence.includes(token)) {
    violations.push('Offline reconnection identity recheck missing: ' + token);
  }
}
// Offline-to-online is itself a permission boundary. The editor must be
// unmounted before any server revalidation begins, including a normal session
// that lost connectivity without reloading the PWA.
for (const token of [
  'suspendReferenceAppRemoteSyncWhileOffline',
  'offlineVerification = { userId: currentUserId, generation }',
  'workspace: null, loading: true, error: null',
  'await resumeReferenceAppSyncAfterReconnect()',
  'workspace: verified, loading: false, error: null',
]) {
  if (!app.includes(token)) {
    violations.push('Offline-to-online editing freeze or sync suspension missing: ' + token);
  }
}
for (const token of ['suspendRemoteWhileOffline', 'reconnectSameOwner(userId)']) {
  if (!localOwnerGate.includes(token) && !persistence.includes(token)) {
    violations.push('Offline stream permission gate missing: ' + token);
  }
}
// An initial ONLINE bootstrap must verify the server's membership before
// invoking the PowerSync uploader. Reconnect must preserve the precise
// previously-confirmed personal workspace, even when Supabase could return a
// different workspace for the same user.
const onlineBootstrap = app.split('// Online: verify the server')[1]?.split('}\n        if (!disposed')[0] ?? '';
if (!onlineBootstrap.includes('workspace = await uafServices.workspaces.ensurePersonalWorkspace()') ||
    !onlineBootstrap.includes('await connectReferenceAppSync(userId!)') ||
    onlineBootstrap.indexOf('ensurePersonalWorkspace()') > onlineBootstrap.indexOf('connectReferenceAppSync(userId!)')) {
  violations.push('Online workspace membership must be verified before connecting PowerSync.');
}
const reconnectCode = app.split('// Once online again, a locally cached membership')[1] ?? '';
if (!reconnectCode.includes('assertConfirmedWorkspaceContinuity(window.localStorage, current, verified)') ||
    reconnectCode.indexOf('assertConfirmedWorkspaceContinuity(') > reconnectCode.indexOf('await resumeReferenceAppSyncAfterReconnect()')) {
  violations.push('Reconnection must verify exact previous workspace before uploading cached mutations.');
}
if (!app.includes('setTimeout(() =>') || !app.includes('authTimers.add(handle)') ||
    !app.includes('clearTimeout(handle)') ||
    app.includes('onAuthStateChange((session) => { void applySession(session)')) {
  violations.push('Supabase auth event must defer API work until its callback has returned.');
}
// Offline startup cannot depend on an online workspace RPC when browser
// connectivity is unavailable. The fallback must be bound to the confirmed
// personal workspace, current user and an unexpired auth session, and must
// undergo server revalidation on reconnect.
const offlineWorkspace = fs.readFileSync(
  path.join(root, 'apps/reference-app/src/offline-workspace.ts'),
  'utf8',
);
for (const token of [
  'LOCAL_VAULT_OWNER_KEY',
  "value.membership.role === 'owner'",
  "value.workspace.type === 'personal'",
  'session.expiresAt * 1000 <= now + 30_000',
  'MAX_OFFLINE_AGE_MS',
  'session.accessToken',
]) {
  if (!offlineWorkspace.includes(token)) {
    violations.push('Offline workspace fallback missing fail-closed condition: ' + token);
  }
}
for (const token of [
  'await connectReferenceAppSync(userId!)',
  'readConfirmedPersonalWorkspace(window.localStorage, session)',
  'saveConfirmedPersonalWorkspace(window.localStorage, session, workspace)',
  'clearConfirmedPersonalWorkspace(window.localStorage)',
  'Could not reverify this workspace after reconnecting',
]) {
  if (!app.includes(token)) violations.push('Reference app offline/reconnect gate missing: ' + token);
}
if (!fs.existsSync(path.join(root, 'apps/reference-app/src/offline-workspace.test.ts'))) {
  violations.push('Offline workspace fallback must retain session/owner regression tests.');
}

if (violations.length) {
  console.error('Security invariant validation failed:\n' + violations.map((item) => `- ${item}`).join('\n'));
  process.exit(1);
}
console.log('Security invariant validation: PASS');
