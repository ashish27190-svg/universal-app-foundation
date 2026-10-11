import { expect, test } from '@playwright/test';

const LOCK_NAME = 'uaf.household-vault.sqlite.exclusive.v1';

test('production-built PWA acquires exclusive SQLite lock before auth; second tab blocked', async ({ browser }) => {
  const context = await browser.newContext({ serviceWorkers: 'block' });
  try {
    // Synthetic test endpoints must never resolve or receive credentials.
    await context.route('https://uaf-smoke.invalid/**', (route) => route.abort());
    await context.route('https://powersync-smoke.invalid/**', (route) => route.abort());

    const first = await context.newPage();
    await first.goto('/');
    await expect(first.getByRole('heading', { name: 'Household Vault' })).toBeVisible();
    await expect.poll(async () => first.evaluate(async () => {
      const locks = await navigator.locks.query();
      return locks.held?.some((lock) => lock.name === LOCK_NAME) ?? false;
    })).toBe(true);

    const second = await context.newPage();
    await second.goto('/');
    await expect(second.getByRole('alert')).toContainText('already open in another tab');
    await expect(second.getByRole('heading', { name: 'Household Vault' })).toHaveCount(0);

    // Closing the owning page releases the document-wide Web Lock. The
    // second tab may then initialize its *own* database only on reload.
    await first.close();
    await second.reload();
    await expect(second.getByRole('heading', { name: 'Household Vault' })).toBeVisible();
    await expect.poll(async () => second.evaluate(async () => {
      const locks = await navigator.locks.query();
      return locks.held?.some((lock) => lock.name === LOCK_NAME) ?? false;
    })).toBe(true);
  } finally {
    await context.close();
  }
});

test('browser missing Web Locks refuses to import PowerSync or render vault', async ({ browser }) => {
  const context = await browser.newContext({ serviceWorkers: 'block' });
  try {
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'locks', {
        configurable: true,
        value: undefined,
      });
    });
    const page = await context.newPage();
    await page.goto('/');
    await expect(page.getByRole('alert')).toContainText('supporting Web Locks');
    await expect(page.getByRole('heading', { name: 'Household Vault' })).toHaveCount(0);
  } finally {
    await context.close();
  }
});
