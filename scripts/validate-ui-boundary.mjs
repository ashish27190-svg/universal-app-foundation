import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('packages/ui');
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const allowedRuntime = new Set(['@radix-ui/react-dialog']);

for (const dependency of Object.keys(packageJson.dependencies ?? {})) {
  if (!allowedRuntime.has(dependency)) {
    throw new Error(`@uaf/ui runtime dependency is not approved: ${dependency}`);
  }
}

const files = fs.readdirSync(path.join(root, 'src')).filter((name) => /\.(ts|tsx)$/.test(name));
const forbidden = [/@supabase\//, /@powersync\//, /@uaf\/auth/, /@uaf\/sync/, /@uaf\/data/, /domains\//, /reference-app/];
for (const file of files) {
  const source = fs.readFileSync(path.join(root, 'src', file), 'utf8');
  for (const pattern of forbidden) {
    if (pattern.test(source)) throw new Error(`Forbidden UI dependency in ${file}: ${pattern}`);
  }
}
console.log(`UI dependency boundary: PASS (${files.length} source files checked).`);
