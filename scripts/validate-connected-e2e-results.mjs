// Gate 3 connected browser test evidence. Aggregate results are checked
// locally inside CI; never print account credentials or upload test traces.
// A green Playwright exit code is insufficient if critical tests were skipped.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const REQUIRED = [
  'edit, soft-delete and restore remain reversible',
  'a record created on device A converges onto device B',
  'stale offline edit is surfaced instead of silently overwriting the server',
  'an offline asset survives browser reload and converges after reconnect',
  'offline edits without a reload cannot resume upload before membership is reverified',
  'two users see their own synchronized assets, never the other user assets',
  'switching identities in the same browser never exposes the previous local vault',
  'a second tab cannot mount persistent SQLite until the first tab closes',
  'online bootstrap holds SQLite lease before verifying workspace or starting sync',
];

export function inspectConnectedE2EResults(report) {
  const errors = [];
  const stats = report?.stats;
  if (!stats || typeof stats !== 'object') {
    return ['Playwright JSON results are missing or malformed.'];
  }
  for (const status of ['expected', 'skipped', 'unexpected', 'flaky']) {
    if (!Number.isSafeInteger(stats[status]) || stats[status] < 0) {
      errors.push('Missing/invalid Playwright count: ' + status);
    }
  }
  if (stats.unexpected !== 0) errors.push('Connected tests contain unexpected failures.');
  if (stats.flaky !== 0) errors.push('Connected tests contain flaky/retried passes.');
  if (stats.skipped !== 0) errors.push('Connected tests contain skipped scenarios.');
  if (typeof stats.expected !== 'number' || stats.expected < REQUIRED.length) {
    errors.push('Insufficient completed connected browser scenarios.');
  }

  const specs = new Map();
  function collect(suite) {
    if (!suite || typeof suite !== 'object') return;
    for (const spec of suite.specs ?? []) {
      if (spec && typeof spec.title === 'string') {
        specs.set(spec.title, [...(specs.get(spec.title) ?? []), ...(spec.tests ?? [])]);
      }
    }
    for (const nested of suite.suites ?? []) collect(nested);
  }
  for (const suite of report.suites ?? []) collect(suite);

  for (const title of REQUIRED) {
    const tests = specs.get(title) ?? [];
    if (tests.length !== 1) {
      errors.push('Required connected scenario missing or duplicated: ' + title);
    } else if (
      tests[0].expectedStatus !== 'passed' ||
      !Array.isArray(tests[0].results) ||
      tests[0].results.length !== 1 ||
      tests[0].results[0]?.status !== 'passed'
    ) {
      errors.push('Required scenario did not complete cleanly on first attempt: ' + title);
    }
  }
  return errors;
}

function selfTest() {
  const pass = {
    stats: { expected: REQUIRED.length, unexpected: 0, flaky: 0, skipped: 0 },
    suites: [{
      specs: REQUIRED.map((title) => ({
        title,
        tests: [{ expectedStatus: 'passed', results: [{ status: 'passed' }] }],
      })),
    }],
  };
  const check = (ok, msg) => { if (!ok) throw new Error('E2E evidence self-test failed: ' + msg); };
  check(inspectConnectedE2EResults(pass).length === 0, 'nine required passed cases');
  check(inspectConnectedE2EResults({ ...pass, stats: { ...pass.stats, skipped: 1 } }).length > 0, 'skips rejected');
  check(inspectConnectedE2EResults({ ...pass, stats: { ...pass.stats, flaky: 1 } }).length > 0, 'flaky tests rejected');
  check(inspectConnectedE2EResults({ ...pass, stats: { ...pass.stats, unexpected: 1 } }).length > 0, 'failure rejected');
  check(inspectConnectedE2EResults({ ...pass, suites: [] }).length > 0, 'zero executed cases rejected');
  check(inspectConnectedE2EResults({
    ...pass,
    suites: [{ specs: pass.suites[0].specs.slice(1) }],
  }).length > 0, 'missing critical scenario rejected');
  check(inspectConnectedE2EResults({
    ...pass,
    suites: [{ specs: pass.suites[0].specs.map((s, i) => i === 0 ? {
      ...s, tests: [{ expectedStatus: 'passed', results: [{ status: 'failed' }, { status: 'passed' }] }],
    } : s) }],
  }).length > 0, 'test that passed only after retry rejected');
  check(inspectConnectedE2EResults(null).length > 0, 'missing report rejected');
  console.log('PASS: Gate 3 browser-evidence verifier (8 synthetic assertions; no hosted claims).');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  if (process.argv.includes('--self-test')) selfTest();
  else {
    const file = process.env.UAF_E2E_JSON_REPORT || '/tmp/uaf-connected-e2e-report.json';
    try {
      const report = JSON.parse(readFileSync(file, 'utf8'));
      const errors = inspectConnectedE2EResults(report);
      if (errors.length) {
        for (const error of errors) console.error('CONNECTED E2E GATE: ' + error);
        process.exitCode = 1;
      } else {
        console.log('PASS: 9 required connected browser scenarios passed without skips or retries.');
        console.log('This localhost-preview result does NOT verify the protected Cloudflare Worker.');
      }
    } catch {
      console.error('CONNECTED E2E GATE: JSON report missing/unreadable; no hosted result is claimed.');
      process.exitCode = 1;
    }
  }
}
