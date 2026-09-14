import { expect, test } from '@playwright/test';
import { activeAssetCard, createAsset, editAsset, hasE2ECredentials, signIn, waitForSynced } from './helpers';

test.skip(!hasE2ECredentials, 'Set E2E_EMAIL and E2E_PASSWORD to run connected conflict tests.');

test('stale offline edit is surfaced instead of silently overwriting the server', async ({ browser }) => {
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();
  try {
    await Promise.all([signIn(pageA), signIn(pageB)]);
    const original = `Conflict ${Date.now()}`;
    await createAsset(pageA, original);
    await waitForSynced(pageA);
    await expect(activeAssetCard(pageB, original)).toBeVisible({ timeout: 45_000 });

    await contextA.setOffline(true);
    await expect(pageA.getByText('Offline', { exact: true })).toBeVisible();
    await editAsset(pageA, original, `${original} offline A`);

    await editAsset(pageB, original, `${original} online B`);
    await waitForSynced(pageB);

    await contextA.setOffline(false);
    await expect(pageA.getByText('Needs attention', { exact: true })).toBeVisible({ timeout: 60_000 });
    await expect(pageA.getByRole('heading', { name: 'Needs attention' })).toBeVisible();
    await expect(pageA.getByRole('button', { name: 'Keep server version' })).toBeVisible();
    await expect(pageA.getByRole('button', { name: 'Reapply my version' })).toBeVisible();
  } finally {
    await Promise.all([contextA.close(), contextB.close()]);
  }
});
