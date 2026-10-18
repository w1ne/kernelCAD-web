// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// tests/e2e/bom-order-flow.spec.ts
//
// End-to-end: design → BOM Parts tab → Order sheet → order-pack downloads.
// Runs against the dev server with `?script=` pointing at a real assembly.
import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { unzipSync, strFromU8 } from 'fflate';

const SCRIPT = 'examples/bom/panel-with-fasteners.kcad.ts';

test('design → BOM → order sheet → pack downloads', async ({ page }, testInfo) => {
    test.setTimeout(600_000);
    await page.setViewportSize({ width: 1440, height: 900 });

    // 1. Design loads with an assembly.
    await page.goto(`/?script=${SCRIPT}`);
    await expect(page.getByTestId('workbench-ready')).toBeVisible({ timeout: 180_000 });

    // 2. Parts tab lists the BOM (server-computed over the same script).
    await page.getByTestId('inspector-tab-parts').click();
    await expect(page.getByTestId('parts-row-1')).toBeVisible({ timeout: 180_000 });
    await expect(page.getByTestId('parts-totals')).toContainText('prices not included');
    await expect(page.getByTestId('parts-row-qty-1')).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('parts-tab.png') });

    // 3. Order sheet: made groups per process + bought vendor cards.
    await page.getByTestId('parts-order-open').click();
    const sheet = page.getByRole('dialog', { name: 'Order parts' });
    await expect(sheet).toBeVisible();
    await expect(page.locator('[data-testid^="order-group-"]').first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('order-bought-mcmaster')).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('order-sheet.png') });

    // 4. Download the whole order pack; verify it is a real multi-part pack.
    const packWait = page.waitForEvent('download', { timeout: 300_000 });
    await page.getByTestId('order-pack-all').click();
    const pack = await packWait;
    const packPath = testInfo.outputPath('order-pack.zip');
    await pack.saveAs(packPath);
    const zip = unzipSync(new Uint8Array(await readFile(packPath)));
    const names = Object.keys(zip);
    expect(names).toContain('manifest.json');
    expect(names).toContain('bom.csv');
    expect(names).toContain('handoffs/mcmaster.txt');
    const stepFiles = names.filter((n) => /^parts\/\d+-[^/]+\/model\.step$/.test(n));
    expect(stepFiles.length).toBeGreaterThanOrEqual(1);
    const manifest = JSON.parse(strFromU8(zip['manifest.json'])) as {
        parts: { folder: string; qty: number; kind: string }[];
    };
    expect(manifest.parts.length).toBeGreaterThanOrEqual(2);
    expect(manifest.parts.some((p) => p.kind === 'fabricated')).toBe(true);
    expect(manifest.parts.some((p) => p.kind === 'purchased')).toBe(true);

    // 5. BOM CSV from the sheet has the real header + a made row.
    const csvWait = page.waitForEvent('download', { timeout: 120_000 });
    await page.getByTestId('order-bom-csv').click();
    const csvPath = testInfo.outputPath('bom.csv');
    await (await csvWait).saveAs(csvPath);
    const csv = await readFile(csvPath, 'utf8');
    expect(csv.split('\n')[0]).toBe(
        'item,name,quantity,kind,material,densityKgM3,massGPerUnit,massGTotal,bboxMinX,bboxMinY,bboxMinZ,bboxMaxX,bboxMaxY,bboxMaxZ,process,vendor,partNumber,license,source,instancePaths',
    );

    // 6. Close the sheet; per-row download packs exactly that one part.
    await page.getByRole('button', { name: 'Close' }).click();
    await expect(sheet).toBeHidden();

    const rowWait = page.waitForEvent('download', { timeout: 300_000 });
    await page.getByTestId('parts-row-download-1').click();
    const rowZipPath = testInfo.outputPath('row-1.zip');
    await (await rowWait).saveAs(rowZipPath);
    const rowZip = unzipSync(new Uint8Array(await readFile(rowZipPath)));
    const rowSteps = Object.keys(rowZip).filter((n) => n.endsWith('model.step'));
    expect(rowSteps).toHaveLength(1);
    expect(rowSteps[0]).toMatch(/^parts\/1-/);
});
