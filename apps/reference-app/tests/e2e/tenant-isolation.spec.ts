import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { activeAssetCard, createAsset, signIn, waitForSynced } from './helpers';

const secondEmail = process.env.E2E_SECOND_EMAIL;
const secondPassword = process.env.E2E_SECOND_PASSWORD;
const firstEmail = process.env.E2E_EMAIL;
const firstPassword = process.env.E2E_PASSWORD;

test.skip(
  !secondEmail || !secondPassword || !firstEmail || !firstPassword,
  'Two separate synthetic staging accounts are required.',
);

test('two users see their own synchronized assets, never the other user assets', async ({ browser }) => {
  expect(firstEmail!.trim().toLowerCase()).not.toBe(secondEmail!.trim().toLowerCase());
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  try {
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();
    await Promise.all([
      signIn(pageA),
      signIn(pageB, { email: secondEmail!, password: secondPassword! }),
    ]);

    const aName = 'Isolated asset A ' + randomUUID().slice(0, 8);
    const bName = 'Isolated asset B ' + randomUUID().slice(0, 8);
    await createAsset(pageA, aName);
    await waitForSynced(pageA);
    await createAsset(pageB, bName);
    await waitForSynced(pageB);

    // Fresh browser contexts force a new local SQLite cache and a backend
    // sync. This avoids treating an empty/not-yet-synced page as isolation.
    const verifyA = await browser.newContext();
    const verifyB = await browser.newContext();
    try {
      const checkA = await verifyA.newPage();
      const checkB = await verifyB.newPage();
      await Promise.all([
        signIn(checkA),
        signIn(checkB, { email: secondEmail!, password: secondPassword! }),
      ]);
      await expect(activeAssetCard(checkA, aName)).toBeVisible({ timeout: 60_000 });
      await expect(activeAssetCard(checkB, bName)).toBeVisible({ timeout: 60_000 });
      await waitForSynced(checkA);
      await waitForSynced(checkB);
      await expect(activeAssetCard(checkA, bName)).toHaveCount(0);
      await expect(activeAssetCard(checkB, aName)).toHaveCount(0);
    } finally {
      await Promise.all([verifyA.close(), verifyB.close()]);
    }
  } finally {
    await Promise.all([contextA.close(), contextB.close()]);
  }
});
