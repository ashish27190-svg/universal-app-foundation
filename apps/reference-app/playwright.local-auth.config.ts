import { defineConfig, devices } from '@playwright/test';

// Real local Supabase Auth/RPC, real Chromium, real local SQLite.
// PowerSync streaming is intentionally NOT configured in this gate.
export default defineConfig({
  testDir: './tests/local-auth',
  fullyParallel: false,
  timeout: 90_000,
  expect: { timeout: 40_000 },
  retries: 0,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'off',
    screenshot: 'off',
  },
  projects: [{ name: 'chromium-local-auth', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'pnpm exec vite preview --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173/',
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
