import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve('domains/household-assets');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const allowed = new Set(['@uaf/core', '@uaf/data']);
for (const dep of Object.keys(pkg.dependencies ?? {})) if (!allowed.has(dep)) throw new Error(`Household domain dependency is not approved: ${dep}`);
const files = fs.readdirSync(path.join(root, 'src')).filter((name) => /\.ts$/.test(name));
const forbidden = [/react/, /@supabase\//, /@powersync\//, /@uaf\/ui/, /reference-app/, /cloudflare/i];
for (const file of files) {
  const source = fs.readFileSync(path.join(root, 'src', file), 'utf8');
  for (const pattern of forbidden) if (pattern.test(source)) throw new Error(`Forbidden household-domain dependency in ${file}: ${pattern}`);
}
console.log(`Household domain boundary: PASS (${files.length} source files checked).`);
