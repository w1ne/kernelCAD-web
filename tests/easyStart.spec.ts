// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';

test('quick start opens editable parts inside the Studio', async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto('/');
  await expect(page.getByTestId('workbench-ready')).toBeVisible();
  await page.getByRole('button', { name: 'Quick start', exact: true }).click();
  for (const name of ['Phone stand', 'Bracket', 'Open box']) {
    await page.getByRole('button', { name, exact: true }).click();
    await expect(page.getByTestId('workbench-ready')).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Params', exact: true })).toBeEnabled({ timeout: 60_000 });
    await page.getByRole('tab', { name: 'Params', exact: true }).click();
    await expect(page.getByTestId('params-tab')).toContainText('width');
    await expect(page.getByTestId('params-tab')).toContainText('height');
    const width = page.getByRole('spinbutton', { name: 'width value', exact: true });
    await width.fill('120');
    const resized = page.waitForResponse(r => r.url().includes('/mesh') && r.request().method() === 'POST');
    await width.press('Enter');
    expect((await resized).ok()).toBe(true);
    await expect(width).toHaveValue('120');
    const downloadEvent = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export STL', exact: true }).click();
    const download = await downloadEvent;
    const bytes = await readFile((await download.path())!);
    const geometry = new STLLoader().parse(new Uint8Array(bytes).buffer);
    geometry.computeBoundingBox();
    expect(geometry.boundingBox!.max.x - geometry.boundingBox!.min.x).toBeCloseTo(120, 3);
    geometry.dispose();
  }
  await page.reload();
  await expect(page.getByTestId('workbench-ready')).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Params', exact: true })).toBeEnabled({ timeout: 60_000 });
});
