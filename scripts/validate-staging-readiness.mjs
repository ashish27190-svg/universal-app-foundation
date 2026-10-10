// UAF staging only. Fail closed before linking to, migrating, or deploying a
// hosted database. Never echo secrets. This is NOT a Cloudflare Access proof.
const STAGING_REF = 'vdhfayratdsoexltyrku';

export function validateStagingEnvironment(env, mode = 'e2e') {
  const errors = [];
  const required = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_PUBLISHABLE_KEY',
    'VITE_POWERSYNC_URL',
    'STAGING_SUPABASE_PROJECT_REF',
    ...(mode === 'deploy' ? [
      'SUPABASE_ACCESS_TOKEN',
      'STAGING_SUPABASE_DB_PASSWORD',
      'CLOUDFLARE_API_TOKEN',
      'CLOUDFLARE_ACCOUNT_ID',
      'STAGING_PRIVATE_ACCESS_CONFIRMED',
      'STAGING_ACCESS_TEAM_DOMAIN',
      'STAGING_WORKERS_SUBDOMAIN',
      'STAGING_PROTECTED_URL',
      'STAGING_POWERSYNC_APPROVED_ORIGIN',
    ] : ['E2E_EMAIL', 'E2E_PASSWORD', 'E2E_SECOND_EMAIL', 'E2E_SECOND_PASSWORD']),
  ];
  for (const key of required) if (!env[key] || !String(env[key]).trim()) errors.push('Missing ' + key);

  if (env.STAGING_SUPABASE_PROJECT_REF && env.STAGING_SUPABASE_PROJECT_REF !== STAGING_REF) {
    errors.push('Staging database reference does not match the isolated UAF project.');
  }
  if (env.VITE_SUPABASE_URL) {
    try {
      const url = new URL(env.VITE_SUPABASE_URL);
      if (url.protocol !== 'https:' || url.hostname !== STAGING_REF + '.supabase.co' ||
        url.username || url.password || url.search || url.hash || url.pathname !== '/') {
        errors.push('Supabase URL must point exactly to the approved dedicated UAF staging project.');
      }
    } catch {
      errors.push('Invalid Supabase URL.');
    }
  }
  // Avoid silently bundling a server-side Supabase secret into the public
  // browser app. The older JWT-style anon keys are allowed, but NEVER a JWT
  // carrying the service_role claim.
  const browserKey = env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (browserKey) {
    if (/^sb_secret_/i.test(browserKey) || /^service_role$/i.test(browserKey)) {
      errors.push('Supabase browser key must never be a secret/service-role key.');
    } else if (browserKey.split('.').length === 3) {
      try {
        const raw = browserKey.split('.')[1] ?? '';
        const claims = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
        if (claims.role === 'service_role') {
          errors.push('Supabase browser key must never carry the service_role claim.');
        }
      } catch {
        errors.push('Supabase JWT browser key is malformed.');
      }
    }
  }

  if (env.VITE_POWERSYNC_URL) {
    try {
      const url = new URL(env.VITE_POWERSYNC_URL);
      if (url.protocol !== 'https:' || !url.hostname ||
          url.hostname === 'localhost' || url.hostname.endsWith('.localhost') ||
          ['127.0.0.1', '::1'].includes(url.hostname) || url.username || url.password) {
        errors.push('PowerSync staging URL must be externally reachable over HTTPS.');
      }
    } catch {
      errors.push('Invalid PowerSync URL.');
    }
  }
  if (mode === 'deploy') {
    const subdomain = env.STAGING_WORKERS_SUBDOMAIN?.trim();
    if (subdomain && !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(subdomain)) {
      errors.push('Staging Workers subdomain must be a single valid DNS label.');
    }
    const teamDomain = env.STAGING_ACCESS_TEAM_DOMAIN?.trim();
    if (teamDomain && !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.cloudflareaccess\\.com$/.test(teamDomain)) {
      errors.push('Staging Access team domain must be a cloudflareaccess.com hostname.');
    }
    if (subdomain && env.STAGING_PROTECTED_URL &&
      env.STAGING_PROTECTED_URL !== `https://uaf-household-vault-staging.${subdomain}.workers.dev/`) {
      errors.push('Protected URL does not match the approved staging Workers subdomain.');
    }
    try {
      const approved = new URL(env.STAGING_POWERSYNC_APPROVED_ORIGIN ?? '');
      const actual = new URL(env.VITE_POWERSYNC_URL ?? '');
      if (approved.protocol !== 'https:' ||
          approved.href !== approved.origin + '/' ||
          actual.origin !== approved.origin) {
        errors.push('PowerSync URL does not match its separately approved staging origin.');
      }
    } catch {
      errors.push('Staging PowerSync approved origin is invalid.');
    }
  }
  if (mode === 'deploy' && env.STAGING_PRIVATE_ACCESS_CONFIRMED !== 'PRIVATE_UAF_STAGING_ACCESS_VERIFIED') {
    errors.push('Cloudflare Access must be independently verified before deployment.');
  }
  if (mode === 'e2e' && env.E2E_EMAIL && env.E2E_SECOND_EMAIL &&
      env.E2E_EMAIL.trim().toLowerCase() === env.E2E_SECOND_EMAIL.trim().toLowerCase()) {
    errors.push('Two separate synthetic test accounts are required to prove workspace isolation.');
  }
  if (!['e2e', 'deploy'].includes(mode)) errors.push('Invalid staging validation mode.');
  return errors;
}

function selfTest() {
  const valid = {
    VITE_SUPABASE_URL: 'https://' + STAGING_REF + '.supabase.co',
    VITE_SUPABASE_PUBLISHABLE_KEY: 'synthetic-public-test-key',
    VITE_POWERSYNC_URL: 'https://staging-sync.example.invalid',
    STAGING_SUPABASE_PROJECT_REF: STAGING_REF,
    E2E_EMAIL: 'synthetic@example.invalid',
    E2E_PASSWORD: 'synthetic-test-only',
    E2E_SECOND_EMAIL: 'synthetic-second@example.invalid',
    E2E_SECOND_PASSWORD: 'synthetic-second-test-only',
    SUPABASE_ACCESS_TOKEN: 'synthetic-test-only',
    STAGING_SUPABASE_DB_PASSWORD: 'synthetic-test-only',
    CLOUDFLARE_API_TOKEN: 'synthetic-test-only',
    CLOUDFLARE_ACCOUNT_ID: 'synthetic-test-only',
    STAGING_PRIVATE_ACCESS_CONFIRMED: 'PRIVATE_UAF_STAGING_ACCESS_VERIFIED',
    STAGING_WORKERS_SUBDOMAIN: 'uaf-test-account',
    STAGING_PROTECTED_URL: 'https://uaf-household-vault-staging.uaf-test-account.workers.dev/',
    STAGING_ACCESS_TEAM_DOMAIN: 'uaf-test.cloudflareaccess.com',
    STAGING_POWERSYNC_APPROVED_ORIGIN: 'https://staging-sync.example.invalid/',
  };
  const assert = (condition, message) => {
    if (!condition) throw new Error('Staging validator self-test failed: ' + message);
  };
  assert(validateStagingEnvironment(valid, 'deploy').length === 0, 'valid isolated staging accepted');
  assert(validateStagingEnvironment(valid, 'e2e').length === 0, 'valid E2E accepted');
  assert(validateStagingEnvironment({...valid,STAGING_SUPABASE_PROJECT_REF:'isysgaovvexvsohkhldv'}, 'deploy').length > 0, 'other project rejected');
  assert(validateStagingEnvironment({...valid,VITE_SUPABASE_URL:'https://not-uaf.supabase.co'}, 'e2e').length > 0, 'foreign URL rejected');
  assert(validateStagingEnvironment({...valid,VITE_POWERSYNC_URL:'http://localhost:8080'}, 'e2e').length > 0, 'insecure/loopback PowerSync rejected');
  assert(validateStagingEnvironment({...valid,STAGING_PRIVATE_ACCESS_CONFIRMED:''}, 'deploy').length > 0, 'unconfirmed private Access rejected');
  assert(validateStagingEnvironment({...valid,E2E_EMAIL:''}, 'e2e').length > 0, 'missing E2E user rejected');
  assert(validateStagingEnvironment({...valid,E2E_SECOND_EMAIL:''}, 'e2e').length > 0, 'missing second E2E user rejected');
  assert(validateStagingEnvironment({...valid,E2E_SECOND_EMAIL:valid.E2E_EMAIL}, 'e2e').length > 0, 'identical staging accounts rejected');
  assert(validateStagingEnvironment({...valid,VITE_SUPABASE_PUBLISHABLE_KEY:'sb_secret_fake'}, 'deploy').length > 0, 'secret browser key rejected');
  const serviceRoleJwt = 'eyJhbGciOiJIUzI1NiJ9.' + Buffer.from(JSON.stringify({role:'service_role'})).toString('base64url') + '.synthetic';
  assert(validateStagingEnvironment({...valid,VITE_SUPABASE_PUBLISHABLE_KEY:serviceRoleJwt}, 'deploy').length > 0, 'service-role JWT browser key rejected');
  assert(validateStagingEnvironment({...valid,STAGING_ACCESS_TEAM_DOMAIN:'other.example.com'}, 'deploy').length > 0, 'invalid Access team hostname rejected');
  assert(validateStagingEnvironment({...valid,STAGING_PROTECTED_URL:'https://some-other-worker.example.workers.dev/'}, 'deploy').length > 0, 'mismatched Workers hostname rejected');
  assert(validateStagingEnvironment({...valid,STAGING_POWERSYNC_APPROVED_ORIGIN:'https://other-sync.example.invalid/'}, 'deploy').length > 0, 'unapproved PowerSync origin rejected');
  assert(validateStagingEnvironment({...valid,STAGING_WORKERS_SUBDOMAIN:'wrong.subdomain'}, 'deploy').length > 0, 'malformed workers subdomain rejected');

  console.log('PASS: isolated UAF staging configuration validator (15 synthetic assertions).');
}

const isEntry = process.argv[1] && import.meta.url === new URL('file://' + process.argv[1]).href;
if (isEntry) {
  if (process.argv.includes('--self-test')) selfTest();
  else {
    const mode = process.argv.includes('--deploy') ? 'deploy' : 'e2e';
    const errors = validateStagingEnvironment(process.env, mode);
    if (errors.length) {
      for (const e of errors) console.error('STAGING GATE: ' + e);
      process.exitCode = 1;
    } else {
      console.log('PASS: staging environment identity and required values. Cloudflare Access remains a separate release gate.');
    }
  }
}
