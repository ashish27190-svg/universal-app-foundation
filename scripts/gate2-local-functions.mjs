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
async function resolveConflict(user,id,choice='keep_server',reviewedRevision) {
  return request('/functions/v1/resolve-conflict',{
    method:'POST',token:user.jwt,body:{
      conflictId:id,choice,
      ...(reviewedRevision === undefined ? {} : {reviewedRevision})
    }
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
// Same mutation ID with a different payload or identity must never be a
// successful replay, even when the requester has write access.
const changedPayload=await apply(a,{
  ...mutation,payload:{...mutation.payload,name:'Changed payload must be rejected'}
});
assert(changedPayload.status===409,'same mutation ID with changed payload returns 409');
const changedEntity=await apply(a,{...mutation,entityId:randomUUID()});
assert(changedEntity.status===409,'same mutation ID with changed entity returns 409');
const differentActor=await apply(b,{...mutation,workspaceId:wb,entityId:randomUUID()});
assert(differentActor.status===409,'same mutation ID from a different owner/workspace returns 409');
assert((await rows('processed_mutations',{mutation_id:'eq.'+mutation.mutationId})).length===1,'reused mutation ID does not add a ledger row');
assert((await rows('household_assets',{id:'eq.'+assetId})).length===1,'reused mutation ID does not alter original asset');

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
assert((await rows('audit_events',{correlation_id:'eq.'+conflictId})).length===1,'keep-server resolution writes exactly one audit');
const retryResolution=requireHttp(await resolveConflict(b,conflictId),200,'retry owner resolution');
assert(retryResolution.status==='already_resolved','repeated keep-server resolution is idempotent');
assert((await rows('audit_events',{correlation_id:'eq.'+conflictId})).length===1,'retry emits no duplicate audit');
const foreignResolution=await resolveConflict(a,conflictId);
assert(foreignResolution.status===403,'viewer still forbidden after resolution');

// Exercise two concurrent closure attempts against the same row. Exactly one
// may resolve it; the other must report already_resolved without an extra audit.
const concurrentConflictId=randomUUID();
await adminInsert('write_conflicts',[{
  id:concurrentConflictId,workspace_id:shared,entity_type:'household_assets',
  entity_id:randomUUID(),conflict_type:'revision',operation:'update',
  client_revision:1,server_revision:2
}]);
const attempts=await Promise.all([
  resolveConflict(b,concurrentConflictId),
  resolveConflict(b,concurrentConflictId)
]);
assert(attempts.every(r=>r.status===200),'concurrent keep-server requests complete successfully');
assert(attempts.map(r=>r.data.status).sort().join(',')==='already_resolved,resolved','concurrent keep-server returns one winner and one retry');
assert((await rows('audit_events',{correlation_id:'eq.'+concurrentConflictId})).length===1,'concurrent conflict closure emits exactly one audit');


// Atomic sync: concurrent identical creates must serialize to one business row,
// one ledger row, and one audit row, with the second attempt idempotent.
const sameId=randomUUID(), raceMutation=envelope(wa,sameId);
const raceResults=await Promise.all([apply(a,raceMutation),apply(a,raceMutation)]);
assert(raceResults.every(r=>r.status===200),'concurrent identical sync requests succeed');
assert(raceResults.map(r=>r.data.outcomes?.[0]?.status).sort().join(',')==='applied,idempotent','concurrent identical sync creates exactly once');
assert((await rows('household_assets',{id:'eq.'+sameId})).length===1,'concurrent create has one entity');
assert((await rows('processed_mutations',{mutation_id:'eq.'+raceMutation.mutationId})).length===1,'concurrent create has one ledger entry');
assert((await rows('audit_events',{correlation_id:'eq.'+raceMutation.mutationId})).length===1,'concurrent create has one correlated audit');

// Different mutation IDs against the same revision must produce exactly one
// revision winner and one durable conflict; neither may overwrite silently.
const contender1=envelope(wa,sameId,randomUUID(),'update',{name:'Contender One'},1);
const contender2=envelope(wa,sameId,randomUUID(),'update',{name:'Contender Two'},1);
const revisionResults=await Promise.all([apply(a,contender1),apply(a,contender2)]);
assert(revisionResults.every(r=>r.status===200),'concurrent different revision updates return outcomes');
assert(revisionResults.map(r=>r.data.outcomes?.[0]?.status).sort().join(',')==='applied,conflict','same-revision competing changes yield winner and conflict');
assert((await rows('household_assets',{id:'eq.'+sameId}))[0]?.revision===2,'competing updates advance revision only once');
const conflictMutation=revisionResults[0].data.outcomes[0].status==='conflict'?contender1:contender2;
const winnerMutation=conflictMutation===contender1?contender2:contender1;
assert((await rows('write_conflicts',{mutation_id:'eq.'+conflictMutation.mutationId})).length===1,'losing update records one conflict');
assert((await rows('processed_mutations',{mutation_id:'eq.'+conflictMutation.mutationId}))[0]?.result_status==='conflict','losing update is durably idempotent');
assert((await rows('audit_events',{correlation_id:'eq.'+winnerMutation.mutationId})).length===1,'winning update records one audit');
assert((await rows('audit_events',{correlation_id:'eq.'+conflictMutation.mutationId})).length===0,'losing update never emits success audit');

// Both entity types and lifecycle transitions go through the atomic RPC.
const serviceId=randomUUID();
const serviceMutation=envelope(wa,serviceId,randomUUID(),'create',{
  asset_id:sameId,service_date:'2026-10-10',cost_minor:1200,cost_currency:'INR',provider:'Synthetic provider'
},null);
serviceMutation.entityType='asset_service_records';
const serviceCreate=requireHttp(await apply(a,serviceMutation),200,'atomic service record create');
assert(serviceCreate.outcomes[0].status==='applied','service record create applied');
assert((await rows('asset_service_records',{id:'eq.'+serviceId}))[0]?.cost_minor===1200,'service record saved with validated fields');
assert((await rows('audit_events',{correlation_id:'eq.'+serviceMutation.mutationId})).length===1,'service create audited atomically');

const foreignService=envelope(wb,randomUUID(),randomUUID(),'create',{
  asset_id:sameId,service_date:'2026-10-10'
},null);
foreignService.entityType='asset_service_records';
const invalidRelation=requireHttp(await apply(b,foreignService),200,'foreign asset reference');
assert(invalidRelation.outcomes[0].status==='rejected','cross-workspace service relationship rejected');
assert((await rows('asset_service_records',{id:'eq.'+foreignService.entityId})).length===0,'rejected relation saves no service record');
assert((await rows('processed_mutations',{mutation_id:'eq.'+foreignService.mutationId})).length===1,'rejected relation outcome is recorded');

const soft=envelope(wa,sameId,randomUUID(),'soft_delete',{},2);
const softResult=requireHttp(await apply(a,soft),200,'soft delete');
assert(softResult.outcomes[0].status==='applied','atomic soft delete applied');
assert((await rows('household_assets',{id:'eq.'+sameId}))[0]?.lifecycle_state==='deleted','asset soft deleted');
const restored=envelope(wa,sameId,randomUUID(),'restore',{},3);
const restoreResult=requireHttp(await apply(a,restored),200,'restore');
assert(restoreResult.outcomes[0].status==='applied','atomic restore applied');
assert((await rows('household_assets',{id:'eq.'+sameId}))[0]?.revision===4,'delete and restore increment revision');

const invalidAsset=envelope(wa,randomUUID(),randomUUID(),'create',{name:'',category:'appliance'});
const invalidResult=requireHttp(await apply(a,invalidAsset),200,'invalid field rejection');
assert(invalidResult.outcomes[0].status==='rejected','invalid create records rejection');
assert((await rows('processed_mutations',{mutation_id:'eq.'+invalidAsset.mutationId}))[0]?.result_status==='rejected','invalid create has rejection ledger');
assert((await rows('household_assets',{id:'eq.'+invalidAsset.entityId})).length===0,'invalid create never writes entity');


// Reviewed-revision reapplication: transaction contains entity update, ledger,
// mutation audit, conflict closure, and resolver audit. Retried requests do not
// apply the client patch twice.
const reapplyConflictId=randomUUID();
const reapplyBefore=(await rows('household_assets',{id:'eq.'+sameId}))[0];
await adminInsert('write_conflicts',[{
  id:reapplyConflictId,workspace_id:wa,entity_type:'household_assets',
  entity_id:sameId,conflict_type:'revision',operation:'update',
  client_revision:2,server_revision:reapplyBefore.revision,
  client_payload:{name:'Reviewed client version'},
  server_payload:reapplyBefore
}]);
const missingReview=await resolveConflict(a,reapplyConflictId,'reapply_client');
assert(missingReview.status===400,'reapply requires explicit reviewed server revision');
const viewerReapply=await resolveConflict(a,conflictId,'reapply_client',2);
assert(viewerReapply.status===403,'viewer cannot reapply a shared conflict');
const reapplyOutcome=requireHttp(await resolveConflict(a,reapplyConflictId,'reapply_client',reapplyBefore.revision),200,'reviewed reapply');
assert(reapplyOutcome.status==='resolved'&&reapplyOutcome.resolution==='reapply_client','reviewed client patch reapplied once');
const afterReapply=(await rows('household_assets',{id:'eq.'+sameId}))[0];
assert(afterReapply.name==='Reviewed client version'&&afterReapply.revision===reapplyBefore.revision+1,'reapply increments revision and updates asset');
assert((await rows('write_conflicts',{id:'eq.'+reapplyConflictId}))[0]?.resolution==='reapply_client','reapply closes original conflict');
assert((await rows('audit_events',{correlation_id:'eq.'+reapplyConflictId})).length===1,'reapply writes exactly one resolver audit');
const reapplyRetry=requireHttp(await resolveConflict(a,reapplyConflictId,'reapply_client',reapplyBefore.revision),200,'reapply retry');
assert(reapplyRetry.status==='already_resolved','reapply retry does not mutate');
assert((await rows('household_assets',{id:'eq.'+sameId}))[0]?.revision===afterReapply.revision,'reapply retry cannot increment revision twice');
assert((await rows('audit_events',{correlation_id:'eq.'+reapplyConflictId})).length===1,'reapply retry cannot duplicate resolution audit');

// A conflict reviewed at revision N must not apply at revision N+1 without
// the user reviewing the refreshed server record.
const staleConflictId=randomUUID(),staleSnapshot=(await rows('household_assets',{id:'eq.'+sameId}))[0];
await adminInsert('write_conflicts',[{
  id:staleConflictId,workspace_id:wa,entity_type:'household_assets',
  entity_id:sameId,conflict_type:'revision',operation:'update',
  client_revision:2,server_revision:staleSnapshot.revision,
  client_payload:{name:'Stale client version'},
  server_payload:staleSnapshot
}]);
const serverAdvance=envelope(wa,sameId,randomUUID(),'update',{name:'Newer server version'},staleSnapshot.revision);
const advanceOutcome=requireHttp(await apply(a,serverAdvance),200,'server advance');
assert(advanceOutcome.outcomes[0]?.status==='applied','server can advance revision');
const staleResponse=await resolveConflict(a,staleConflictId,'reapply_client',staleSnapshot.revision);
assert(staleResponse.status===409,'out-of-date reviewed reapply rejected');
const refreshed=(await rows('write_conflicts',{id:'eq.'+staleConflictId}))[0];
assert(refreshed.server_revision===staleSnapshot.revision+1 && refreshed.resolved_at===null,'conflict snapshot refreshed but remains open');
const staleRetry=await resolveConflict(a,staleConflictId,'reapply_client',staleSnapshot.revision);
assert(staleRetry.status===409,'unreviewed retry cannot override newer server change');
assert((await rows('household_assets',{id:'eq.'+sameId}))[0]?.name==='Newer server version','stale request never changes server record');
const newlyReviewed=requireHttp(await resolveConflict(a,staleConflictId,'reapply_client',refreshed.server_revision),200,'re-reviewed reapply');
assert(newlyReviewed.status==='resolved','newly reviewed version can safely reapply');
assert((await rows('household_assets',{id:'eq.'+sameId}))[0]?.name==='Stale client version','approved reapply updates data');

// Competing resolution choices are mutually exclusive under the conflict row
// lock: one resolution wins, the loser sees already_resolved.
const choiceConflictId=randomUUID();
const choiceRevision=(await rows('household_assets',{id:'eq.'+sameId}))[0].revision;
await adminInsert('write_conflicts',[{
  id:choiceConflictId,workspace_id:wa,entity_type:'household_assets',
  entity_id:sameId,conflict_type:'revision',operation:'update',
  client_revision:2,server_revision:choiceRevision,
  client_payload:{name:'Choice race client'},server_payload:(await rows('household_assets',{id:'eq.'+sameId}))[0]
}]);
const differentChoices=await Promise.all([
  resolveConflict(a,choiceConflictId,'keep_server'),
  resolveConflict(a,choiceConflictId,'reapply_client',choiceRevision)
]);
assert(differentChoices.every(r=>r.status===200),'competing keep-server and reapply requests return');
assert(differentChoices.map(r=>r.data.status).sort().join(',')==='already_resolved,resolved','only one resolution choice wins');
assert((await rows('audit_events',{correlation_id:'eq.'+choiceConflictId})).length===1,'competing choices leave exactly one resolution audit');
assert((await rows('write_conflicts',{id:'eq.'+choiceConflictId}))[0]?.resolved_at!==null,'choice race conflict ends resolved');

// Lifecycle conflict reapplication must be atomic too, even though it has no
// editable fields. Confirm soft-delete and restore never become an empty update.
const deletionBefore=(await rows('household_assets',{id:'eq.'+sameId}))[0];
assert(deletionBefore.lifecycle_state==='active','lifecycle reapply fixture starts active');
const deletionConflictId=randomUUID();
await adminInsert('write_conflicts',[{
  id:deletionConflictId,workspace_id:wa,entity_type:'household_assets',
  entity_id:sameId,conflict_type:'conflict',operation:'soft_delete',
  client_revision:deletionBefore.revision-1,server_revision:deletionBefore.revision,
  client_payload:{},server_payload:deletionBefore
}]);
const deletionResult=requireHttp(
  await resolveConflict(a,deletionConflictId,'reapply_client',deletionBefore.revision),
  200,'reviewed soft-delete reapply');
assert(deletionResult.status==='resolved','reviewed soft-delete conflict resolves');
const afterDeletion=(await rows('household_assets',{id:'eq.'+sameId}))[0];
assert(afterDeletion.lifecycle_state==='deleted'&&afterDeletion.revision===deletionBefore.revision+1,'reapplied delete increments revision once');
assert((await rows('audit_events',{correlation_id:'eq.'+deletionConflictId})).length===1,'reapplied delete records exactly one resolution audit');
const deletionRepeat=requireHttp(
  await resolveConflict(a,deletionConflictId,'reapply_client',deletionBefore.revision),
  200,'retry deleted conflict');
assert(deletionRepeat.status==='already_resolved','reapplied delete retry does not apply again');

const restorationConflictId=randomUUID();
await adminInsert('write_conflicts',[{
  id:restorationConflictId,workspace_id:wa,entity_type:'household_assets',
  entity_id:sameId,conflict_type:'conflict',operation:'restore',
  client_revision:afterDeletion.revision-1,server_revision:afterDeletion.revision,
  client_payload:{},server_payload:afterDeletion
}]);
const restorationResult=requireHttp(
  await resolveConflict(a,restorationConflictId,'reapply_client',afterDeletion.revision),
  200,'reviewed restore reapply');
assert(restorationResult.status==='resolved','reviewed restore conflict resolves');
const afterRestoration=(await rows('household_assets',{id:'eq.'+sameId}))[0];
assert(afterRestoration.lifecycle_state==='active'&&afterRestoration.revision===afterDeletion.revision+1,'reapplied restore increments revision once');
assert((await rows('audit_events',{correlation_id:'eq.'+restorationConflictId})).length===1,'reapplied restore writes one resolution audit');

console.log('PASS: '+checks+' local HTTP/authorization assertions.');
console.log('Scope: local Edge gateway; no PowerSync cloud streaming or real multi-device browser proof.');
