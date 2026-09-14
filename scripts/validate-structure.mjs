import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const required = [
  'apps/reference-app/package.json',
  'packages/core/package.json',
  'packages/config/package.json',
  'packages/ui/package.json',
  'packages/data/package.json',
  'packages/sync/package.json',
  'packages/auth/package.json',
  'packages/domain-kit/package.json',
  'packages/test-kit/package.json',
  'domains/household-assets/README.md',
  'infrastructure/supabase/README.md',
  'infrastructure/powersync/README.md',
  'infrastructure/cloudflare/README.md',
  'docs/architecture/BUILD-0.1.md',
];
const missing = required.filter((path) => !existsSync(resolve(root, path)));
if (missing.length) {
  console.error('Missing required BUILD 0.1 paths:\n' + missing.map((x) => `- ${x}`).join('\n'));
  process.exit(1);
}
for (const file of required.filter((x) => x.endsWith('package.json'))) {
  JSON.parse(readFileSync(resolve(root, file), 'utf8'));
}
console.log(`BUILD 0.1 structure OK (${required.length} required paths found).`);
