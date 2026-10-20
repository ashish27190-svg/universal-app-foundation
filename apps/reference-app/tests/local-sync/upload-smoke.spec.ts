import { expect, test } from '@playwright/test';
import { createAsset } from '../e2e/helpers';

// Single disposable mutation test BEFORE the longer nine-journey suite.
// Never print response bodies, JWTs, query strings, usernames, or assets.
test('a synthetic local asset uploads and returns to Synced', async ({ page }) => {
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;
  expect(email).toBeTruthy();
  expect(password).toBeTruthy();

  const gatewayCodes: number[] = [];
  const localGateway = (raw: string) => {
    try {
      const url = new URL(raw);
      return url.origin === 'http://127.0.0.1:54321' &&
        url.pathname === '/functions/v1/sync-apply';
    } catch { return false; }
  };
  page.on('response', response => {
    if (localGateway(response.url())) gatewayCodes.push(response.status());
  });

  await page.goto('/');
  await page.getByLabel('Email').fill(email!);
  await page.getByLabel('Password').fill(password!);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { name: 'Your assets' })).toBeVisible({ timeout: 40_000 });
  await expect(page.getByText('Synced', { exact: true })).toBeVisible({ timeout: 30_000 });

  await createAsset(page, 'Synthetic local upload smoke');
  try {
    await expect(page.getByText('Synced', { exact: true })).toBeVisible({ timeout: 30_000 });
  } catch {
    await page.locator('details.vault-diagnostics > summary').click();
    const panel = page.locator('.vault-diagnostics-grid');
    await expect(panel).toBeVisible({ timeout: 10_000 });
    const diagnostics = (await panel.innerText())
      .replace(/Device suffix\s+\S+/g, 'Device suffix [redacted]');
    throw new Error('LOCAL_MUTATION_UPLOAD_FAILED: local HTTP gateway codes=' +
      JSON.stringify(gatewayCodes.slice(-12)) + '; diagnostics=' + diagnostics.slice(0, 650));
  }
  expect(gatewayCodes.some(code => code === 200)).toBe(true);
});
