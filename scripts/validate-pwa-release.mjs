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
const connectedE2E = readFileSync('.github/workflows/connected-e2e.yml', 'utf8');
const legacyShutdown = staging.includes('name: Deploy Staging (Guarded Workflow Pending)');
if (legacyShutdown) {
  // Protective interim main-branch configuration: no API credentials, no
  // database migrations, no scheduled jobs and no deployment commands.
  for (const [name, workflow] of [['staging', staging], ['connected E2E', connectedE2E]]) {
    if (!workflow.includes('workflow_dispatch:') ||
        !workflow.includes('exit 1') ||
        workflow.includes('branches: [main]') ||
        /^\s*(?:push|schedule):\s*$/m.test(workflow) ||
        /^\s*environment:\s*staging\s*$/m.test(workflow) ||
        /\bsecrets\./.test(workflow) ||
        /\b(?:supabase|wrangler)\s+(?:db|functions|deploy)/.test(workflow)) {
      throw new Error(`Temporary ${name} workflow must remain no-op and fail closed.`);
    }
  }
} else {
  for (const token of ['environment: staging', 'supabase db push', 'resolve-conflict', '--env staging']) {
    if (!staging.includes(token)) throw new Error(`Staging workflow missing invariant: ${token}`);
  }
}


console.log('PWA/release invariant validation: PASS');
