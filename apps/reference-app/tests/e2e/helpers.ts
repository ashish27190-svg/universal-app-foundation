import { expect, type Page } from '@playwright/test';

export const e2eEmail = process.env.E2E_EMAIL;
export const e2ePassword = process.env.E2E_PASSWORD;
export const hasE2ECredentials = Boolean(e2eEmail && e2ePassword);

export async function signIn(page: Page) {
  await page.goto('/');
  await page.getByLabel('Email').fill(e2eEmail ?? '');
  await page.getByLabel('Password').fill(e2ePassword ?? '');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { name: 'Your assets' })).toBeVisible();
}

export function activeAssetCard(page: Page, name: string) {
  return page.locator('[data-asset-lifecycle="active"]', { hasText: name });
}

export function deletedAssetCard(page: Page, name: string) {
  return page.locator('[data-asset-lifecycle="deleted"]', { hasText: name });
}

export async function createAsset(page: Page, name: string) {
  await page.getByRole('button', { name: 'Add asset' }).click();
  await page.getByLabel('Asset name').fill(name);
  await page.getByLabel('Category').selectOption('electronics');
  await page.getByRole('button', { name: 'Save asset' }).click();
  await expect(activeAssetCard(page, name)).toBeVisible();
}

export async function editAsset(page: Page, currentName: string, nextName: string) {
  const card = activeAssetCard(page, currentName);
  await expect(card).toBeVisible();
  await card.getByRole('button', { name: 'Edit' }).click();
  const dialog = page.getByRole('dialog', { name: 'Edit asset' });
  await dialog.getByLabel('Asset name').fill(nextName);
  await dialog.getByRole('button', { name: 'Save changes' }).click();
  await expect(activeAssetCard(page, nextName)).toBeVisible();
}

export async function waitForSynced(page: Page) {
  await expect(page.getByText('Synced', { exact: true })).toBeVisible({ timeout: 45_000 });
}
