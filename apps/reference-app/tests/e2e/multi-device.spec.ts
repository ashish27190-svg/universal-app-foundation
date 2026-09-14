import { expect, test } from '@playwright/test';
import { activeAssetCard, createAsset, hasE2ECredentials, signIn, waitForSynced } from './helpers';

test.skip(!hasE2ECredentials, 'Set E2E_EMAIL and E2E_PASSWORD to run connected multi-device tests.');

test('a record created on device A converges onto device B', async ({ browser }) => {
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();
  try {
    await Promise.all([signIn(pageA), signIn(pageB)]);
    const name = `Convergence ${Date.now()}`;
    await createAsset(pageA, name);
    await waitForSynced(pageA);
    await expect(activeAssetCard(pageB, name)).toBeVisible({ timeout: 45_000 });
  } finally {
    await Promise.all([contextA.close(), contextB.close()]);
  }
});
