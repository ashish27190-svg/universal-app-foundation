import { expect, test } from '@playwright/test';

test('the real local PowerSync handshake reaches synced without a hosted service', async ({ page }) => {
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;
  expect(email).toBeTruthy();
  expect(password).toBeTruthy();

  await page.goto('/');
  await page.getByLabel('Email').fill(email!);
  await page.getByLabel('Password').fill(password!);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { name: 'Your assets' })).toBeVisible();

  try {
    await expect(page.getByText('Synced', { exact: true })).toBeVisible({ timeout: 30_000 });
  } catch {
    // These are pre-existing privacy-safe diagnostic fields: no JWT, user
    // email, password or asset record is exported to public CI logs.
    const badge = (await page.locator('.uaf-sync-status').textContent())?.trim() ?? 'unknown';
    await page.locator('details.vault-diagnostics > summary').click();
    const diagnostics = page.locator('.vault-diagnostics-grid');
    await expect(diagnostics).toBeVisible({ timeout: 10_000 });
    const state = (await diagnostics.innerText()).replace(/Device suffix\s+\S+/g, 'Device suffix [redacted]');
    throw new Error('LOCAL_POWERSYNC_HANDSHAKE_FAILED: status=' + badge + '; diagnostics=' + state.slice(0, 550));
  }
});
