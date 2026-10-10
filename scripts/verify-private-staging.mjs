// Guard against publishing a UAF staging PWA to an unprotected workers.dev
// origin. This checks an anonymous HTTP redirect only; human review must still
// verify the Cloudflare Worker-level Access policy on EVERY route/domain.
import { fileURLToPath } from 'node:url';
import { validateStagingEnvironment } from './validate-staging-readiness.mjs';

const WORKER_HOST = /^uaf-household-vault-staging\.[a-z0-9-]+\.workers\.dev$/;

export function parseProtectedStagingUrl(raw) {
  if (!raw || typeof raw !== 'string') return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' || url.port || url.username || url.password ||
        url.pathname !== '/' || url.search || url.hash || !WORKER_HOST.test(url.hostname)) return null;
    return url;
  } catch {
    return null;
  }
}

export function isAccessChallenge(url, status, location) {
  if (![301, 302, 303, 307, 308].includes(status) || !location) return false;
  try {
    const next = new URL(location, url);
    if (next.protocol !== 'https:' || next.username || next.password) return false;
    // A Cloudflare Access login challenge may redirect to the team's
    // cloudflareaccess.com login domain or its same-origin access endpoint.
    return (next.hostname.endsWith('.cloudflareaccess.com') && next.hostname !== 'cloudflareaccess.com') ||
      (next.hostname === url.hostname && next.pathname.startsWith('/cdn-cgi/access/login'));
  } catch {
    return false;
  }
}

function selfTest() {
  const valid = 'https://uaf-household-vault-staging.example-account.workers.dev/';
  const u = parseProtectedStagingUrl(valid);
  const assert = (ok, message) => {
    if (!ok) throw new Error('Private staging gate self-test: ' + message);
  };
  assert(Boolean(u), 'expected staging URL accepted');
  assert(!parseProtectedStagingUrl('https://uaf-household-vault-staging.example-account.workers.dev.evil.test/'), 'lookalike origin rejected');
  assert(!parseProtectedStagingUrl('https://uaf-household-vault-staging.example-account.workers.dev/preview'), 'alternate route rejected');
  assert(!parseProtectedStagingUrl('https://uaf-household-vault-staging.example-account.workers.dev/?skip=1'), 'query bypass rejected');
  assert(!parseProtectedStagingUrl('https://my-project.example.workers.dev/'), 'foreign Worker rejected');
  assert(isAccessChallenge(u, 302, 'https://example-account.cloudflareaccess.com/cdn-cgi/access/login?token=synthetic'), 'expected login redirect accepted');
  assert(isAccessChallenge(u, 302, '/cdn-cgi/access/login?redirect_url=synthetic'), 'same-origin Access redirect accepted');
  assert(!isAccessChallenge(u, 200, '/cdn-cgi/access/login'), 'anonymous HTML/200 rejected');
  assert(!isAccessChallenge(u, 302, 'https://cloudflareaccess.com.attacker.invalid/'), 'spoofed Access domain rejected');
  assert(!isAccessChallenge(u, 302, 'https://attacker.invalid/'), 'external open redirect rejected');
  assert(!isAccessChallenge(u, 302, '/'), 'unprotected redirect rejected');
  console.log('PASS: 11 private staging URL and anonymous Access challenge assertions.');
}

async function main() {
  if (process.argv.includes('--self-test')) {
    selfTest();
    return;
  }
  const errors = validateStagingEnvironment(process.env, 'deploy');
  if (errors.length) {
    for (const error of errors) console.error('STAGING PRIVACY GATE: ' + error);
    process.exitCode = 1;
    return;
  }
  const url = parseProtectedStagingUrl(process.env.STAGING_PROTECTED_URL);
  if (!url) {
    console.error('STAGING PRIVACY GATE: STAGING_PROTECTED_URL must be the dedicated HTTPS staging workers.dev root.');
    process.exitCode = 1;
    return;
  }

  let response;
  try {
    response = await fetch(url, {
      redirect: 'manual',
      headers: { Accept: 'text/html', 'Cache-Control': 'no-cache' },
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    console.error('STAGING PRIVACY GATE: Cannot verify anonymous Access challenge; refusing deployment.');
    process.exitCode = 1;
    return;
  }

  if (!isAccessChallenge(url, response.status, response.headers.get('location'))) {
    console.error('STAGING PRIVACY GATE: Anonymous request not challenged by Cloudflare Access; refusing deployment.');
    process.exitCode = 1;
    return;
  }
  console.log('PASS: anonymous staging URL challenged by Cloudflare Access (additional route/policy review required).');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await main();
}
