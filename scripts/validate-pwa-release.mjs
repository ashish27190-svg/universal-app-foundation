import { readFileSync, existsSync } from 'node:fs';

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
if (/\npush:\s*(\n|$)/.test(production)) throw new Error('Production deployment must not trigger directly from push.');
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

if (/\\npush:\\s*(\\n|$)/.test(staging)) {
  throw new Error('Private staging deployment must never trigger automatically on push.');
}
if (staging.split('node scripts/verify-private-staging.mjs').length !== 3) {
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
if (/\\nschedule:\\s*(\\n|$)/.test(connectedE2E)) {
  throw new Error('Connected E2E should remain manual while staging is paused.');
}

if (!existsSync('apps/reference-app/tests/e2e/tenant-isolation.spec.ts') ||
    !existsSync('apps/reference-app/tests/e2e/offline-restart.spec.ts')) {
  throw new Error('Staging E2E must include distinct-user isolation and offline-restart journeys.');
}

console.log('PWA/release invariant validation: PASS');
