// Intentional P0 release freeze for *direct package-manager* deploy commands.
// This script does not read credentials, run shell commands or contact cloud
// services. A future guarded deployment requires separate code/security review
// and explicit approval; this helper cannot prevent manually running third-
// party CLIs outside package.json, so credential least privilege also matters.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const EXPECTED = {
  'deploy:staging': 'node scripts/guard-release-scripts.mjs --block-staging',
  'deploy:production': 'node scripts/guard-release-scripts.mjs --block-production',
};

export function checkReleaseScripts(scripts) {
  const problems = [];
  for (const [key, expected] of Object.entries(EXPECTED)) {
    if (scripts?.[key] !== expected) {
      problems.push(key + ' must stay fail-closed until a reviewed release process replaces it.');
    }
  }
  for (const [key, command] of Object.entries(scripts ?? {})) {
    if (/\b(?:wrangler\s+deploy|supabase\s+(?:db\s+push|functions\s+deploy))\b/i.test(String(command))) {
      problems.push('Direct hosted deployment command found in package script: ' + key);
    }
  }
  return problems;
}

function main() {
  if (process.argv.includes('--self-test')) {
    const scripts = JSON.parse(readFileSync('package.json', 'utf8')).scripts;
    const errors = checkReleaseScripts(scripts);
    if (errors.length) throw new Error(errors.join('\n'));
    const bad = {...scripts, 'deploy:production': 'wrangler deploy --env production'};
    if (!checkReleaseScripts(bad).length) throw new Error('Unsafe direct production deploy was not rejected.');
    const badStage = {...scripts, 'deploy:staging': 'pnpm wrangler deploy --env staging'};
    if (!checkReleaseScripts(badStage).length) throw new Error('Unsafe direct staging deploy was not rejected.');
    if (!checkReleaseScripts({...scripts, 'custom:unsafe': 'pnpm supabase db push --linked'}).length) {
      throw new Error('Unsafe alias for database push was not rejected.');
    }
    console.log('PASS: no direct package-script path can deploy staging/production (4 checks).');
    return;
  }
  // A direct CLI call is NEVER an authorization to publish a live Worker or DB.
  console.error('UAF_RELEASE_BLOCKED: Direct staging/production deployment is disabled. ' +
    'Use a separately reviewed, protected GitHub release workflow after explicit approval.');
  process.exitCode = 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try { main(); } catch (error) {
    console.error('UAF_RELEASE_SAFETY_CHECK_FAILED: ' + (error instanceof Error ? error.message : String(error)));
    process.exitCode = 1;
  }
}
