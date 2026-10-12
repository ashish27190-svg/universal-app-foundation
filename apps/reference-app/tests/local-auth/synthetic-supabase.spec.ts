import { expect, test } from '@playwright/test';

const first = process.env.E2E_EMAIL;
const firstPassword = process.env.E2E_PASSWORD;
const second = process.env.E2E_SECOND_EMAIL;
const secondPassword = process.env.E2E_SECOND_PASSWORD;

test('real local Supabase Auth and personal workspace bootstrap bind SQLite to user A', async ({ browser }) => {
  expect(first).toBeTruthy();
  expect(firstPassword).toBeTruthy();
  const context = await browser.newContext({ serviceWorkers: 'block' });
  try {
    const page = await context.newPage();
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Household Vault' })).toBeVisible();
    await page.getByLabel('Email').fill(first!);
    await page.getByLabel('Password').fill(firstPassword!);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('heading', { name: 'Your assets' })).toBeVisible({ timeout: 60_000 });

    const firstContext = await page.evaluate(() => {
      const owner = localStorage.getItem('uaf.household-vault.local-owner.v1');
      const cache = localStorage.getItem('uaf.household-vault.confirmed-personal-workspace.v1');
      const parsed: unknown = cache ? JSON.parse(cache) : null;
      return { owner, cached: parsed };
    });
    expect(firstContext.owner).toBe(process.env.UAF_LOCAL_FIRST_USER_ID);
    expect(firstContext.cached).toBeTruthy();

    // Offline UX and data synchronization are NOT being asserted here.
    // Browser can sign in via the real Auth/RPC APIs without remote PowerSync.
  } finally {
    await context.close();
  }
});

test('two synthetic users receive different real server-confirmed workspaces', async ({ browser }) => {
  expect(second).toBeTruthy();
  expect(secondPassword).toBeTruthy();

  const auth = async (email: string, password: string) => {
    const context = await browser.newContext({ serviceWorkers: 'block' });
    try {
      const page = await context.newPage();
      await page.goto('/');
      await page.getByLabel('Email').fill(email);
      await page.getByLabel('Password').fill(password);
      await page.getByRole('button', { name: 'Sign in' }).click();
      await expect(page.getByRole('heading', { name: 'Your assets' })).toBeVisible({ timeout: 60_000 });
      return await page.evaluate(() => {
        const owner = localStorage.getItem('uaf.household-vault.local-owner.v1');
        const cache = localStorage.getItem('uaf.household-vault.confirmed-personal-workspace.v1');
        if (!cache) throw new Error('No server-confirmed workspace was persisted.');
        const saved = JSON.parse(cache) as {
          userId: string;
          context: { workspace: { id: string }; membership: { userId: string } };
        };
        return { owner, userId: saved.userId, workspaceId: saved.context.workspace.id,
                 memberUserId: saved.context.membership.userId };
      });
    } finally {
      await context.close();
    }
  };
  const a = await auth(first!, firstPassword!);
  const b = await auth(second!, secondPassword!);
  expect(a.owner).toBe(process.env.UAF_LOCAL_FIRST_USER_ID);
  expect(a.userId).toBe(a.owner);
  expect(a.memberUserId).toBe(a.owner);
  expect(b.owner).toBe(process.env.UAF_LOCAL_SECOND_USER_ID);
  expect(b.userId).toBe(b.owner);
  expect(b.memberUserId).toBe(b.owner);
  expect(a.workspaceId).not.toBe(b.workspaceId);
});
