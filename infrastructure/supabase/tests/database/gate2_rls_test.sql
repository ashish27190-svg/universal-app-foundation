-- Disposable UAF local Gate-2 RLS test; never run against a linked production project.
begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(22);

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

select set_config('request.jwt.claim.sub','b2000000-0000-4000-8000-000000000002',true);
select extensions.is((select count(*)::int from public.household_assets where workspace_id='b2000000-0000-4000-8000-000000000022'),1,'B can see B asset');
select extensions.is((select count(*)::int from public.workspaces where id='a1000000-0000-4000-8000-000000000011'),0,'B cannot read A workspace');

reset role;
select set_config('request.jwt.claim.sub','',true);
set local role anon;
select extensions.throws_ok($$select id from public.household_assets$$,'42501');
select * from extensions.finish();
rollback;
