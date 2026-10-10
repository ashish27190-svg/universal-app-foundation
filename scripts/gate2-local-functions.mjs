// Live HTTP verification against disposable LOCAL Supabase only.
// No external credentials. No production URL. Never log API keys or JWTs.
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const cli = resolve(root, 'node_modules/.bin/supabase');
const status = execFileSync(cli, ['status', '-o', 'env'], {
  cwd: resolve(root, 'infrastructure'), encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe'], timeout: 30000,
});
const localEnv = Object.fromEntries(status.split(/\r?\n/).flatMap(line => {
  const m = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
  return m ? [[m[1], m[2].replace(/^"(.*)"$/, '$1')]] : [];
}));
const apiUrl = localEnv.API_URL || 'http://127.0.0.1:54321';
const base = new URL(apiUrl);
if (!['127.0.0.1', 'localhost', '::1'].includes(base.hostname)) {
  throw new Error('Gate-2 HTTP tests are strictly local; refusing non-loopback Supabase URL.');
}
const anon = localEnv.ANON_KEY;
const admin = localEnv.SERVICE_ROLE_KEY;
if (!anon || !admin) throw new Error('Local Supabase status did not provide ANON_KEY and SERVICE_ROLE_KEY.');
const suffix = randomUUID().slice(0, 8);
let checks = 0;
function assert(condition, description) {
  if (!condition) throw new Error('FAILED: ' + description);
  checks++;
  console.log('PASS: ' + description);
}
async function request(path, {key=anon, token=key, method='GET', body, headers={}}={}) {
  const response = await fetch(new URL(path, base), {
    method,
    headers: {
      apikey: key,
      ...(token ? {Authorization: 'Bearer ' + token} : {}),
      ...(body !== undefined ? {'Content-Type': 'application/json'} : {}),
      ...headers
    },
    ...(body !== undefined ? {body: JSON.stringify(body)} : {}),
    signal: AbortSignal.timeout(15000)
  });
  const raw = await response.text();
  let data;try{data=raw ? JSON.parse(raw) : null;}catch{data={text:raw.slice(0,300)};}
  return {status:response.status, data};
}
function requireHttp(r, success, where) {
  if (r.status !== success) throw new Error(where + ' returned HTTP ' + r.status + ': ' + JSON.stringify(r.data).slice(0,400));
  return r.data;
}
async function waitForFunction() {
  for (let i=0; i<25; i++) {
    try {
      const r=await request('/functions/v1/sync-apply',{method:'POST',body:{}});
      // Invalid body or unauthenticated is expected; a missing function is not.
      if (![404,502,503].includes(r.status)) return;
    } catch {/* function container warming up */}
    await new Promise(resolve=>setTimeout(resolve,1000));
  }
  throw new Error('Local Edge Function never became available.');
}
async function createUser(label) {
  const email='gate2-'+suffix+'-'+label+'@example.invalid';
  const password='gate2-'+randomUUID()+'-A1';
  const created=requireHttp(await request('/auth/v1/admin/users',{
    key:admin,method:'POST',body:{email,password,email_confirm:true}
  }),200,'create local synthetic user '+label);
  const signed=requireHttp(await request('/auth/v1/token?grant_type=password',{
    method:'POST',body:{email,password}
  }),200,'sign in synthetic user '+label);
  if (!signed.access_token || !created.id) throw new Error('Missing synthetic user token/id');
  return {id:created.id,jwt:signed.access_token};
}
async function personalWorkspace(user,label) {
  const data=requireHttp(await request('/rest/v1/rpc/ensure_personal_workspace',{
    token:user.jwt,method:'POST',body:{requested_name:'Gate 2 '+label}
  }),200,'create personal workspace '+label);
  if (!Array.isArray(data)||!data[0]?.workspace_id) throw new Error('Missing workspace ID from RPC');
  return data[0].workspace_id;
}
async function adminInsert(table, rows) {
  const data=requireHttp(await request('/rest/v1/'+table,{
    key:admin,method:'POST',body:rows,
    headers:{Prefer:'return=representation'}
  }),201,'seed '+table);
  return data;
}
async function rows(table, filter) {
  const params=new URLSearchParams({...filter,select:'*'});
  return requireHttp(await request('/rest/v1/'+table+'?'+params.toString(),{key:admin}),200,'read '+table);
}
function envelope(ws, entityId, mutationId=randomUUID(), operation='create',payload={name:'Synthetic test asset '+suffix,category:'electronics'},expectedRevision=null) {
  return {
    protocolVersion:1,mutationId,clientDatabaseId:'gate2-disposable',
    clientOperationId:1,workspaceId:ws,entityType:'household_assets',entityId,
    operation,expectedRevision,payload
  };
}
async function apply(user,mutation) {
  return request('/functions/v1/sync-apply',{
    method:'POST',token:user.jwt,body:{protocolVersion:1,mutations:[mutation]}
  });
}
async function resolveConflict(user,id) {
  return request('/functions/v1/resolve-conflict',{
    method:'POST',token:user.jwt,body:{conflictId:id,choice:'keep_server'}
  });
}

console.log('Gate 2: local Edge Function authorization/integrity checks');
await waitForFunction();
const missing=await request('/functions/v1/sync-apply',{method:'POST',token:null,body:{protocolVersion:1,mutations:[]}});
assert([401,403].includes(missing.status),'unauthenticated sync request rejected');
const invalid=await request('/functions/v1/resolve-conflict',{method:'POST',token:'invalid-jwt',body:{}});
assert([401,403].includes(invalid.status),'invalid JWT rejected by conflict function');

const a=await createUser('a'),b=await createUser('b');
const wa=await personalWorkspace(a,'A'),wb=await personalWorkspace(b,'B');
assert(wa!==wb,'personal workspaces isolated by identity');
const shared=randomUUID();
await adminInsert('workspaces',[{id:shared,name:'Gate 2 Shared',workspace_type:'team',created_by:b.id}]);
await adminInsert('workspace_memberships',[
  {workspace_id:shared,user_id:b.id,role:'owner',status:'active'},
  {workspace_id:shared,user_id:a.id,role:'viewer',status:'active'}
]);

const assetId=randomUUID(), mutation=envelope(wa,assetId);
const created=requireHttp(await apply(a,mutation),200,'owner create mutation');
assert(created.outcomes?.[0]?.status==='applied','owner create applied');
assert((await rows('household_assets',{id:'eq.'+assetId})).length===1,'created asset exists exactly once');

const replay=requireHttp(await apply(a,mutation),200,'duplicate mutation');
assert(replay.outcomes?.[0]?.status==='idempotent','duplicate mutation is idempotent');
assert((await rows('household_assets',{id:'eq.'+assetId})).length===1,'replay does not duplicate asset');
assert((await rows('processed_mutations',{mutation_id:'eq.'+mutation.mutationId})).length===1,'idempotency ledger has one record');
assert((await rows('audit_events',{entity_id:'eq.'+assetId})).length===1,'successful create emits exactly one audit event');

const forbidden=envelope(wb,randomUUID());
const foreign=requireHttp(await apply(a,forbidden),200,'foreign workspace mutation');
assert(foreign.outcomes?.[0]?.status==='rejected','foreign workspace mutation rejected');
assert((await rows('write_conflicts',{mutation_id:'eq.'+forbidden.mutationId})).length===0,'foreign workspace rejection writes no conflict');
assert((await rows('processed_mutations',{mutation_id:'eq.'+forbidden.mutationId})).length===0,'foreign workspace rejection writes no ledger row');

const viewerMutation=envelope(shared,randomUUID());
const viewer=requireHttp(await apply(a,viewerMutation),200,'viewer mutation');
assert(viewer.outcomes?.[0]?.status==='rejected','viewer cannot upload a mutation');
assert((await rows('household_assets',{id:'eq.'+viewerMutation.entityId})).length===0,'viewer mutation changes no asset');

const conflictId=randomUUID();
await adminInsert('write_conflicts',[{
  id:conflictId,workspace_id:shared,entity_type:'household_assets',
  entity_id:randomUUID(),conflict_type:'revision',operation:'update',
  client_revision:1,server_revision:2
}]);
const viewerResolution=await resolveConflict(a,conflictId);
assert(viewerResolution.status===403,'viewer cannot resolve conflict');
assert((await rows('write_conflicts',{id:'eq.'+conflictId}))[0]?.resolved_at===null,'viewer cannot close conflict');

const ownerResolution=requireHttp(await resolveConflict(b,conflictId),200,'owner conflict resolution');
assert(ownerResolution.status==='resolved','owner can keep server version');
assert((await rows('write_conflicts',{id:'eq.'+conflictId}))[0]?.resolution==='keep_server','owner resolution persisted');
const foreignResolution=await resolveConflict(a,conflictId);
assert(foreignResolution.status===403,'viewer still forbidden after resolution');

console.log('PASS: '+checks+' local HTTP/authorization assertions.');
console.log('Scope: local Edge gateway; no PowerSync cloud streaming or real multi-device browser proof.');
