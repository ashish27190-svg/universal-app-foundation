import { readFileSync } from 'node:fs';

const monitoring = readFileSync('apps/reference-app/src/monitoring.tsx', 'utf8');
const environment = readFileSync('packages/config/src/environment.ts', 'utf8');
const pkg = JSON.parse(readFileSync('apps/reference-app/package.json', 'utf8'));

if (pkg.dependencies?.['@sentry/react'] !== '10.74.0') throw new Error('Sentry React dependency must be explicitly pinned for BUILD 0.20.');
if (!environment.includes('VITE_SENTRY_DSN')) throw new Error('Optional Sentry DSN is missing from validated runtime configuration.');
for (const token of ['sendDefaultPii: false', 'tracesSampleRate: 0']) {
  if (!monitoring.includes(token)) throw new Error(`Monitoring privacy invariant missing: ${token}`);
}
for (const forbidden of ['replayIntegration(', 'browserTracingIntegration(', 'setUser(']) {
  if (monitoring.includes(forbidden)) throw new Error(`Phase-1 monitoring must not enable ${forbidden}`);
}
if (!monitoring.includes('if (!environment.VITE_SENTRY_DSN) return;')) {
  throw new Error('Monitoring must remain optional and no-op without a DSN.');
}
console.log('Monitoring privacy/integration validation: PASS');
