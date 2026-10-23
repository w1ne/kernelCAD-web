// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Click-to-frame benchmark of in-browser parameter edits, run against a
// PRODUCTION build (`VITE_BASE_PATH=/ npx vite build` first) served by
// `vite preview`. Reports timings; never fails on them (see the spec).
import { defineConfig, devices } from '@playwright/test';

const port = 4317;
/** Measure an already-running build instead of starting `vite preview`. */
const external = process.env.PARAM_PERF_BASE_URL;

export default defineConfig({
  testDir: './tests/perf',
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: Number(process.env.PARAM_PERF_TEST_TIMEOUT_MS ?? 120_000),
  reporter: [['list']],
  outputDir: 'test-results/perf',
  use: {
    baseURL: external ?? `http://127.0.0.1:${port}`,
    trace: 'off',
    viewport: { width: 1400, height: 900 },
    // CI renders with SwiftShader (software GL: ~50 ms of main thread per
    // frame on the fixture). PARAM_PERF_GPU=1 asks for the hardware GPU
    // (ANGLE Metal on macOS) for local desktop-like numbers.
    ...(process.env.PARAM_PERF_GPU === '1'
      ? { launchOptions: { args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] } }
      : {}),
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: external ? undefined : {
    command: `npx vite preview --host 127.0.0.1 --port ${port} --strictPort`,
    url: `http://127.0.0.1:${port}/studio`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
