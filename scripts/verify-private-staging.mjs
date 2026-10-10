// Before and after staging deployment, confirm the existing staging URL
// redirects AN UNAUTHENTICATED browser to Cloudflare Access.
// This is a fail-closed network check, not proof that all alternate Cloudflare
// routes or future policy changes are protected. Operator must separately
// confirm Worker-level Access covers every domain and preview.
import { validateStagingEnvironment } from './validate-staging-readiness.mjs';

const errors = validateStagingEnvironment(process.env, 'deploy');
if (errors.length) {
  for (const error of errors) console.error('STAGING PRIVACY GATE: ' + error);
  process.exit(1);
}

const raw = process.env.STAGING_PROTECTED_URL;
if (!raw) {
  console.error('STAGING PRIVACY GATE: STAGING_PROTECTED_URL is required.');
  process.exit(1);
}

let url;
try {
  url = new URL(raw);
  if (url.protocol !== 'https:' || url.port || url.username || url.password ||
      url.pathname !== '/' || url.search || url.hash ||
      !/^uaf-household-vault-staging\\.[a-z0-9-]+\\.workers\\.dev$/.test(url.hostname)) {
    throw new Error('Invalid');
  }
} catch {
  console.error('STAGING PRIVACY GATE: URL must be the staging Worker workers.dev origin.');
  process.exit(1);
}

let response;
try {
  response = await fetch(url, {
    redirect: 'manual',
    headers: { Accept: 'text/html', 'Cache-Control': 'no-cache' },
    signal: AbortSignal.timeout(10000),
  });
} catch {
  console.error('STAGING PRIVACY GATE: Cannot verify private Access; refusing deployment.');
  process.exit(1);
}

const location = response.headers.get('location');
let accessLogin = false;
try {
  if (location) {
    const to = new URL(location, url);
    accessLogin = to.protocol === 'https:' && (
      to.hostname.endsWith('.cloudflareaccess.com') ||
      (to.hostname === url.hostname && to.pathname.startsWith('/cdn-cgi/access/login'))
    );
  }
} catch { /* fail closed */ }

if (![301,302,303,307,308].includes(response.status) || !accessLogin) {
  console.error('STAGING PRIVACY GATE: The public request was not challenged by Cloudflare Access. Refusing deployment.');
  process.exit(1);
}

console.log('PASS: anonymous staging URL redirected to Cloudflare Access. Verify Worker-level policy coverage separately.');
