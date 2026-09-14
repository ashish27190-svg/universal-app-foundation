import { readFile, readdir } from 'node:fs/promises';
const root = new URL('../packages/sync/src/', import.meta.url);
const allowed = new Set(['@powersync/web', '@uaf/auth', '@uaf/core', '@uaf/data', 'vitest']);
async function walk(url) {
  const entries=await readdir(url,{withFileTypes:true}); const out=[];
  for (const entry of entries) {
    const child=new URL(entry.name+(entry.isDirectory()?'/':''),url);
    if (entry.isDirectory()) out.push(...await walk(child));
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(child);
  }
  return out;
}
const bad=[];
for (const file of await walk(root)) {
  const source=await readFile(file,'utf8');
  for (const m of source.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
    const spec=m[1]; if (spec.startsWith('.')||allowed.has(spec)) continue;
    bad.push(`${file.pathname}: forbidden dependency ${spec}`);
  }
}
if (bad.length) { console.error(bad.join('\n')); process.exit(1); }
console.log('Sync dependency boundary: PASS');
