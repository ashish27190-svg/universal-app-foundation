// Human-reviewed staging deployment must run the EXACT candidate commit
// inspected during the separate, protected migration-plan dispatch.
// The migration SQL digest is independently checked; this SHA adds application,
// Edge Function, workflow and static asset source binding. Neither value alone
// proves a human review, remote migration history, or private Cloudflare Access.
import { fileURLToPath } from 'node:url';

export function reviewedCandidateMatches(actual, reviewed) {
  return /^[a-f0-9]{40}$/.test(actual ?? '') &&
    /^[a-f0-9]{40}$/.test(reviewed ?? '') &&
    actual === reviewed;
}

function selfTest() {
  const sha = 'a'.repeat(40);
  const different = 'b'.repeat(40);
  const assert = (okay, message) => {
    if (!okay) throw new Error('Staging candidate review self-test failed: ' + message);
  };
  assert(reviewedCandidateMatches(sha, sha), 'exact reviewed commit accepted');
  assert(!reviewedCandidateMatches(sha, different), 'changed candidate rejected');
  assert(!reviewedCandidateMatches(sha, ''), 'missing reviewed candidate rejected');
  assert(!reviewedCandidateMatches('', sha), 'missing action commit rejected');
  assert(!reviewedCandidateMatches(sha, sha.toUpperCase()), 'uppercase reviewed digest rejected');
  assert(!reviewedCandidateMatches(sha, sha + 'a'), 'longer reviewed digest rejected');
  assert(!reviewedCandidateMatches(sha, sha.slice(1)), 'shorter reviewed digest rejected');
  assert(!reviewedCandidateMatches(sha, 'g'.repeat(40)), 'nonhex reviewed digest rejected');
  assert(!reviewedCandidateMatches('g'.repeat(40), 'g'.repeat(40)), 'nonhex action commit rejected');
  assert(!reviewedCandidateMatches(sha, sha + '\n'), 'whitespace-tainted digest rejected');
  console.log('PASS: exact staging candidate commit review (10 synthetic assertions).');
}

function main() {
  const action = process.argv.includes('--self-test') ? 'self-test' :
    process.argv.includes('--print') ? 'print' :
    process.argv.includes('--verify') ? 'verify' : 'unknown';
  if (action === 'self-test') {
    selfTest();
    return;
  }
  const actual = process.env.GITHUB_SHA ?? '';
  if (!/^[a-f0-9]{40}$/.test(actual)) {
    throw new Error('STAGING CANDIDATE GATE: GitHub checked-out commit SHA missing/invalid.');
  }
  if (action === 'print') {
    console.log('UAF_REVIEWED_CANDIDATE_SHA=' + actual);
    console.log('Review this exact candidate with the independent migration SQL digest and remote plan.');
  } else if (action === 'verify') {
    if (!reviewedCandidateMatches(actual, process.env.REVIEWED_CANDIDATE_SHA)) {
      throw new Error('STAGING CANDIDATE GATE: Deployment commit differs from reviewed plan commit. Refusing deployment.');
    }
    console.log('PASS: candidate commit equals the separately reviewed plan SHA.');
  } else {
    throw new Error('Usage: --self-test, --print or --verify');
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try { main(); }
  catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
