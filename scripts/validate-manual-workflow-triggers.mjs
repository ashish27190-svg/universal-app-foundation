// Static fail-closed workflow trigger gate. Neither a staging deployment nor
// connected E2E should be started automatically by push, schedule, PR events,
// workflow_run, repository_dispatch, or reusable workflow_call.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export function manualOnlyWorkflowErrors(source) {
  const errors = [];
  const lines = String(source ?? '').replace(/\r\n/g, '\n').split('\n');
  const roots = lines.map((line, i) => (/^on\s*:/.test(line) ? i : -1)).filter(i => i >= 0);
  if (roots.length !== 1) return ['Expected exactly one top-level unquoted on: event mapping.'];
  const onIndex = roots[0];
  if (!/^on:\s*(?:#.*)?$/.test(lines[onIndex])) {
    return ['Inline or malformed on: events are not permitted; use an explicit mapping.'];
  }

  const events = [];
  for (let i = onIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim() || /^\s*#/.test(line)) continue;
    if (/^\S/.test(line)) break; // Next top-level key (jobs/permissions/etc.)
    if (/^\t/.test(line) || /^ {1}\S/.test(line)) {
      errors.push('Malformed workflow event indentation.');
      continue;
    }
    if (line.startsWith('  ') && !line.startsWith('    ')) {
      // YAML also permits quoted event names; never let these evade checks.
      const event = /^ {2}["']?([a-z][a-z0-9_-]*)["']?:\s*(?:.*)$/.exec(line);
      if (event) events.push(event[1]);
      else errors.push('Unrecognized workflow event mapping.');
    }
  }
  if (events.length !== 1 || events[0] !== 'workflow_dispatch') {
    errors.push('Only workflow_dispatch is permitted; observed: ' + (events.join(', ') || 'none'));
  }
  return errors;
}

export function assertManualOnlyWorkflow(source, name) {
  const errors = manualOnlyWorkflowErrors(source);
  if (errors.length) throw new Error(name + ' must be manual-only: ' + errors.join('; '));
}

function selfTest() {
  const safe = [
    'name: Safe',
    'on:',
    '  workflow_dispatch:',
    '    inputs:',
    '      action:',
    '        required: true',
    'jobs:',
    '  verify:',
    '    runs-on: ubuntu-latest',
  ].join('\n');
  const check = (ok, label) => { if (!ok) throw new Error('Manual-only trigger self-test failed: ' + label); };
  check(manualOnlyWorkflowErrors(safe).length === 0, 'manual dispatch accepted');
  for (const trigger of ['push', 'schedule', 'pull_request', 'workflow_run', 'repository_dispatch', 'workflow_call']) {
    check(manualOnlyWorkflowErrors(safe.replace('  workflow_dispatch:', '  workflow_dispatch:\n  ' + trigger + ':')).length > 0,
      'rejects automatic/alternate ' + trigger);
  }
  check(manualOnlyWorkflowErrors('on: [workflow_dispatch, push]\njobs:\n').length > 0, 'inline events rejected');
  check(manualOnlyWorkflowErrors('on: push\njobs:\n').length > 0, 'single inline event rejected');
  check(manualOnlyWorkflowErrors('name: Missing\njobs:\n').length > 0, 'missing events rejected');
  check(manualOnlyWorkflowErrors('on:\n  workflow_dispatch:\non:\n  push:\n').length > 0, 'duplicate roots rejected');
  check(manualOnlyWorkflowErrors(safe.replace('  workflow_dispatch:', '  schedule:')).length > 0, 'scheduled-only rejected');
  check(manualOnlyWorkflowErrors(safe.replace('  workflow_dispatch:', '  workflow_dispatch:\n  "push":')).length > 0, 'quoted push rejected');
  check(manualOnlyWorkflowErrors(safe.replace('  workflow_dispatch:', '  workflow_dispatch:\n  - push')).length > 0, 'event list rejected');
  console.log('PASS: manual-only workflow event gate (14 synthetic assertions).');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  if (process.argv.includes('--self-test')) selfTest();
  else {
    const paths = ['.github/workflows/staging.yml', '.github/workflows/connected-e2e.yml', '.github/workflows/production.yml'];
    for (const path of paths) assertManualOnlyWorkflow(readFileSync(path, 'utf8'), path);
    console.log('PASS: staging, connected E2E and production workflows allow manual dispatch only.');
  }
}
