import { expect, test } from '@playwright/test';
import { e2eEmail, e2ePassword, hasE2ECredentials } from './helpers';

// Requires the REAL SSO-protected staging site and a synthetic test account.
test.skip(!hasE2ECredentials, 'Dedicated private staging E2E account required.');

test('online bootstrap holds SQLite lease before verifying workspace or starting sync', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  let unblockVerification = () => {};
  const allowVerification = new Promise<void>((resolve) => { unblockVerification = resolve; });
  try {
    await page.goto('/');
    await page.route('**/rest/v1/rpc/ensure_personal_workspace', async (route) => {
      await allowVerification;
      await route.continue();
    });
    const verifyRequest = page.waitForRequest(
      '**/rest/v1/rpc/ensure_personal_workspace',
      { timeout: 30_000 },
    );
    await page.getByLabel('Email').fill(e2eEmail!);
    await page.getByLabel('Password').fill(e2ePassword!);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await verifyRequest;

    // A single exclusive SQLite lease must exist BEFORE Supabase workspace
    // verification, because the PowerSync constructor starts database init.
    // The editor and remote PowerSync uploader must still be unavailable
    // until server membership has been confirmed.
    await expect(page.getByRole('heading', { name: 'Your assets' })).toHaveCount(0);
    const hasLocalLease = await page.evaluate(async () => {
      const locks = await navigator.locks.query();
      return locks.held?.some((item) =>
        item.name === 'uaf.household-vault.sqlite.exclusive.v1') ?? false;
    });
    expect(hasLocalLease).toBe(true);
  } finally {
    unblockVerification();
    await page.unroute('**/rest/v1/rpc/ensure_personal_workspace');
  }
  try {
    await expect(page.getByRole('heading', { name: 'Your assets' })).toBeVisible({ timeout: 60_000 });
    const hasLocalLease = await page.evaluate(async () => {
      const locks = await navigator.locks.query();
      return locks.held?.some((item) =>
        item.name === 'uaf.household-vault.sqlite.exclusive.v1') ?? false;
    });
    expect(hasLocalLease).toBe(true);
  } finally {
    await context.close();
  }
});
