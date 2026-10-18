import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: ['gallery_smoke.spec.ts', 'gallery_lightbox.spec.ts', 'homepage_hero_prompt.spec.ts', 'landing_refresh.spec.ts'],
  fullyParallel: false,
  workers: 1,
  use: { baseURL: 'http://127.0.0.1:8000', trace: 'on-first-retry' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run site:dev',
    url: 'http://127.0.0.1:8000',
    reuseExistingServer: !process.env.CI,
    // site:dev runs the full marketing build before serving; a cold build
    // takes ~11 min on a laptop and can be slower on CI runners.
    timeout: 1_200_000,
  },
});
