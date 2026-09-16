import { readFile, readdir } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../packages/core/src/', import.meta.url));
const forbidden = [
  'react',
  '@supabase',
  '@powersync',
  'cloudflare',
  '@uaf/ui',
  '@uaf/data',
  '@uaf/sync',
  '@uaf/auth',
  '@uaf/domain-kit',
  '@uaf/test-kit',
];

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(path)));
    else if (['.ts', '.tsx'].includes(extname(entry.name))) files.push(path);
  }
  return files;
}

const files = await walk(root);
const violations = [];

for (const file of files) {
  const text = await readFile(file, 'utf8');
  for (const dependency of forbidden) {
    const escaped = dependency.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const importPattern = new RegExp(`(?:from\\s+|import\\s*\\()(['"])${escaped}`);
    if (importPattern.test(text)) violations.push(`${file}: forbidden dependency ${dependency}`);
  }
}

if (violations.length) {
  console.error(violations.join('\n'));
  process.exit(1);
}

console.log(`BUILD 0.2 core boundary OK (${files.length} source files checked).`);
