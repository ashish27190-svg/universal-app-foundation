import { readFile, readdir } from 'node:fs/promises';


const root = new URL('../packages/auth/src/', import.meta.url);
const allowedExternal = new Set(['@uaf/core', '@supabase/supabase-js', 'vitest']);

async function files(dirUrl) {
  const entries = await readdir(dirUrl, { withFileTypes: true });
  const result = [];
  for (const entry of entries) {
    const child = new URL(entry.name + (entry.isDirectory() ? '/' : ''), dirUrl);
    if (entry.isDirectory()) result.push(...(await files(child)));
    else if (/\.(ts|tsx)$/.test(entry.name)) result.push(child);
  }
  return result;
}

const violations = [];
for (const fileUrl of await files(root)) {
  const source = await readFile(fileUrl, 'utf8');
  for (const match of source.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
    const specifier = match[1];
    if (specifier.startsWith('.') || allowedExternal.has(specifier)) continue;
    violations.push(`${fileUrl.pathname}: forbidden dependency ${specifier}`);
  }
}

if (violations.length) {
  console.error(violations.join('\n'));
  process.exit(1);
}
console.log('Auth dependency boundary: PASS');
