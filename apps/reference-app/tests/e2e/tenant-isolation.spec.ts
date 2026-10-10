import { randomUUID } from 'node:crypto';
import { expect, test, type APIRequestContext } from '@playwright/test';
import { activeAssetCard, createAsset, signIn, waitForSynced } from './helpers';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const firstEmail = process.env.E2E_EMAIL;
const firstPassword = process.env.E2E_PASSWORD;
const secondEmail = process.env.E2E_SECOND_EMAIL;
const secondPassword = process.env.E2E_SECOND_PASSWORD;

test.skip(
  !supabaseUrl || !publishableKey || !firstEmail || !firstPassword ||
  !secondEmail || !secondPassword,
  'Two isolated staging test identities and the expected UAF Supabase URL are required.',
);

type TestAuth = { access_token: string; user: { id: string } };

async function passwordSession(request: APIRequestContext, email: string, password: string): Promise<TestAuth> {
  const response = await request.post(new URL('/auth/v1/token?grant_type=password', supabaseUrl), {
    data: { email, password },
    headers: { apikey: publishableKey! },
  });
  expect(response.ok(), 'Synthetic staging user can sign in to isolated UAF Supabase').toBeTruthy();
  const value = await response.json() as TestAuth;
  expect(value.access_token).toBeTruthy();
  expect(value.user?.id).toBeTruthy();
  return value;
}

async function scopedRows(
  request: APIRequestContext,
  table: string,
  token: string,
  filters: Record<string,string>,
): Promise<Array<Record<string, unknown>>> {
  const url = new URL('/rest/v1/' + table, supabaseUrl);
  url.searchParams.set('select', '*');
  for (const [key, value] of Object.entries(filters)) url.searchParams.set(key, value);
  const response = await request.get(url.toString(), {
    headers: { apikey: publishableKey!, Authorization: 'Bearer ' + token },
  });
  expect(response.ok(), 'RLS-scoped read to ' + table).toBeTruthy();
  return await response.json() as Array<Record<string,unknown>>;
}

test('two real identities are isolated by workspace RLS and the Edge mutation gateway', async ({ browser, request }) => {
  expect(firstEmail!.toLowerCase()).not.toBe(secondEmail!.toLowerCase());

  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  try {
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    await Promise.all([
      signIn(pageA),
      signIn(pageB, { email: secondEmail!, password: secondPassword! }),
    ]);

    const [authA,authB] = await Promise.all([
      passwordSession(request,firstEmail!,firstPassword!),
      passwordSession(request,secondEmail!,secondPassword!),
    ]);

    const [aWorkspaces,bWorkspaces] = await Promise.all([
      scopedRows(request,'workspaces',authA.access_token,{
        created_by:'eq.'+authA.user.id,workspace_type:'eq.personal',status:'eq.active',
      }),
      scopedRows(request,'workspaces',authB.access_token,{
        created_by:'eq.'+authB.user.id,workspace_type:'eq.personal',status:'eq.active',
      }),
    ]);
    expect(aWorkspaces).toHaveLength(1);
    expect(bWorkspaces).toHaveLength(1);
    const aWorkspaceId = aWorkspaces[0]?.id as string;
    const bWorkspaceId = bWorkspaces[0]?.id as string;
    expect(aWorkspaceId).not.toBe(bWorkspaceId);

    const assetName = 'Tenant isolation A ' + randomUUID().slice(0,8);
    await createAsset(pageA,assetName);
    await waitForSynced(pageA);
    await expect.poll(async () => {
      const ownRows=await scopedRows(request,'household_assets',authA.access_token,{
        workspace_id:'eq.'+aWorkspaceId,
      });
      return ownRows.some(row=>row.name===assetName);
    },{ timeout:60_000 }).toBe(true);

    expect(await scopedRows(request,'workspaces',authB.access_token,{
      id:'eq.'+aWorkspaceId,
    })).toHaveLength(0);

    expect(await scopedRows(request,'household_assets',authB.access_token,{
      workspace_id:'eq.'+aWorkspaceId,
    })).toHaveLength(0);

    const prohibitedId=randomUUID();
    const rejected=await request.post(new URL('/functions/v1/sync-apply',supabaseUrl),{
      headers:{apikey:publishableKey!,Authorization:'Bearer '+authB.access_token},
      data:{
        protocolVersion:1,
        mutations:[{
          protocolVersion:1,mutationId:randomUUID(),
          clientDatabaseId:'e2e-isolation-test',clientOperationId:1,
          workspaceId:aWorkspaceId,entityType:'household_assets',
          entityId:prohibitedId,operation:'create',expectedRevision:null,
          payload:{name:'Forbidden tenant write',category:'electronics'},
        }],
      },
    });
    expect(rejected.status()).toBe(200);
    const payload=await rejected.json() as {outcomes?: Array<{status:string}>};
    expect(payload.outcomes?.[0]?.status).toBe('rejected');

    const forbiddenRows=await scopedRows(request,'household_assets',authA.access_token,{
      id:'eq.'+prohibitedId,
    });
    expect(forbiddenRows).toHaveLength(0);

    const assetB = 'Tenant isolation B ' + randomUUID().slice(0,8);
    await createAsset(pageB,assetB);
    await waitForSynced(pageB);
    await expect.poll(async()=>{
      const own=await scopedRows(request,'household_assets',authB.access_token,{
        workspace_id:'eq.'+bWorkspaceId,
      });
      return own.some(row=>row.name===assetB);
    },{ timeout:60_000 }).toBe(true);

    expect(await scopedRows(request,'household_assets',authA.access_token,{
      workspace_id:'eq.'+bWorkspaceId,
    })).toHaveLength(0);
    await expect(activeAssetCard(pageB,assetName)).toHaveCount(0);
    await expect(activeAssetCard(pageA,assetB)).toHaveCount(0);
  } finally {
    await Promise.all([contextA.close(),contextB.close()]);
  }
});
