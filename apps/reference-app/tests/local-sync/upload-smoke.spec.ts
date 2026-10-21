import { expect, test } from '@playwright/test';
import { createAsset } from '../e2e/helpers';

// Single disposable mutation test BEFORE the longer nine-journey suite.
// Never print response bodies, JWTs, query strings, usernames, or assets.
test('a synthetic local asset uploads and returns to Synced', async ({ page, request }) => {
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

  // A harmless authenticated zero-mutation POST isolates browser-to-Edge
  // transport and JWT policy. Do NOT log, attach, or persist the token.
  // The same local synthetic account is used by the UI, but this probe
  // does not mutate data or bypass any authentication.
  const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  expect(publishableKey).toBeTruthy();
  const sessionResponse = await request.post('http://127.0.0.1:54321/auth/v1/token?grant_type=password', {
    headers: { apikey: publishableKey!, 'Content-Type': 'application/json' },
    data: { email, password },
  });
  expect(sessionResponse.status(), 'synthetic local JWT issued').toBe(200);
  const syntheticToken: unknown = (await sessionResponse.json() as Record<string, unknown>).access_token;
  expect(typeof syntheticToken).toBe('string');

  const browserGateway = await page.evaluate(async (token) => {
    try {
      const response = await fetch('http://127.0.0.1:54321/functions/v1/sync-apply', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ protocolVersion: 1, mutations: [] }),
      });
      return { status: response.status, transportFailure: false };
    } catch {
      return { status: 0, transportFailure: true };
    }
  }, syntheticToken as string);
  expect(browserGateway, 'no-write browser gateway probe (status only)').toEqual({
    status: 200, transportFailure: false,
  });

  await createAsset(page, 'Synthetic local upload smoke');
  try {
    await expect.poll(() => gatewayCodes.some(code => code === 200), { timeout: 30_000 })
      .toBe(true);
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
});
