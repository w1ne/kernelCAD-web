import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './tests',
    // Keep e2e and unit tests separate: Vitest tests use `*.test.ts` and must not
    // be picked up by Playwright (its runner has a different `expect`).
    testMatch: '**/*.spec.ts',
    // The app (OpenCascade/meshing/WebGL) is CPU/IO heavy; running many browsers
    // in parallel is flaky and starves the dev server. Keep runs deterministic.
    fullyParallel: false,
    forbidOnly: !!process.env.CI,
    retries: 0,
    workers: 1,
    reporter: 'html',
    use: {
        // Use a dedicated IPv4 port for e2e to avoid collisions with local dev sessions.
        baseURL: 'http://127.0.0.1:4173',
        trace: 'retain-on-failure',
    },

    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],

    webServer: process.env.PW_SKIP_WEBSERVER
        ? undefined
        : {
            command: 'npm run dev -- --host 127.0.0.1 --port 4173',
            url: 'http://127.0.0.1:4173',
            reuseExistingServer: true,
        },
});
