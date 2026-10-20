// Fail closed on unprotected or non-main GitHub staging actions.
// This is defense in depth only. GITHUB_REF_PROTECTED indicates some rule
// applies to the ref; it does NOT attest specific reviewers, bypass settings,
// or the staging environment's policies. Verify those settings independently.
import { fileURLToPath } from 'node:url';

const REPO = 'ashish27190-svg/universal-app-foundation';

export function validateHostedStagingGithubContext(env) {
  const errors = [];
  if (env.GITHUB_REPOSITORY !== REPO) errors.push('Wrong repository.');
  if (env.GITHUB_REF !== 'refs/heads/main') errors.push('Hosted UAF staging action must use main.');
  if (env.GITHUB_REF_PROTECTED !== 'true') errors.push('main needs an active branch protection rule/ruleset.');
  if (env.GITHUB_EVENT_NAME !== 'workflow_dispatch') errors.push('Hosted staging actions must be manually dispatched.');
  return errors;
}

function selfTest() {
  const valid = {
    GITHUB_REPOSITORY: REPO,
    GITHUB_REF: 'refs/heads/main',
    GITHUB_REF_PROTECTED: 'true',
    GITHUB_EVENT_NAME: 'workflow_dispatch',
  };
  const assert = (ok, label) => {
    if (!ok) throw new Error('Hosted staging GitHub context self-test failed: ' + label);
  };
  assert(validateHostedStagingGithubContext(valid).length === 0, 'protected main dispatch accepted');
  for (const ref of ['refs/heads/feature', 'refs/heads/gate2-security-hardening', 'refs/tags/v1', 'refs/pull/5/merge', '']) {
    assert(validateHostedStagingGithubContext({...valid,GITHUB_REF:ref}).length > 0, 'unapproved ref rejected: ' + ref);
  }
  assert(validateHostedStagingGithubContext({...valid,GITHUB_REF_PROTECTED:'false'}).length > 0, 'unprotected main rejected');
  assert(validateHostedStagingGithubContext({...valid,GITHUB_REF_PROTECTED:''}).length > 0, 'missing protection signal rejected');
  assert(validateHostedStagingGithubContext({...valid,GITHUB_REPOSITORY:'attacker/fork'}).length > 0, 'fork rejected');
  assert(validateHostedStagingGithubContext({...valid,GITHUB_EVENT_NAME:'push'}).length > 0, 'push rejected');
  assert(validateHostedStagingGithubContext({...valid,GITHUB_EVENT_NAME:'pull_request'}).length > 0, 'PR event rejected');
  console.log('PASS: hosted staging GitHub context gate (11 synthetic assertions).');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  if (process.argv.includes('--self-test')) selfTest();
  else {
    const errors = validateHostedStagingGithubContext(process.env);
    if (errors.length) {
      for (const error of errors) console.error('STAGING GITHUB GATE: ' + error);
      process.exitCode = 1;
    } else {
      console.log('PASS: approved repo, protected main and manual dispatch. Environment reviewers still need independent verification.');
    }
  }
}
