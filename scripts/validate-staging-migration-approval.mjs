// A reviewed staging migration set is bound to exact filenames and bytes.
// This is a change-control check, NOT a replacement for a human review of
// the remote Supabase --dry-run, the approved project, or GitHub reviewers.
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const DIR = 'infrastructure/supabase/migrations';

export function migrationSha256(entries) {
  if (!entries.length) throw new Error('No UAF migrations found; refuse deployment.');
  const names = new Set();
  const hash = createHash('sha256');
  for (const entry of [...entries].sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
    if (!/^\d{14}_[a-z0-9_-]+\.sql$/.test(entry.name) || names.has(entry.name)) {
      throw new Error('Invalid/duplicated UAF migration filename.');
    }
    names.add(entry.name);
    const bytes = Buffer.isBuffer(entry.content) ? entry.content : Buffer.from(entry.content, 'utf8');
    hash.update(entry.name, 'utf8');
    hash.update(Buffer.from([0]));
    hash.update(String(bytes.length));
    hash.update(Buffer.from([0]));
    hash.update(bytes);
    hash.update(Buffer.from([0]));
  }
  return hash.digest('hex');
}

export function approvedMigrationSetMatches(actualDigest, approvedDigest) {
  return /^[a-f0-9]{64}$/.test(approvedDigest ?? '') && approvedDigest === actualDigest;
}

function currentDigest() {
  const entries = readdirSync(DIR)
    .filter((name) => name.endsWith('.sql'))
    .map((name) => ({ name, content: readFileSync(`${DIR}/${name}`) }));
  return migrationSha256(entries);
}

function selfTest() {
  const a = { name: '20261011000000_first.sql', content: 'select 1;\n' };
  const b = { name: '20261011000001_second.sql', content: 'select 2;\n' };
  const digest = migrationSha256([a,b]);
  const assert = (okay, message) => { if (!okay) throw new Error('Migration approval gate self-test: ' + message); };
  assert(migrationSha256([b,a]) === digest, 'deterministic ordering');
  assert(migrationSha256([a,{...b,content:'select 3;\n'}]) !== digest, 'changed SQL invalidates approval');
  assert(migrationSha256([a,{...b,name:'20261011000002_second.sql'}]) !== digest, 'renamed SQL invalidates approval');
  assert(approvedMigrationSetMatches(digest,digest), 'exact reviewed digest accepted');
  assert(!approvedMigrationSetMatches(digest,''), 'missing review rejected');
  assert(!approvedMigrationSetMatches(digest,'0'.repeat(64)), 'wrong review rejected');
  assert(!approvedMigrationSetMatches(digest,digest.toUpperCase()), 'unexpected digest case rejected');
  assert(!approvedMigrationSetMatches(digest,'tampered'), 'malformed digest rejected');
  let emptyRejected = false;
  try { migrationSha256([]); } catch { emptyRejected = true; }
  assert(emptyRejected, 'missing migration files rejected');
  let duplicateRejected = false;
  try { migrationSha256([a,a]); } catch { duplicateRejected = true; }
  assert(duplicateRejected, 'duplicate migration name rejected');
  console.log('PASS: exact migration-set approval gate (10 synthetic assertions).');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  if (process.argv.includes('--self-test')) selfTest();
  else if (process.argv.includes('--print')) {
    console.log('UAF_MIGRATIONS_SHA256=' + currentDigest());
    console.log('Human must separately review remote migration dry-run and the protected staging job.');
  } else if (process.argv.includes('--verify')) {
    if (!approvedMigrationSetMatches(currentDigest(), process.env.REVIEWED_MIGRATIONS_SHA256)) {
      console.error('STAGING MIGRATION GATE: Exact migration-set review digest missing or mismatched. Refusing deployment.');
      process.exitCode = 1;
    } else {
      console.log('PASS: migration files match explicitly supplied review digest. Still requires external approval of remote dry-run.');
    }
  } else {
    console.error('Usage: --self-test, --print or --verify');
    process.exitCode = 1;
  }
}
