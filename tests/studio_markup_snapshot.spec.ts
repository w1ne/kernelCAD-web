// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { test, expect } from '@playwright/test';

test('Studio loads and re-saves a replayable markup snapshot', async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/studio');
    await expect(page.getByTestId('workbench-ready')).toBeVisible({ timeout: 60_000 });

    await page.getByRole('button', { name: 'Markup', exact: true }).click();
    await expect(page.getByTestId('markup-panel')).toBeVisible();

    const fixture = {
        schemaVersion: 1,
        camera: {
            position: [32, 25, 16], target: [1, 2, 3], up: [0, 0, 1],
            projection: 'perspective', fov: 38, zoom: 1.25,
        },
        selection: { topologyRefs: [{ shapeIndex: 0, kind: 'face', id: 4 }] },
        measurements: [{
            id: 'replay-distance', type: 'distance', endpoints: [[0, 0, 0], [3, 4, 0]],
            refs: [{ shapeIndex: 0, kind: 'edge', id: 2 }], value: 5, units: 'mm',
        }],
        notes: [{
            id: 'replay-note', text: 'Keep this face flat', anchor: [1, 2, 3],
            refs: [{ shapeIndex: 0, kind: 'face', id: 4 }],
        }],
    };
    await page.getByLabel('Choose markup snapshot').setInputFiles({
        name: 'studio-markup.snapshot.json',
        mimeType: 'application/json',
        buffer: Buffer.from(JSON.stringify(fixture)),
    });

    await expect(page.getByTestId('markup-panel').getByRole('status')).toContainText('Snapshot loaded');
    await expect(page.getByLabel('Edit note 1')).toHaveValue('Keep this face flat');
    await expect(page.getByText('Keep this face flat', { exact: true })).toBeVisible();
    await expect(page.getByText('Face 4 · shape 0', { exact: true })).toBeVisible();
    await expect(page.getByTestId('dimension-label')).toContainText('5');

    const downloadWait = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Save JSON' }).click();
    const download = await downloadWait;
    const path = await download.path();
    expect(path).toBeTruthy();
    const saved = JSON.parse(await (await import('node:fs/promises')).readFile(path!, 'utf8')) as typeof fixture;
    saved.camera.position.forEach((value, index) => expect(value).toBeCloseTo(fixture.camera.position[index]!, 3));
    saved.camera.target.forEach((value, index) => expect(value).toBeCloseTo(fixture.camera.target[index]!, 3));
    expect(saved.camera.up).toEqual(fixture.camera.up);
    expect(saved.camera.projection).toBe(fixture.camera.projection);
    expect(saved.camera.fov).toBeCloseTo(fixture.camera.fov, 3);
    expect(saved.camera.zoom).toBeCloseTo(fixture.camera.zoom, 3);
    expect(saved.selection).toEqual(fixture.selection);
    expect(saved.measurements).toEqual(fixture.measurements);
    expect(saved.notes).toEqual(fixture.notes);
});
