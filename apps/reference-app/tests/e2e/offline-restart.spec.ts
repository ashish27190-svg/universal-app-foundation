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
    await expect(pageA.evaluate(() => navigator.onLine)).resolves.toBe(false);
    await expect(pageA.getByRole('heading', { name: 'Your assets' })).toBeVisible();
    await expect(pageA.getByText('Offline', { exact: true })).toBeVisible();
    await expect(activeAssetCard(pageA, assetName)).toBeVisible();

    // Delay the membership RPC deliberately: reconnect must hide the editor
    // BEFORE the backend has confirmed that this user still owns the workspace.
    let unblockVerification = () => {};
    const verificationAllowed = new Promise<void>((resolve) => { unblockVerification = resolve; });
    await pageA.route('**/rest/v1/rpc/ensure_personal_workspace', async (route) => {
      await verificationAllowed;
      await route.continue();
    });
    const verificationRequest = pageA.waitForRequest(
      '**/rest/v1/rpc/ensure_personal_workspace',
      { timeout: 20_000 },
    );
    // Reconnect triggers a fresh workspace membership check, then reconnects
    // the saved SQLite mutations to the authenticated uploader.
    await contextA.setOffline(false);
    try {
      await verificationRequest;
      await expect(pageA.getByRole('heading', { name: 'Your assets' })).toHaveCount(0);
      await expect(pageA.getByRole('button', { name: 'Add asset' })).toHaveCount(0);
      await expect(pageA.getByText('Opening your local vault')).toBeVisible();
    } finally {
      unblockVerification();
      await pageA.unroute('**/rest/v1/rpc/ensure_personal_workspace');
    }
    await waitForSynced(pageA);
    await expect(pageA.getByRole('heading', { name: 'Your assets' })).toBeVisible();

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

test('offline edits without a reload cannot resume upload before membership is reverified', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await signIn(page);
    await waitForSynced(page);
    const assetName = 'Reconnect no reload ' + Date.now();
    await context.setOffline(true);
    await expect(page.getByText('Offline', { exact: true })).toBeVisible();
    await createAsset(page, assetName);

    let allowCheck = () => {};
    const checkCanComplete = new Promise<void>((resolve) => { allowCheck = resolve; });
    await page.route('**/rest/v1/rpc/ensure_personal_workspace', async (route) => {
      await checkCanComplete;
      await route.continue();
    });
    const request = page.waitForRequest('**/rest/v1/rpc/ensure_personal_workspace', { timeout: 20_000 });
    await context.setOffline(false);
    try {
      await request;
      await expect(page.getByRole('heading', { name: 'Your assets' })).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Add asset' })).toHaveCount(0);
      await expect(page.getByText('Opening your local vault')).toBeVisible();
    } finally {
      allowCheck();
      await page.unroute('**/rest/v1/rpc/ensure_personal_workspace');
    }
    await waitForSynced(page);
    await expect(activeAssetCard(page, assetName)).toBeVisible();
  } finally {
    await context.close();
  }
});
