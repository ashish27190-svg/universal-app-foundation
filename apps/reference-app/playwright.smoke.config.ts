import { defineConfig, devices } from '@playwright/test';

/**
 * Hermetic preflight: a production-built localhost PWA with synthetic
 * build-time URLs and NO accounts, hosted Supabase, or hosted PowerSync.
 * These tests prove only pre-auth browser initialization / tab isolation.
 */
export default defineConfig({
  testDir: './tests/smoke',
  fullyParallel: false,
  timeout: 45_000,
  retries: 0,
  expect: { timeout: 15_000 },
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'off',
    screenshot: 'off',
  },
  projects: [{ name: 'chromium-smoke', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'pnpm exec vite preview --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173/',
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
