// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { glbTriangles } from '../../../scripts/lib/glbSoftwareRender';

const repoRoot = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/industrial-plant/shell-and-tube-exchanger.kcad.ts';

beforeAll(async () => {
  await initOcct();
}, 120_000);

describe('industrial-plant/shell-and-tube-exchanger materials', () => {
  it('keeps exposed tube sheets, nozzles and supports on a metal palette', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(repoRoot, source);
    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
    expect(asset.params.filter((param) => param.type === 'color').map((param) => param.name)).toEqual([
      'steel', 'hardware',
    ]);
    expect(Object.keys(asset.presets)).toEqual(['weathered', 'stainless']);
    expect(asset.palette.find((zone) => zone.name === 'hardware')?.parts).toEqual(
      expect.arrayContaining([
        'tube-sheet--1', 'connection--1', 'tube-sheet-1', 'connection-1',
        'saddle-0', 'saddle-1', 'shell-band',
      ]),
    );

    const triangles = await glbTriangles(glb);
    const paintedGold = [220 / 255, 161 / 255, 68 / 255];
    expect(triangles.some((triangle) => triangle.color.every((channel, index) =>
      Math.abs(channel - paintedGold[index]!) < 0.015,
    ))).toBe(false);
    const hardware = [137 / 255, 149 / 255, 154 / 255];
    expect(triangles.some((triangle) => triangle.color.every((channel, index) =>
      Math.abs(channel - hardware[index]!) < 0.015,
    ))).toBe(true);
  }, 120_000);
});
