// Disposable LOCAL Supabase only. Never accepts a hosted API URL or logs
// credentials. No pre-existing business database or billing mutation.
import { appendFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const cli = resolve(root, 'node_modules/.bin/supabase');
const status = execFileSync(cli, ['status', '-o', 'env'], {
  cwd: resolve(root, 'infrastructure'),
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe'],
  timeout: 30_000,
});
const values = Object.fromEntries(status.split(/\r?\n/).flatMap((line) => {
  const match = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
  return match ? [[match[1], match[2].replace(/^"(.*)"$/, '$1')]] : [];
}));
const url = new URL(values.API_URL ?? '');
if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1' ||
    url.port !== '54321' || url.pathname !== '/') {
  throw new Error('Gate 3 local-auth test refuses any non-default local Supabase endpoint.');
}
if (!values.ANON_KEY || !values.SERVICE_ROLE_KEY || !process.env.GITHUB_ENV) {
  throw new Error('Local Supabase status/CI environment is missing required synthetic setup values.');
}

const suffix = randomUUID().slice(0, 12);
async function create(label) {
  const email = 'uaf-local-' + suffix + '-' + label + '@example.invalid';
  const password = 'Synthetic-Aa1!' + randomUUID();
  const response = await fetch(new URL('/auth/v1/admin/users', url), {
    method: 'POST',
    headers: {
      apikey: values.SERVICE_ROLE_KEY,
      Authorization: 'Bearer ' + values.SERVICE_ROLE_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password, email_confirm: true }),
    signal: AbortSignal.timeout(15_000),
  });
  if (response.status !== 200) {
    throw new Error('Creating synthetic local user ' + label + ' failed with HTTP ' + response.status);
  }
  const body = await response.json();
  if (!body?.id) throw new Error('Synthetic local user ' + label + ' has no ID.');
  return { email, password, id: body.id };
}
const first = await create('a');
const second = await create('b');
if (first.id === second.id) throw new Error('Synthetic user IDs must be distinct.');
for (const [key, value] of Object.entries({
  VITE_UAF_ENVIRONMENT: 'development',
  VITE_SUPABASE_URL: url.toString().replace(/\/$/, ''),
  VITE_SUPABASE_PUBLISHABLE_KEY: values.ANON_KEY,
  VITE_POWERSYNC_URL: 'http://127.0.0.1:54399',
  E2E_EMAIL: first.email,
  E2E_PASSWORD: first.password,
  E2E_SECOND_EMAIL: second.email,
  E2E_SECOND_PASSWORD: second.password,
  UAF_LOCAL_FIRST_USER_ID: first.id,
  UAF_LOCAL_SECOND_USER_ID: second.id,
})) {
  if (value.includes('\n') || value.includes('\r')) throw new Error('Unsafe synthetic environment value.');
  appendFileSync(process.env.GITHUB_ENV, key + '=' + value + '\n');
}
console.log('PASS: 2 unique synthetic local Supabase Auth accounts created, without contacting hosted services.');
