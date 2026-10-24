import { expect, type Page } from '@playwright/test';

export const e2eEmail = process.env.E2E_EMAIL;
export const e2ePassword = process.env.E2E_PASSWORD;
export const hasE2ECredentials = Boolean(e2eEmail && e2ePassword);

export async function signIn(page: Page, credentials?: { email: string; password: string }) {
  await page.goto('/');
  await page.getByLabel('Email').fill(credentials?.email ?? e2eEmail ?? '');
  await page.getByLabel('Password').fill(credentials?.password ?? e2ePassword ?? '');
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
  // The empty state and page toolbar both show this action; choose toolbar deterministically.
  await page.locator('.vault-section-heading').getByRole('button', { name: 'Add asset' }).click();
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
  try {
    await expect(page.getByText('Synced', { exact: true })).toBeVisible({ timeout: 45_000 });
  } catch {
    // A missing badge alone cannot distinguish a broken connection from a
    // pending upload, an authorization denial, or a stale UI. Read only the
    // existing privacy-safe diagnostics; never export raw SDK errors, URLs,
    // tokens, account identifiers, or domain records into public CI logs.
    let status = 'unavailable';
    let diagnostics = 'unavailable';
    try {
      status =
        (await page.locator('.uaf-sync-status').textContent({ timeout: 3_000 }))?.trim() ??
        'missing';
      const details = page.locator('details.vault-diagnostics');
      if (await details.count()) {
        if (!(await details.evaluate((element) => (element as HTMLDetailsElement).open))) {
          await details.locator('summary').click({ timeout: 3_000 });
        }
        const grid = details.locator('.vault-diagnostics-grid');
        await expect(grid).toBeVisible({ timeout: 10_000 });
        const allowedFields = [
          'Sync state',
          'Sync error category',
          'Pending writes',
          'Unresolved conflicts',
          'Connected',
          'Initial sync complete',
        ];
        const values = await grid.evaluate((element, labels) => {
          return Array.from(element.querySelectorAll('div')).flatMap((row) => {
            const key = row.querySelector('dt')?.textContent?.trim();
            const value = row.querySelector('dd')?.textContent?.trim();
            return key && value && labels.includes(key) ? [`${key}=${value}`] : [];
          });
        }, allowedFields);
        diagnostics = values.join('; ') || 'empty';
      }
    } catch {
      diagnostics = 'diagnostics unavailable';
    }
    throw new Error(`CONNECTED_SYNC_TIMEOUT: badge=${status}; ${diagnostics}`);
  }
}
