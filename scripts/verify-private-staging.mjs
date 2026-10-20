// Anonymous safety gate for the single approved UAF staging Worker.
// This is not a substitute for reviewing the Worker-level Cloudflare Access
// policy, its bypass rules, and every alternate route/custom domain.
import { fileURLToPath } from 'node:url';
import { validateStagingEnvironment } from './validate-staging-readiness.mjs';

const WORKER_NAME = 'uaf-household-vault-staging';
const PROBE_PATHS = ['/', '/manifest.webmanifest', '/icon.svg', '/_uaf-private-probe/anonymous'];

export function parseProtectedStagingUrl(raw, workersSubdomain) {
  if (!raw || !workersSubdomain ||
      !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(workersSubdomain)) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' || url.port || url.username || url.password ||
        url.pathname !== '/' || url.search || url.hash ||
        url.hostname !== `${WORKER_NAME}.${workersSubdomain}.workers.dev`) return null;
    return url;
  } catch {
    return null;
  }
}

export function isAccessChallenge(url, status, location, approvedTeamDomain) {
  if (![301, 302, 303, 307, 308].includes(status) || !location ||
      !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.cloudflareaccess\.com$/.test(approvedTeamDomain ?? '')) {
    return false;
  }
  try {
    const to = new URL(location, url);
    if (to.protocol !== 'https:' || to.username || to.password) return false;
    const accessHost = to.hostname === approvedTeamDomain &&
      to.pathname.startsWith('/cdn-cgi/access/');
    const sameOriginAccess = to.origin === url.origin &&
      to.pathname.startsWith('/cdn-cgi/access/login');
    return accessHost || sameOriginAccess;
  } catch {
    return false;
  }
}

function selfTest() {
  const approvedSubdomain = 'test-account';
  const teamDomain = 'test-account.cloudflareaccess.com';
  const source = `https://${WORKER_NAME}.${approvedSubdomain}.workers.dev/`;
  const u = parseProtectedStagingUrl(source, approvedSubdomain);
  const assert = (ok, message) => {
    if (!ok) throw new Error('Private staging safety check failed: ' + message);
  };
  assert(Boolean(u), 'exact approved staging Worker URL');
  assert(!parseProtectedStagingUrl(source, 'other-account'), 'different account not allowed');
  assert(!parseProtectedStagingUrl(source + 'open'), 'path bypass rejected');
  assert(!parseProtectedStagingUrl(source + '?skip=1', approvedSubdomain), 'query bypass rejected');
  assert(!parseProtectedStagingUrl(source + 'open', approvedSubdomain), 'alternate route rejected');
  assert(!parseProtectedStagingUrl('https://some-other-worker.'+approvedSubdomain+'.workers.dev/', approvedSubdomain),'different Worker rejected');
  assert(!parseProtectedStagingUrl(source.replace('workers.dev/', 'workers.dev.evil.test/'), approvedSubdomain),'suffix spoofing rejected');
  assert(isAccessChallenge(u,302,'https://test-account.cloudflareaccess.com/cdn-cgi/access/login?token=synthetic',teamDomain),'approved team login accepted');
  assert(isAccessChallenge(u,302,'/cdn-cgi/access/login?redirect_url=synthetic',teamDomain),'same-origin login accepted');
  assert(!isAccessChallenge(u,200,'/cdn-cgi/access/login',teamDomain),'unprotected HTTP 200 denied');
  assert(!isAccessChallenge(u,403,'/cdn-cgi/access/login',teamDomain),'unverified 403 is not marked success');
  assert(!isAccessChallenge(u,302,'https://other-team.cloudflareaccess.com/cdn-cgi/access/login',teamDomain),'unrelated Access tenant rejected');
  assert(!isAccessChallenge(u,302,'https://test-account.cloudflareaccess.com.evil.test/cdn-cgi/access/login',teamDomain),'spoofed team domain rejected');
  assert(!isAccessChallenge(u,302,'https://attacker.invalid/',teamDomain),'external host rejected');
  assert(!isAccessChallenge(u,302,'https://test-account.cloudflareaccess.com/',teamDomain),'non-login redirect rejected');
  assert(!isAccessChallenge(u,302,'/',teamDomain),'ordinary site redirect rejected');
  assert(!isAccessChallenge(u,302,'/cdn-cgi/access/login',null),'missing approved tenant rejected');
  assert(PROBE_PATHS.includes('/manifest.webmanifest') && PROBE_PATHS.includes('/icon.svg'),'static assets included in private probe');
  console.log('PASS: 18 exact-origin, login-host and anonymous-path privacy assertions.');
}

async function verifyAnonymousProtection(env) {
  const errors = validateStagingEnvironment(env,'deploy');
  if (errors.length) {
    for (const error of errors) console.error('STAGING PRIVACY GATE: '+error);
    return false;
  }
  const url = parseProtectedStagingUrl(env.STAGING_PROTECTED_URL,env.STAGING_WORKERS_SUBDOMAIN);
  if (!url) {
    console.error('STAGING PRIVACY GATE: URL does not match the approved staging Worker and account.');
    return false;
  }
  for (const path of PROBE_PATHS) {
    let response;
    try {
      response = await fetch(new URL(path,url),{
        redirect:'manual',
        headers:{Accept:'text/html', 'Cache-Control':'no-cache'},
        signal:AbortSignal.timeout(10000),
      });
    } catch {
      console.error('STAGING PRIVACY GATE: Anonymous route could not be verified: '+path);
      return false;
    }
    if (!isAccessChallenge(url,response.status,response.headers.get('location'),env.STAGING_ACCESS_TEAM_DOMAIN)) {
      console.error('STAGING PRIVACY GATE: Anonymous request was not redirected to approved Access: '+path);
      return false;
    }
  }
  console.log('PASS: four anonymous staging routes challenged by the approved Cloudflare Access team.');
  return true;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  if (process.argv.includes('--self-test')) selfTest();
  else if (!await verifyAnonymousProtection(process.env)) process.exitCode = 1;
}
