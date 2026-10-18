// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Dedicated Playwright config for the browser-kernel routing E2E.
//
// Why a second config: the spec must run the app in HOSTED mode
// (`VITE_HOSTED_MESH=1`, `VITE_API_BASE_URL` pointing at its own dev server),
// because the browser-kernel warm-on-open seams live on the hosted paths.
// The default `playwright.config.ts` starts a plain dev server, so its specs
// must not pick this one up — hence the distinct `.e2e.ts` suffix here versus
// the default config's `**/*.spec.ts`.
import { defineConfig, devices } from '@playwright/test';

const PORT = 5178;
const ORIGIN = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.e2e.ts',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: ORIGIN,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npm run dev -- --host 127.0.0.1 --port ${PORT} --strictPort`,
    url: ORIGIN,
    reuseExistingServer: !process.env.CI,
    env: {
      VITE_HOSTED_MESH: '1',
      VITE_API_BASE_URL: ORIGIN,
    },
  },
});
