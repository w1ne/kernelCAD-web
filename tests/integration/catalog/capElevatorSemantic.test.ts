// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { resolve } from 'node:path';
import sharp from 'sharp';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { glbTriangles, renderTrianglesPng } from '../../../scripts/lib/glbSoftwareRender';

const repoRoot = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/beverage-bottling-line/cap-elevator.kcad.ts';

beforeAll(async () => {
  await initOcct();
}, 120_000);

describe('beverage-bottling-line/cap-elevator', () => {
  it('keeps its belt flights visible in the generated catalog preview', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(repoRoot, source);

    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
    expect(asset.stats.sizeM[1]).toBeGreaterThan(2);
    expect(asset.params.filter((param) => param.type === 'color').map((param) => param.name)).toEqual([
      'stainlessSteel', 'powderCoat', 'foodPolymer', 'beltRubber',
    ]);
    expect(Object.keys(asset.presets)).toEqual(['sanitaryLine', 'legacyPlant']);
    expect(asset.palette.find((zone) => zone.name === 'beltRubber')?.parts).toContain('belt-web');
    expect(asset.palette.find((zone) => zone.name === 'foodPolymer')?.parts.filter((part) => part.startsWith('belt-cleat-')))
      .toHaveLength(8);

    const png = await renderTrianglesPng(await glbTriangles(glb), {
      label: `${asset.title} · ${asset.stats.triangles} tris`,
    });
    const { data, info } = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const foodPolymerRows: number[] = [];
    for (let y = 75; y < 300; y++) {
      let pixels = 0;
      for (let x = 0; x < info.width; x++) {
        const offset = (y * info.width + x) * info.channels;
        const red = data[offset]!;
        const green = data[offset + 1]!;
        const blue = data[offset + 2]!;
        if (red < 40 && green > 70 && blue > green + 5) pixels++;
      }
      foodPolymerRows[y] = pixels;
    }

    const flightPeaks: number[] = [];
    for (let y = 95; y < 285; y++) {
      if (foodPolymerRows[y]! < 35) continue;
      if (foodPolymerRows[y]! < foodPolymerRows[y - 1]! || foodPolymerRows[y]! < foodPolymerRows[y + 1]!) continue;
      if (flightPeaks.length === 0 || y - flightPeaks[flightPeaks.length - 1]! > 10) flightPeaks.push(y);
    }
    expect(flightPeaks.length).toBeGreaterThanOrEqual(6);
  }, 120_000);
});
