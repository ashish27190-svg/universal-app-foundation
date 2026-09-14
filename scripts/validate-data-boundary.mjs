import { readFile, readdir } from 'node:fs/promises';

const root = new URL('../packages/data/src/', import.meta.url);
const allowed = new Set(['@uaf/core', 'vitest']);
async function walk(url) {
  const entries = await readdir(url, { withFileTypes: true });
  const out = [];
  for (const entry of entries) {
    const child = new URL(entry.name + (entry.isDirectory() ? '/' : ''), url);
    if (entry.isDirectory()) out.push(...await walk(child));
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(child);
  }
  return out;
}
const violations=[];
for (const file of await walk(root)) {
  const source=await readFile(file,'utf8');
  for (const match of source.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
    const spec=match[1];
    if (spec.startsWith('.') || allowed.has(spec)) continue;
    violations.push(`${file.pathname}: forbidden dependency ${spec}`);
  }
}
if (violations.length) { console.error(violations.join('\n')); process.exit(1); }
console.log('Data dependency boundary: PASS');
