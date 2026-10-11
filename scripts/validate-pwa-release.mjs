import { readFileSync, existsSync } from 'node:fs';
import { assertManualOnlyWorkflow } from './validate-manual-workflow-triggers.mjs';

const vite = readFileSync('apps/reference-app/vite.config.ts', 'utf8');
for (const token of ["registerType: 'prompt'", 'runtimeCaching: []', 'skipWaiting: false', 'clientsClaim: false']) {
  if (!vite.includes(token)) throw new Error(`PWA config missing safety invariant: ${token}`);
}
if (!existsSync('apps/reference-app/src/components/PwaUpdatePrompt.tsx')) {
  throw new Error('PWA update prompt is missing.');
}

const wrangler = readFileSync('apps/reference-app/wrangler.jsonc', 'utf8');
if (!wrangler.includes('single-page-application')) throw new Error('Cloudflare SPA fallback is missing.');
if (!wrangler.includes('"directory": "./dist"')) throw new Error('Cloudflare static asset directory is missing.');

const ci = readFileSync('.github/workflows/ci.yml', 'utf8');
for (const token of ['node-version: 24', 'pnpm-lock.yaml is required', 'pnpm install --frozen-lockfile']) {
  if (!ci.includes(token)) throw new Error(`CI is missing release invariant: ${token}`);
}

const production = readFileSync('.github/workflows/production.yml', 'utf8');
if (!production.includes('workflow_dispatch:')) throw new Error('Production deployment must be explicitly dispatched.');
assertManualOnlyWorkflow(production, 'Production');
if (!production.includes('PRODUCTION_RELEASE_BLOCKED') ||
    !production.includes('no_production_deployment:') ||
    !/^\s*exit 1\s*$/m.test(production) ||
    /\bsecrets\./.test(production) ||
    /\b(?:pnpm|npx)\s+(?:supabase|wrangler)\b/.test(production) ||
    /\b(?:curl|wget)\s/.test(production)) {
  throw new Error('Production release must stay fail-closed: no secrets, linked DB writes or Worker deploy.');
}
if (!production.includes('environment: production')) throw new Error('Production must use a protected GitHub environment.');

const staging = readFileSync('.github/workflows/staging.yml', 'utf8');
for (const token of [
  'workflow_dispatch:', 'preflight_only', 'environment: staging',
  'supabase --workdir infrastructure link',
  'supabase --workdir infrastructure db push --linked --dry-run',
  'supabase --workdir infrastructure db push --linked',
  'resolve-conflict', '--env staging',
  'node scripts/verify-private-staging.mjs',
]) {
  if (!staging.includes(token)) throw new Error(`Staging workflow missing invariant: ${token}`);
}

// A hosted dry-run is a read-only planning step. Applying migrations must
// require a separate dispatch with an exact human-reviewed file-set digest,
// in addition to the GitHub environment approval and Access verification.
const migrationPlan = staging.split('\n  migration_plan:')[1]?.split('\n  deploy:')[0] ?? '';
const migrationDeploy = staging.split('\n  deploy:')[1] ?? '';
for (const token of [
  'plan_migrations', 'reviewed_migrations_sha256', 'reviewed_candidate_sha',
  'node scripts/validate-staging-readiness.mjs --plan',
  'node scripts/validate-staging-migration-approval.mjs --print',
  'supabase --workdir infrastructure db push --linked --dry-run',
]) {
  if (!staging.includes(token)) throw new Error('Staging migration planning guard missing: ' + token);
}
if (!migrationPlan.includes('environment: staging') ||
    !migrationPlan.includes("inputs.action == 'plan_migrations'") ||
    !migrationPlan.includes('db push --linked --dry-run') ||
    /^\s*run: .*db push --linked\s*$/m.test(migrationPlan)) {
  throw new Error('Migration planning must be protected and read-only.');
}
// The reviewed SQL-file digest must be accompanied by the SAME reviewed
// complete source candidate. Reject an unreviewed PWA/Edge/workflow change.
if (!migrationPlan.includes('node scripts/validate-staging-candidate-approval.mjs --print') ||
    !migrationDeploy.includes('REVIEWED_CANDIDATE_SHA: ${{ inputs.reviewed_candidate_sha }}') ||
    !migrationDeploy.includes('node scripts/validate-staging-candidate-approval.mjs --verify') ||
    migrationDeploy.indexOf('Refuse deployment of an unreviewed candidate commit') < 0 ||
    migrationDeploy.indexOf('Refuse deployment of an unreviewed candidate commit') >
      migrationDeploy.indexOf('Require independently reviewed exact migration file-set')) {
  throw new Error('Staging deploy must pin reviewed source commit BEFORE all remote operations.');
}
for (const [name, source] of [['CI', ci], ['staging', staging]]) {
  if (!source.includes('node scripts/validate-staging-candidate-approval.mjs --self-test')) {
    throw new Error(name + ' must test exact candidate SHA rejection.');
  }
}
if (!existsSync('scripts/validate-staging-candidate-approval.mjs')) {
  throw new Error('Staging candidate-commit approval verifier is missing.');
}

if ((migrationDeploy.match(/run: node scripts\/validate-staging-migration-approval\.mjs --verify/g) ?? []).length !== 2 ||
    !migrationDeploy.includes('REVIEWED_MIGRATIONS_SHA256: ${{ inputs.reviewed_migrations_sha256 }}') ||
    migrationDeploy.indexOf('Require independently reviewed exact migration file-set') < 0 ||
    migrationDeploy.indexOf('Refuse changed migrations before approved database write') < 0 ||
    migrationDeploy.indexOf('Refuse changed migrations before approved database write') >
      migrationDeploy.indexOf('Apply reviewed staging migrations')) {
  throw new Error('Migration apply must be bound to the exact approved digest before remote writes.');
}
for (const [name, source] of [['CI', ci], ['staging', staging]]) {
  if (!source.includes('node scripts/validate-staging-migration-approval.mjs --self-test')) {
    throw new Error(name + ' must test migration review digest rejection.');
  }
}
if (!ci.includes('node scripts/validate-manual-workflow-triggers.mjs --self-test') ||
    !ci.includes('node scripts/validate-manual-workflow-triggers.mjs')) {
  throw new Error('CI must fail closed on automatic staging/E2E/production workflow triggers.');
}
if (!existsSync('scripts/validate-staging-migration-approval.mjs')) {
  throw new Error('Staging migration file-set approval verifier is missing.');
}

assertManualOnlyWorkflow(staging, 'Staging');
if (staging.split(String.fromCharCode(10)).filter(line => line.trim() === 'run: node scripts/verify-private-staging.mjs').length !== 2) {
  throw new Error('Staging deploy requires anonymous Access verification both before and after publishing.');
}
if (!wrangler.includes('"preview_urls": false')) {
  throw new Error('Staging preview URLs must remain disabled until fully guarded.');
}
const connectedE2E = readFileSync('.github/workflows/connected-e2e.yml', 'utf8');
for (const token of [
  'environment: staging',
  'STAGING_SUPABASE_PROJECT_REF',
  'node scripts/validate-staging-readiness.mjs --e2e',
  'E2E_SECOND_EMAIL', 'E2E_SECOND_PASSWORD',
]) {
  if (!connectedE2E.includes(token)) throw new Error(`Connected E2E missing guard: ${token}`);
}
assertManualOnlyWorkflow(connectedE2E, 'Connected E2E');

for (const token of [
  'PLAYWRIGHT_JSON_OUTPUT_FILE',
  'test:e2e --reporter=dot,json',
  'node scripts/validate-connected-e2e-results.mjs',
  'if: always()',
  'These tests execute in an ephemeral localhost Vite preview',
]) {
  if (!connectedE2E.includes(token)) throw new Error(`Connected E2E report gate missing: ${token}`);
}
for (const [name, source] of [['CI', ci], ['staging', staging]]) {
  if (!source.includes('node scripts/validate-connected-e2e-results.mjs --self-test')) {
    throw new Error(`${name} must exercise skipped/flaky connected E2E report rejection.`);
  }
}

if (!existsSync('apps/reference-app/tests/e2e/tenant-isolation.spec.ts') ||
    !existsSync('apps/reference-app/tests/e2e/offline-restart.spec.ts') ||
    !existsSync('apps/reference-app/tests/e2e/workspace-startup.spec.ts')) {
  throw new Error('Staging E2E must include distinct-user isolation and offline-restart journeys.');
}

console.log('PWA/release invariant validation: PASS');
