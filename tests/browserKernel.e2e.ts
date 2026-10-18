// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Browser-kernel routing E2E: a param edit on a warm in-browser kernel must
// update the model with ZERO `/__kernelcad/mesh` POSTs; the same edit with
// `?kernel=off` must hit the server (control).
//
// Runs under `playwright.browser-kernel.config.ts` (hosted-mode dev server),
// NOT the default config — see that file's header.
import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const FIXTURE_PATH = fileURLToPath(new URL('./fixtures/browser-kernel/param-box.kcad.ts', import.meta.url));
const FIXTURE_SOURCE = readFileSync(FIXTURE_PATH, 'utf8');
const SLUG = 'e2e-param-box';

interface KernelEvent {
  type: string;
  ms?: number;
  bytes?: number;
  featureCount?: number;
}

/** Wait until `check` returns true, polling; fails the test on timeout. */
async function waitFor(check: () => boolean, timeoutMs: number, what: string): Promise<void> {
  const started = Date.now();
  while (!check()) {
    if (Date.now() - started > timeoutMs) throw new Error(`timed out waiting for ${what}`);
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
}

test.describe('browser kernel routing', () => {
  test('param edit runs in the warm kernel with no mesh POST; kernel=off hits the server', async ({ page }) => {
    test.setTimeout(600_000);

    const kernelEvents: KernelEvent[] = [];
    page.on('console', (msg) => {
      if (!msg.text().includes('[kernel]')) return;
      void msg.args()[1]?.jsonValue().then((value) => kernelEvents.push(value as KernelEvent)).catch(() => undefined);
    });

    let meshPosts = 0;
    await page.route('**/__kernelcad/mesh**', async (route) => {
      if (route.request().method() === 'POST') meshPosts += 1;
      await route.continue();
    });
    // Hermetic gallery: one fixture entry; the fixture source is fulfilled from
    // disk; precomputes 404 so the initial paint uses the server mesh.
    await page.route('**/gallery.json', (route) => route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        entries: [{ slug: SLUG, sourceUrl: '/gallery/e2e/param-box.kcad.ts', title: 'E2E Param Box', scriptPath: null }],
      }),
    }));
    await page.route('**/gallery/e2e/param-box.kcad.ts', (route) => route.fulfill({
      contentType: 'text/plain',
      body: FIXTURE_SOURCE,
    }));
    await page.route('**/gallery/_mesh/**', (route) => route.fulfill({ status: 404, body: '' }));

    // --- Kernel ON: warm, then edit with zero mesh POSTs.
    await page.goto(`/studio?gallery=${SLUG}&kernel=force`);
    await page.getByTestId('workbench-ready').waitFor({ timeout: 120_000 });
    await page.getByRole('tab', { name: 'Params', exact: true }).click();
    await page.getByTestId('param-row-w').waitFor({ timeout: 120_000 });

    // The starter (3 feature records) can warm before the gallery source
    // arrives and is swapped in; wait for the FIXTURE's own build (1 record)
    // so the edit under test is dispatched against a warm gallery kernel.
    await waitFor(
      () => kernelEvents.some((event) => event.type === 'build' && event.featureCount === 1),
      240_000,
      'fixture kernel warm build',
    );
    const postsBeforeEdit = meshPosts;

    const input = page.getByTestId('scrub-input-w');
    await input.click();
    await input.fill('16');
    await input.press('Enter');

    await waitFor(() => kernelEvents.some((event) => event.type === 'params'), 120_000, 'kernel params event');

    const paramsEvent = kernelEvents.find((event) => event.type === 'params');
    expect(paramsEvent?.bytes ?? 0).toBeGreaterThan(0);
    expect(meshPosts).toBe(postsBeforeEdit);

    // --- Kernel OFF control: the same edit must reach the server.
    await page.goto(`/studio?gallery=${SLUG}&kernel=off`);
    await page.getByTestId('workbench-ready').waitFor({ timeout: 120_000 });
    await page.getByRole('tab', { name: 'Params', exact: true }).click();
    await page.getByTestId('param-row-w').waitFor({ timeout: 120_000 });

    const postsBeforeOffEdit = meshPosts;
    const inputOff = page.getByTestId('scrub-input-w');
    await inputOff.click();
    await inputOff.fill('17');
    await inputOff.press('Enter');

    await waitFor(() => meshPosts > postsBeforeOffEdit, 120_000, 'server mesh POST for the kernel=off edit');
  });
});
