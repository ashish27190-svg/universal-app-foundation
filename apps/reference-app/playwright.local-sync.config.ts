import { defineConfig, devices } from '@playwright/test';

// Real disposable localhost PowerSync+Supabase connection; no hosted credentials.
export default defineConfig({
  testDir: './tests/local-sync',
  fullyParallel: false,
  timeout: 65_000,
  expect: { timeout: 30_000 },
  retries: 0,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'off',
    screenshot: 'off',
  },
  projects: [{ name: 'chromium-local-sync', use: { ...devices['Desktop Chrome'] } }],
});
