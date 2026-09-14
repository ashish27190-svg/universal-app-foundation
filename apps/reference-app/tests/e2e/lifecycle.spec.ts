import { expect, test } from '@playwright/test';
import { activeAssetCard, createAsset, deletedAssetCard, editAsset, hasE2ECredentials, signIn } from './helpers';

test.skip(!hasE2ECredentials, 'Set E2E_EMAIL and E2E_PASSWORD to run connected lifecycle tests.');

test('edit, soft-delete and restore remain reversible', async ({ page }) => {
  await signIn(page);
  const base = `Lifecycle ${Date.now()}`;
  const edited = `${base} edited`;

  await createAsset(page, base);
  await editAsset(page, base, edited);

  const active = activeAssetCard(page, edited);
  await active.getByRole('button', { name: 'Delete' }).click();
  await page.getByRole('dialog', { name: 'Delete asset?' }).getByRole('button', { name: 'Delete asset' }).click();
  await expect(activeAssetCard(page, edited)).toHaveCount(0);
  await expect(deletedAssetCard(page, edited)).toBeVisible();

  await deletedAssetCard(page, edited).getByRole('button', { name: 'Restore' }).click();
  await expect(activeAssetCard(page, edited)).toBeVisible();
  await expect(deletedAssetCard(page, edited)).toHaveCount(0);
});
