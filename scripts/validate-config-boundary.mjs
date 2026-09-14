import { readdir, readFile } from 'node:fs/promises';
import { extname, join, relative, resolve } from 'node:path';

const root = resolve(process.cwd());
const sourceRoot = join(root, 'packages/config/src');
const allowedExternal = new Set(['zod']);
const forbiddenFragments = [
  '@uaf/ui',
  '@uaf/data',
  '@uaf/sync',
  '@uaf/auth',
  '@uaf/domain-kit',
  '@uaf/test-kit',
  'react',
  'react-dom',
  '@supabase',
  'powersync',
  'cloudflare',
  'household-assets',
  'reference-app',
];

async function files(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const result = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) result.push(...(await files(path)));
    else if (['.ts', '.tsx'].includes(extname(entry.name)) && !entry.name.endsWith('.test.ts')) result.push(path);
  }
  return result;
}

const violations = [];
for (const file of await files(sourceRoot)) {
  const source = await readFile(file, 'utf8');
  const importPattern = /(?:from\s+|import\s*)['"]([^'"]+)['"]/g;
  for (const match of source.matchAll(importPattern)) {
    const specifier = match[1];
    if (!specifier || specifier.startsWith('.') || allowedExternal.has(specifier)) continue;
    if (forbiddenFragments.some((fragment) => specifier.includes(fragment)) || specifier.startsWith('@uaf/')) {
      violations.push(`${relative(root, file)} imports forbidden dependency ${specifier}`);
      continue;
    }
    violations.push(`${relative(root, file)} imports undeclared config dependency ${specifier}`);
  }
}

if (violations.length > 0) {
  console.error('Config boundary validation failed:');
  for (const violation of violations) console.error(`- ${violation}`);
  process.exit(1);
}

console.log('Config boundary validation passed. @uaf/config only depends on Zod and local modules.');
