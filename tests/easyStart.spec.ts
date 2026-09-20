// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';

// Real browser CAD worker and downloads; no network or geometry mocks.
test('a visitor can resize, undo and download all three examples', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'What would you like to make?' })).toBeVisible();
  for (const name of ['Phone stand', 'Bracket', 'Open box']) {
    await page.getByRole('button', { name, exact: true }).click();
    const downloadSTL = page.getByRole('button', { name: 'Download for 3D printing' });
    await expect(downloadSTL).toBeEnabled({ timeout: 45_000 });
    const width = page.getByRole('slider', { name: 'width', exact: true });
    const original = await width.inputValue();
    await width.focus();
    await width.press('End');
    await expect(width).toHaveValue('120');
    await expect(downloadSTL).toBeEnabled();
    const stlEvent = page.waitForEvent('download');
    await downloadSTL.click();
    const stl = await stlEvent;
    const mesh = await readFile((await stl.path())!);
    expect(mesh.byteLength).toBeGreaterThan(100);
    const geometry = new STLLoader().parse(new Uint8Array(mesh).buffer);
    geometry.computeBoundingBox();
    expect(geometry.boundingBox!.max.x - geometry.boundingBox!.min.x).toBeCloseTo(120, 3);
    geometry.dispose();
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    await expect(width).toHaveValue(original);
    const downloadSTEP = page.getByRole('button', { name: 'Download STEP', exact: true });
    await expect(downloadSTEP).toBeEnabled();
    const stepEvent = page.waitForEvent('download');
    await downloadSTEP.click();
    const step = await stepEvent;
    expect(await readFile((await step.path())!, 'utf8')).toContain('ISO-10303-21');
  }
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
