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
    retries: process.env.CI ? 2 : 0,
    workers: 1,
    reporter: 'html',
    use: {
        // Use IPv4 explicitly: in this sandbox, connecting to ::1 can fail with EPERM.
        baseURL: 'http://127.0.0.1:5173',
        trace: 'on-first-retry',
    },

    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],

    webServer: {
        command: 'npm run dev -- --host 127.0.0.1 --port 5173',
        url: 'http://127.0.0.1:5173',
        reuseExistingServer: !process.env.CI,
    },
});
