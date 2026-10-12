-- Disposable UAF local Gate-2 RLS test; never run against a linked production project.
begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(68);

-- Synthetic users. Transactional fixture data rolls back after pgTAP execution.
insert into auth.users (id, instance_id, aud, role, email, created_at, updated_at)
values
 ('a1000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'uaf-rls-a@example.invalid', now(), now()),
 ('b2000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'uaf-rls-b@example.invalid', now(), now());

insert into public.workspaces (id,name,workspace_type,created_by)
values
 ('a1000000-0000-4000-8000-000000000011','A Personal','personal','a1000000-0000-4000-8000-000000000001'),
 ('b2000000-0000-4000-8000-000000000022','B Personal','personal','b2000000-0000-4000-8000-000000000002'),
 ('b2000000-0000-4000-8000-000000000033','B Shared','team','b2000000-0000-4000-8000-000000000002');

insert into public.workspace_memberships (workspace_id,user_id,role,status)
values
 ('a1000000-0000-4000-8000-000000000011','a1000000-0000-4000-8000-000000000001','owner','active'),
 ('b2000000-0000-4000-8000-000000000022','b2000000-0000-4000-8000-000000000002','owner','active'),
 ('b2000000-0000-4000-8000-000000000033','b2000000-0000-4000-8000-000000000002','owner','active'),
 ('b2000000-0000-4000-8000-000000000033','a1000000-0000-4000-8000-000000000001','viewer','active');

insert into public.household_assets (id,workspace_id,name,category)
values
 ('a1000000-0000-4000-8000-000000000101','a1000000-0000-4000-8000-000000000011','Asset A','appliance'),
 ('b2000000-0000-4000-8000-000000000102','b2000000-0000-4000-8000-000000000022','Asset B','electronics');

insert into public.write_conflicts (workspace_id,entity_type,entity_id,conflict_type)
values ('b2000000-0000-4000-8000-000000000022','household_assets','b2000000-0000-4000-8000-000000000102','revision');
insert into public.audit_events (workspace_id,actor_type,action)
values ('b2000000-0000-4000-8000-000000000022','system','test.fixture');

select extensions.has_table('public','workspaces','Workspace table exists');
select extensions.has_table('public','workspace_memberships','Membership table exists');
select extensions.has_table('public','household_assets','Assets table exists');
select extensions.has_table('public','processed_mutations','Private mutation ledger exists');
select extensions.has_function('public','ensure_personal_workspace',array['text'],'Personal workspace RPC exists');
select extensions.ok(not pg_catalog.has_function_privilege('authenticated','public.keep_server_conflict_transaction(uuid,uuid)','EXECUTE'),'Authenticated browser cannot call privileged keep-server RPC');

select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000001',true);
set local role authenticated;
select extensions.is((select count(*)::int from public.workspaces where id='a1000000-0000-4000-8000-000000000011'),1,'A can read own workspace');
select extensions.is((select count(*)::int from public.workspaces where id='b2000000-0000-4000-8000-000000000022'),0,'A cannot read B workspace');
select extensions.is((select count(*)::int from public.workspaces where id='b2000000-0000-4000-8000-000000000033'),1,'Viewer can read shared workspace');
select extensions.ok(public.can_write_workspace('a1000000-0000-4000-8000-000000000011'),'Owner can write own workspace');
select extensions.ok(not public.can_write_workspace('b2000000-0000-4000-8000-000000000033'),'Viewer cannot write shared workspace');
select extensions.is((select count(*)::int from public.household_assets where workspace_id='b2000000-0000-4000-8000-000000000022'),0,'A cannot see B assets');
select extensions.is((select count(*)::int from public.write_conflicts where workspace_id='b2000000-0000-4000-8000-000000000022'),0,'A cannot see B conflicts');
select extensions.is((select count(*)::int from public.audit_events where workspace_id='b2000000-0000-4000-8000-000000000022'),0,'A cannot see B audit');
select extensions.throws_ok($$insert into public.household_assets (id,workspace_id,name,category) values (gen_random_uuid(),'a1000000-0000-4000-8000-000000000011','Bypass','other')$$,'42501');
select extensions.throws_ok($$select mutation_id from public.processed_mutations$$,'42501');
select extensions.lives_ok($$select * from public.ensure_personal_workspace('A Personal')$$,'Workspace bootstrap succeeds');
select extensions.lives_ok($$select * from public.ensure_personal_workspace('A Personal')$$,'Workspace bootstrap is idempotent');
select extensions.is((select count(*)::int from public.workspaces where created_by='a1000000-0000-4000-8000-000000000001' and workspace_type='personal' and status='active'),1,'One active personal workspace');

-- Least-privilege workspace updates: owner/admin may update editable
-- fields only, never reassign tenant ownership or corrupt identity/audit.
select extensions.ok(
  not pg_catalog.has_table_privilege('authenticated','public.workspaces','UPDATE'),
  'Authenticated writer has no table-wide workspace UPDATE privilege');
select extensions.ok(
  pg_catalog.has_column_privilege('authenticated','public.workspaces','name','UPDATE'),
  'Workspace name remains an editable client field');
select extensions.ok(
  pg_catalog.has_column_privilege('authenticated','public.workspaces','status','UPDATE'),
  'Workspace status remains an editable client field');
select extensions.ok(
  not pg_catalog.has_column_privilege('authenticated','public.workspaces','created_by','UPDATE'),
  'Workspace creator is immutable to browser clients');
select extensions.ok(
  not pg_catalog.has_column_privilege('authenticated','public.workspaces','workspace_type','UPDATE'),
  'Workspace type is immutable to browser clients');
select extensions.ok(
  not pg_catalog.has_column_privilege('authenticated','public.workspaces','updated_at','UPDATE'),
  'Workspace audit timestamp is not client-writable');
select extensions.throws_ok($check$update public.workspaces
  set created_by='b2000000-0000-4000-8000-000000000002'
  where id='a1000000-0000-4000-8000-000000000011'$check$,
  '42501',null,'Authenticated client cannot transfer workspace creator');
select extensions.throws_ok($check$update public.workspaces
  set workspace_type='team'
  where id='a1000000-0000-4000-8000-000000000011'$check$,
  '42501',null,'Authenticated client cannot change workspace type');
select extensions.lives_ok($check$update public.workspaces set name='A Personal edited'
  where id='a1000000-0000-4000-8000-000000000011'$check$,
  'Active owner can still rename own workspace');
reset role;
update public.workspaces set status='archived'
 where id='a1000000-0000-4000-8000-000000000011';
set local role authenticated;
select extensions.ok(
  not public.can_write_workspace('a1000000-0000-4000-8000-000000000011'),
  'Archived workspace is not writable despite active owner membership');
update public.workspaces set name='Archived edit should fail'
 where id='a1000000-0000-4000-8000-000000000011';
select extensions.is(
  (select name from public.workspaces
    where id='a1000000-0000-4000-8000-000000000011'),
  'A Personal edited',
  'Archived workspace name remains unchanged after attempted client UPDATE');
reset role;
update public.workspaces set status='active'
 where id='a1000000-0000-4000-8000-000000000011';
set local role authenticated;

select set_config('request.jwt.claim.sub','b2000000-0000-4000-8000-000000000002',true);
select extensions.is((select count(*)::int from public.household_assets where workspace_id='b2000000-0000-4000-8000-000000000022'),1,'B can see B asset');
select extensions.is((select count(*)::int from public.workspaces where id='a1000000-0000-4000-8000-000000000011'),0,'B cannot read A workspace');

reset role;

-- A writer's active membership must never allow conflict closure in an
-- archived workspace. Restore it and prove one closure/audit only on retry.
-- Use a dedicated asset fixture to avoid contaminating reapply rollback
-- assertions elsewhere in this same transaction.
insert into public.household_assets (id,workspace_id,name,category)
values ('a1000000-0000-4000-8000-000000000777',
        'a1000000-0000-4000-8000-000000000011',
        'Archived-workspace fixture', 'appliance');
insert into public.write_conflicts (
  id, workspace_id, entity_type, entity_id, conflict_type, client_payload, server_payload
) values (
  'a1000000-0000-4000-8000-000000000778',
  'a1000000-0000-4000-8000-000000000011',
  'household_assets', 'a1000000-0000-4000-8000-000000000777', 'revision',
  '{"name":"Offline edit"}'::jsonb, '{"name":"Archived-workspace fixture"}'::jsonb
);
update public.workspaces set status = 'archived'
 where id = 'a1000000-0000-4000-8000-000000000011';
select extensions.is(
  public.keep_server_conflict_transaction(
    'a1000000-0000-4000-8000-000000000778',
    'a1000000-0000-4000-8000-000000000001'
  )->>'status', 'denied',
  'Archived workspace blocks keep-server resolution despite active owner membership');
select extensions.is(
  (select count(*)::int from public.write_conflicts
   where id = 'a1000000-0000-4000-8000-000000000778' and resolved_at is null), 1,
  'Denied archived-workspace resolution leaves conflict open');
select extensions.is(
  (select count(*)::int from public.audit_events
   where correlation_id = 'a1000000-0000-4000-8000-000000000778'), 0,
  'Denied archived-workspace resolution writes no audit');
update public.workspaces set status = 'active'
 where id = 'a1000000-0000-4000-8000-000000000011';
select extensions.is(
  public.keep_server_conflict_transaction(
    'a1000000-0000-4000-8000-000000000778',
    'a1000000-0000-4000-8000-000000000001'
  )->>'status', 'resolved',
  'Restored active workspace permits authorized keep-server resolution');
select extensions.is(
  (select count(*)::int from public.audit_events
   where correlation_id = 'a1000000-0000-4000-8000-000000000778'), 1,
  'Authorized keep-server resolution produces exactly one audit');
select extensions.is(
  public.keep_server_conflict_transaction(
    'a1000000-0000-4000-8000-000000000778',
    'a1000000-0000-4000-8000-000000000001'
  )->>'status', 'already_resolved',
  'Retried keep-server resolution is idempotent');
select extensions.is(
  (select count(*)::int from public.audit_events
   where correlation_id = 'a1000000-0000-4000-8000-000000000778'), 1,
  'Idempotent keep-server retry never duplicates audit');

-- Reapply must use the same active workspace and writer authorization as
-- keep-server, and retain row locks for the complete replay transaction.
-- This fixture never applies a mutation or changes another test's audit rows.
insert into public.write_conflicts (
  id,workspace_id,entity_type,entity_id,conflict_type,operation,
  client_revision,server_revision,client_payload
) values (
  'a1000000-0000-4000-8000-000000000779',
  'a1000000-0000-4000-8000-000000000011',
  'household_assets','a1000000-0000-4000-8000-000000000777',
  'revision','update',1,1,'{"name":"Deferred update"}'::jsonb
);
update public.workspaces set status='archived'
 where id='a1000000-0000-4000-8000-000000000011';
select extensions.is(
  public.reapply_conflict_transaction(
    'a1000000-0000-4000-8000-000000000779',
    'a1000000-0000-4000-8000-000000000001',1,
    '{"name":"Deferred update"}'::jsonb
  )->>'status','denied',
  'Archived workspace denies conflict reapply despite active owner membership');
select extensions.is(
  (select count(*)::int from public.write_conflicts
   where id='a1000000-0000-4000-8000-000000000779' and resolved_at is null),1,
  'Denied reapply does not close conflict');
select extensions.is(
  (select count(*)::int from public.audit_events
   where correlation_id='a1000000-0000-4000-8000-000000000779'),0,
  'Denied reapply does not create audit');
update public.workspaces set status='active'
 where id='a1000000-0000-4000-8000-000000000011';
select extensions.is(
  public.reapply_conflict_transaction(
    'a1000000-0000-4000-8000-000000000779',
    'a1000000-0000-4000-8000-000000000001',1,
    '{"name":"Deferred update"}'::jsonb,'Synthetic validation veto'
  )->>'status','invalid',
  'Active owner passes authorization and reaches validation without writing');
update public.workspace_memberships set role='viewer'
 where workspace_id='a1000000-0000-4000-8000-000000000011'
   and user_id='a1000000-0000-4000-8000-000000000001';
select extensions.is(
  public.reapply_conflict_transaction(
    'a1000000-0000-4000-8000-000000000779',
    'a1000000-0000-4000-8000-000000000001',1,
    '{"name":"Deferred update"}'::jsonb
  )->>'status','denied',
  'Viewer cannot replay conflicts after owner role revoked');
update public.workspace_memberships set role='owner'
 where workspace_id='a1000000-0000-4000-8000-000000000011'
   and user_id='a1000000-0000-4000-8000-000000000001';
select extensions.is(
  public.reapply_conflict_transaction(
    'a1000000-0000-4000-8000-000000000779',
    'a1000000-0000-4000-8000-000000000001',1,
    '{"name":"Deferred update"}'::jsonb,'Synthetic validation veto'
  )->>'status','invalid',
  'Restored owner reauthorizes conflict reapply');
select extensions.is(
  (select count(*)::int from public.audit_events
   where correlation_id='a1000000-0000-4000-8000-000000000779'),0,
  'Validation veto and denied replays leave no resolution audit');

-- A normal authenticated browser must never invoke the server transaction RPC.
select extensions.ok(
  not pg_catalog.has_function_privilege('authenticated',
    'public.apply_atomic_mutation(uuid,uuid,uuid,text,uuid,text,bigint,text,jsonb,jsonb,text)','EXECUTE'),
  'Atomic sync RPC is service-role only');

-- Fault injection: fail exactly when an audit row is inserted. The business
-- write and ledger must be rolled back in the same PostgreSQL transaction.
create or replace function public.gate2_test_reject_audit()
returns trigger language plpgsql as $trigger$
begin
  if new.entity_id = 'a1000000-0000-4000-8000-000000000555'::uuid then
    raise exception 'Injected audit failure';
  end if;
  return new;
end;
$trigger$;
create trigger gate2_test_reject_audit
before insert on public.audit_events
for each row execute function public.gate2_test_reject_audit();

select extensions.throws_ok($assert$
  select public.apply_atomic_mutation(
    'a1000000-0000-4000-8000-000000000556',
    'a1000000-0000-4000-8000-000000000011',
    'a1000000-0000-4000-8000-000000000001',
    'household_assets',
    'a1000000-0000-4000-8000-000000000555',
    'create',null,repeat('a',64),
    '{"name":"Audit fail asset","category":"appliance"}'::jsonb,
    '{"name":"Audit fail asset","category":"appliance","source":"manual","source_reference":null,"data_quality":"complete","confidence":"high","metadata":{}}'::jsonb
  )
$assert$,'P0001','Injected audit failure','Auditing failure aborts atomic mutation');
select extensions.is(
  (select count(*)::int from public.household_assets where id='a1000000-0000-4000-8000-000000000555'),0,
  'Audit failure rolls back the business row');
select extensions.is(
  (select count(*)::int from public.processed_mutations where mutation_id='a1000000-0000-4000-8000-000000000556'),0,
  'Audit failure rolls back the mutation ledger');
select extensions.is(
  (select count(*)::int from public.audit_events where correlation_id='a1000000-0000-4000-8000-000000000556'),0,
  'Audit failure leaves no partial audit');
drop trigger gate2_test_reject_audit on public.audit_events;
drop function public.gate2_test_reject_audit();

-- The privileged reapply RPC must not be callable by browser users.
select extensions.ok(
  not pg_catalog.has_function_privilege(
    'authenticated',
    'public.reapply_conflict_transaction(uuid,uuid,bigint,jsonb,text)','EXECUTE'
  ),'Reapply transaction is service-role only');

-- Inject failure specifically into the FINAL resolution audit (after the
-- nested business mutation, its ledger/audit, and the conflict closure).
-- All earlier work must roll back, leaving the conflict open for retry.
insert into public.write_conflicts (
  id,workspace_id,entity_type,entity_id,conflict_type,operation,
  client_revision,server_revision,client_payload
) values (
  'a1000000-0000-4000-8000-000000000661',
  'a1000000-0000-4000-8000-000000000011',
  'household_assets','a1000000-0000-4000-8000-000000000101',
  'revision','update',1,1,'{"name":"Never committed reapply"}'::jsonb
);
create or replace function public.gate2_test_reject_reapply_audit()
returns trigger language plpgsql as $reapply_trigger$
begin
  if new.action = 'write_conflict.reapply_client'
     and new.correlation_id = 'a1000000-0000-4000-8000-000000000661'::uuid then
    raise exception 'Injected resolution audit failure';
  end if;
  return new;
end;
$reapply_trigger$;
create trigger gate2_test_reject_reapply_audit
before insert on public.audit_events
for each row execute function public.gate2_test_reject_reapply_audit();

select extensions.throws_ok($check$
  select public.reapply_conflict_transaction(
    'a1000000-0000-4000-8000-000000000661',
    'a1000000-0000-4000-8000-000000000001',
    1,
    '{"name":"Never committed reapply"}'::jsonb
  )
$check$,'P0001','Injected resolution audit failure','Final resolution audit failure aborts whole reapply transaction');

select extensions.is((select revision::int from public.household_assets
  where id='a1000000-0000-4000-8000-000000000101'),1,
  'Reapply failure restores previous entity revision');
select extensions.is((select name from public.household_assets
  where id='a1000000-0000-4000-8000-000000000101'),'Asset A',
  'Reapply failure restores previous entity data');
select extensions.is((select count(*)::int from public.processed_mutations
  where entity_id='a1000000-0000-4000-8000-000000000101'),0,
  'Reapply failure rolls back nested processing ledger');
select extensions.is((select count(*)::int from public.audit_events
  where entity_id='a1000000-0000-4000-8000-000000000101'),0,
  'Reapply failure rolls back nested and final audit events');
select extensions.is((select count(*)::int from public.write_conflicts
  where id='a1000000-0000-4000-8000-000000000661'
    and resolved_at is null),1,
  'Reapply failure leaves the original conflict unresolved');

drop trigger gate2_test_reject_reapply_audit on public.audit_events;
drop function public.gate2_test_reject_reapply_audit();

-- Personal workspace bootstrap must never undo a deliberate suspended,
-- removed or downgraded membership. A single sign-in/RPC retry is NOT an
-- administrative reinstatement. This synthetic third user is isolated from
-- prior tenant fixtures and all test data rolls back.
insert into auth.users (id,instance_id,aud,role,email,created_at,updated_at)
values ('c3000000-0000-4000-8000-000000000003',
 '00000000-0000-0000-0000-000000000000',
 'authenticated','authenticated','uaf-rls-c@example.invalid',now(),now());
insert into public.workspaces (id,name,workspace_type,created_by)
values ('c3000000-0000-4000-8000-000000000033',
        'C Personal','personal','c3000000-0000-4000-8000-000000000003');
insert into public.workspace_memberships (workspace_id,user_id,role,status)
values ('c3000000-0000-4000-8000-000000000033',
        'c3000000-0000-4000-8000-000000000003','owner','active');

select set_config('request.jwt.claim.sub','c3000000-0000-4000-8000-000000000003',true);
set local role authenticated;
select extensions.is(
  (select workspace_id from public.ensure_personal_workspace()),
  'c3000000-0000-4000-8000-000000000033'::uuid,
  'Active personal owner can bootstrap idempotently');
reset role;
update public.workspace_memberships set status='suspended'
 where workspace_id='c3000000-0000-4000-8000-000000000033';
set local role authenticated;
select extensions.throws_ok(
  $bootstrap$select workspace_id from public.ensure_personal_workspace()$bootstrap$,
  '42501',null,
  'Suspended personal owner cannot reactivate via bootstrap');
reset role;
select extensions.is(
  (select status from public.workspace_memberships
   where workspace_id='c3000000-0000-4000-8000-000000000033'),
  'suspended','Suspended membership remains suspended');
update public.workspace_memberships set status='active',role='viewer'
 where workspace_id='c3000000-0000-4000-8000-000000000033';
set local role authenticated;
select extensions.throws_ok(
  $bootstrap$select workspace_id from public.ensure_personal_workspace()$bootstrap$,
  '42501',null,
  'Downgraded personal owner cannot regain owner via bootstrap');
reset role;
select extensions.is(
  (select role from public.workspace_memberships
   where workspace_id='c3000000-0000-4000-8000-000000000033'),
  'viewer','Downgraded viewer role remains unchanged');
update public.workspace_memberships set status='removed',role='owner'
 where workspace_id='c3000000-0000-4000-8000-000000000033';
set local role authenticated;
select extensions.throws_ok(
  $bootstrap$select workspace_id from public.ensure_personal_workspace()$bootstrap$,
  '42501',null,
  'Removed personal owner cannot reactivate via bootstrap');
reset role;
select extensions.is(
  (select status from public.workspace_memberships
   where workspace_id='c3000000-0000-4000-8000-000000000033'),
  'removed','Removed membership remains removed');
update public.workspace_memberships set status='active',role='owner'
 where workspace_id='c3000000-0000-4000-8000-000000000033';
set local role authenticated;
select extensions.is(
  (select workspace_id from public.ensure_personal_workspace()),
  'c3000000-0000-4000-8000-000000000033'::uuid,
  'Explicit administrative restoration permits original personal workspace');
reset role;
select extensions.is(
  (select count(*)::int from public.workspace_memberships
   where workspace_id='c3000000-0000-4000-8000-000000000033'
     and user_id='c3000000-0000-4000-8000-000000000003'),1,
  'Restoration preserves one membership without duplicate or replacement');

select set_config('request.jwt.claim.sub','',true);
set local role anon;
select extensions.throws_ok($$select id from public.household_assets$$,'42501');
select * from extensions.finish();
rollback;
