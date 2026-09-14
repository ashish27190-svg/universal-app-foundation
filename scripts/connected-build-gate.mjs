import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const REQUIRED_NODE_MAJOR = 24;
const PINNED_PNPM = '10.15.1';
const withE2E = process.argv.includes('--with-e2e');

function run(command, args, options = {}) {
  console.log(`\n> ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, { stdio: 'inherit', shell: process.platform === 'win32', ...options });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const nodeMajor = Number(process.versions.node.split('.')[0]);
if (nodeMajor !== REQUIRED_NODE_MAJOR) {
  console.error(`Connected build gate requires Node ${REQUIRED_NODE_MAJOR}.x; current runtime is ${process.versions.node}.`);
  process.exit(2);
}

run('corepack', ['enable']);
run('corepack', ['prepare', `pnpm@${PINNED_PNPM}`, '--activate']);

if (!existsSync('pnpm-lock.yaml')) {
  console.log('\nNo pnpm-lock.yaml exists yet. Creating the first lockfile from the pinned manifests.');
  run('pnpm', ['install']);
} else {
  run('pnpm', ['install', '--frozen-lockfile']);
}

const validations = [
  'validate:structure',
  'validate:core-boundary',
  'validate:config-boundary',
  'validate:auth-boundary',
  'validate:data-boundary',
  'validate:sync-boundary',
  'validate:ui-boundary',
  'validate:household-domain-boundary',
  'validate:supabase-foundation',
  'validate:household-supabase',
  'validate:security',
  'validate:conflict-resolution',
  'validate:pwa-release',
  'validate:monitoring',
];
for (const script of validations) run('pnpm', [script]);

run('pnpm', ['lint']);
run('pnpm', ['typecheck']);
run('pnpm', ['test']);
run('pnpm', ['build']);

if (withE2E) {
  const required = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY', 'VITE_POWERSYNC_URL', 'E2E_EMAIL', 'E2E_PASSWORD'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) {
    console.error(`Cannot run connected E2E. Missing: ${missing.join(', ')}`);
    process.exit(3);
  }
  run('pnpm', ['--filter', '@uaf/reference-app', 'exec', 'playwright', 'install', '--with-deps', 'chromium']);
  run('pnpm', ['--filter', '@uaf/reference-app', 'test:e2e']);
}

console.log('\nConnected build gate: PASS');
