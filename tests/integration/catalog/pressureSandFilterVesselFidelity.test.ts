// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { glbTriangles } from '../../../scripts/lib/glbSoftwareRender';

const repoRoot = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/water-treatment/pressure-sand-filter-vessel.kcad.ts';

beforeAll(async () => {
  await initOcct();
}, 120_000);

describe('water-treatment/pressure-sand-filter-vessel', () => {
  it('exports two stainless side nozzles entering the vessel at separate heights', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(repoRoot, source);
    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
    expect(asset.stats.minUpM).toBeCloseTo(0, 5);
    expect(asset.palette.find((zone) => zone.name === 'stainlessSteel')?.parts).toEqual(
      expect.arrayContaining(['inlet-nozzle', 'inlet-flange', 'outlet-nozzle', 'outlet-flange']),
    );

    const steel = [181 / 255, 192 / 255, 192 / 255];
    const points = (await glbTriangles(glb))
      .filter((triangle) => triangle.color.every((channel, index) => Math.abs(channel - steel[index]!) < 0.015))
      .flatMap((triangle) => triangle.v);
    expect(points.length).toBeGreaterThan(0);

    const axisBounds = [0, 1, 2].map((axis) => ({
      min: Math.min(...points.map((point) => point[axis]!)),
      max: Math.max(...points.map((point) => point[axis]!)),
    }));
    const vertical = axisBounds[1]!;
    const radial = axisBounds[2]!;
    const radialAbs = points.map((point) => Math.abs(point[2]!));

    // GLB is Y-up: the low/high ports create a tall but narrow stainless zone.
    // Radially, the section starts inside the 310 mm shell and projects beyond it.
    expect(vertical.max - vertical.min).toBeGreaterThan(0.55);
    expect(radial.max - radial.min).toBeLessThan(0.25);
    expect(Math.min(...radialAbs)).toBeLessThan(0.30);
    expect(Math.max(...radialAbs)).toBeGreaterThan(0.34);
  }, 120_000);
});
