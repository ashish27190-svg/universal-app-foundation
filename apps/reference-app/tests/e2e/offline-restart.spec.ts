import { expect, test } from '@playwright/test';
import {
  activeAssetCard,
  createAsset,
  hasE2ECredentials,
  signIn,
  waitForSynced,
} from './helpers';

// Connected acceptance test: requires a REAL isolated staging Supabase + PowerSync.
// Do not pass this gate based on a unit-test mock or a development-mode Vite server.
test.skip(!hasE2ECredentials, 'Isolated staging E2E credentials are required.');

test('an offline asset survives browser reload and converges after reconnect', async ({ browser }) => {
  const contextA = await browser.newContext();
  const pageA = await contextA.newPage();
  try {
    await signIn(pageA);
    await waitForSynced(pageA);

    // First online load installs the PWA Service Worker. Reload so that a
    // controller exists before deliberately disconnecting the browser.
    await pageA.evaluate(async () => { await navigator.serviceWorker.ready; });
    await pageA.reload();
    await expect.poll(
      () => pageA.evaluate(() => Boolean(navigator.serviceWorker?.controller)),
      { timeout: 30_000, message: 'Production preview must be SW controlled for offline reload' },
    ).toBe(true);
    await expect(pageA.getByRole('heading', { name: 'Your assets' })).toBeVisible();

    const assetName = `Offline restart ${Date.now()}`;
    await contextA.setOffline(true);
    await expect(pageA.getByText('Offline', { exact: true })).toBeVisible();
    await createAsset(pageA, assetName);
    await pageA.reload({ waitUntil: 'domcontentloaded' });
    await expect(pageA.getByRole('heading', { name: 'Your assets' })).toBeVisible();
    await expect(activeAssetCard(pageA, assetName)).toBeVisible();

    await contextA.setOffline(false);
    await waitForSynced(pageA);

    // A fresh browser identity must receive the persisted Postgres record via
    // PowerSync, not merely see context A's local SQLite data.
    const contextB = await browser.newContext();
    try {
      const pageB = await contextB.newPage();
      await signIn(pageB);
      await expect(activeAssetCard(pageB, assetName)).toBeVisible({ timeout: 60_000 });
    } finally {
      await contextB.close();
    }
  } finally {
    await contextA.close();
  }
});
