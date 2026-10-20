// Static regression gate for the ₹0 disposable local PowerSync experiment.
// This does NOT prove successful replication or localhost-only Supabase
// binding. Real acceptance requires the isolated Docker+browser workflow.
import {readFileSync} from 'node:fs';

export function inspectLocalPowerSync(compose, service, streams, workflow, gitignore) {
  const errors=[];
  function demand(ok,msg) {if(!ok) errors.push(msg);}
  demand(compose.includes('name: uaf-local-powersync'), 'Dedicated Compose project missing.');
  demand(compose.includes('127.0.0.1:54399:8080'), 'PowerSync API must bind only to IPv4 loopback.');
  demand(!/^\s+-\s*["']?(?:0\.0\.0\.0:)?(?:27017|8080):/m.test(compose),
    'Mongo or PowerSync must not expose a public host port.');
  demand(compose.includes('PS_DATA_SOURCE_URI: postgresql://postgres:postgres@supabase_db_uaf-household-vault-local:5432/postgres'),
    'Local replication must connect to disposable UAF Postgres only.');
  demand(compose.includes('name: supabase_network_uaf-household-vault-local') &&
    compose.includes('external: true'), 'Only isolated local Supabase Docker network is allowed.');
  demand(compose.includes('../sync-config.yaml:/config/sync-config.yaml:ro'),
    'Canonical UAF Sync Streams must be mounted read-only.');
  demand(compose.includes('journeyapps/powersync-service:1.27.0'),
    'PowerSync test image must use reviewed explicit version.');
  demand(!compose.includes('journeyapps/powersync-service:latest'),
    'Floating PowerSync image not permitted.');
  demand(service.includes('jwks_uri: http://kong:8000/auth/v1/.well-known/jwks.json') &&
    service.includes('supabase: true') && service.includes('audience: ["authenticated"]'),
    'PowerSync must verify local Supabase asymmetric JWTs.');
  demand(service.includes('disable_telemetry_sharing: true'),
    'Local telemetry must be disabled.');
  demand(streams.includes('edition: 3') &&
    streams.includes('membership.user_id = auth.user_id()') &&
    streams.includes("membership.status = 'active'"),
    'Canonical Sync Streams must filter by authenticated active membership.');
  demand(workflow.includes('pull_request:') &&
    !workflow.includes('environment: staging') &&
    !workflow.includes('secrets.') &&
    !workflow.includes('supabase link') &&
    !workflow.includes('supabase db push') &&
    !workflow.includes('wrangler deploy'),
    'Local CI must not authorize hosted access, secrets or deployment.');
  demand(workflow.includes('node scripts/validate-connected-e2e-results.mjs') &&
    workflow.includes('docker compose -f infrastructure/powersync/local/compose.yaml down --volumes'),
    'Local full-sync CI needs no-skip proof and disposable cleanup.');
  demand(gitignore.includes('infrastructure/supabase/signing_key.json'),
    'Generated local JWT signing key must be ignored.');
  return errors;
}

const files=[
  'infrastructure/powersync/local/compose.yaml',
  'infrastructure/powersync/local/service.yaml',
  'infrastructure/powersync/sync-config.yaml',
  '.github/workflows/gate3-local-powersync-e2e.yml',
  '.gitignore'
];
function localSources() {return files.map(path=>readFileSync(path,'utf8'));}
function main() {
  const all=localSources();
  const errors=inspectLocalPowerSync(...all);
  if(errors.length) throw new Error(errors.join('\n'));
  if(process.argv.includes('--self-test')) {
    const mutate=(i,from,to)=>all.map((s,j)=>j===i?s.replace(from,to):s);
    const tests=[
      mutate(0,'127.0.0.1:54399:8080','0.0.0.0:54399:8080'),
      mutate(0,'supabase_db_uaf-household-vault-local','db.some-prod.supabase.co'),
      mutate(1,'supabase: true','supabase: false'),
      mutate(1,'disable_telemetry_sharing: true','disable_telemetry_sharing: false'),
      mutate(2,"membership.status = 'active'","membership.status = 'removed'"),
      mutate(3,'pull_request:','workflow_dispatch:'),
      mutate(4,'infrastructure/supabase/signing_key.json','# key not ignored'),
    ];
    tests.forEach((input,i)=>{
      if(!inspectLocalPowerSync(...input).length) throw new Error('Unsafe local config accepted: '+(i+1));
    });
    console.log('PASS: 7 synthetic fail-closed local PowerSync safety checks.');
  } else console.log('PASS: local PowerSync config and CI are source-only, synthetic, non-hosted.');
}
try {main();} catch(e){console.error('UAF_LOCAL_SYNC_GATE: '+e.message);process.exitCode=1;}
