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
    // The status badge and conflict heading can both contain this text.
    // Assert the semantic heading and actionable controls without an ambiguous locator.
    await expect(pageA.getByRole('heading', { name: 'Needs attention' })).toBeVisible();
    await expect(pageA.getByRole('button', { name: 'Keep server version' })).toBeVisible();
    await expect(pageA.getByRole('button', { name: 'Review reapplication' })).toBeVisible();
    await pageA.getByRole('button', { name: 'Review reapplication' }).click();
    const review = pageA.getByRole('dialog', { name: 'Review conflicting changes' });
    await expect(review).toBeVisible();
    await expect(review.getByText('reviewed server revision')).toBeVisible();
    await expect(review.getByText(`${original} offline A`)).toBeVisible();
    await expect(review.getByText(`${original} online B`)).toBeVisible();
    await expect(review.getByRole('button', { name: 'Confirm reapply my version' })).toBeEnabled();
    await review.getByRole('button', { name: 'Cancel' }).click();

    // A deliberately unresolved conflict keeps the shared synthetic test
    // workspace in "Needs attention". Clear it after asserting the review UI
    // so later E2E journeys can truthfully expect a clean Synced state.
    const resolutionResponse = pageA.waitForResponse(
      (response) => {
        const url = new URL(response.url());
        return url.pathname === '/functions/v1/resolve-conflict' && response.request().method() === 'POST';
      },
      { timeout: 30_000 },
    );
    await pageA.getByRole('button', { name: 'Keep server version' }).click();
    // The section heading is always rendered, even with zero conflicts.
    // Check both the authenticated HTTP result and the actual empty state.
    expect((await resolutionResponse).status()).toBe(200);
    await expect(pageA.getByText('No unresolved conflicts.')).toBeVisible({ timeout: 30_000 });
    await waitForSynced(pageA);
    await expect(activeAssetCard(pageA, `${original} online B`)).toBeVisible();
  } finally {
    await Promise.all([contextA.close(), contextB.close()]);
  }
});
