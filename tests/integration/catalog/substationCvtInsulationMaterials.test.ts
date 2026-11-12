// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const repoRoot = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/grid-substation/substation-capacitive-voltage-transformer.kcad.ts';

beforeAll(async () => {
  await initOcct();
}, 120_000);

describe('grid-substation/capacitive-voltage-transformer insulation materials', () => {
  it('colors the divider stack as porcelain and keeps the steel zones separate', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(repoRoot, source);

    expect(asset.stats.triangles).toBe(252);
    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
    expect(asset.stats.sizeM).toEqual([1.25, 2.755, 0.95]);
    expect(asset.params.filter((param) => param.type === 'color').map((param) => param.name)).toEqual([
      'stainlessSteel', 'powderCoat', 'porcelain',
    ]);
    expect(Object.keys(asset.presets)).toEqual(['weathered', 'maintenance']);
    expect(asset.presets.weathered).toMatchObject({ porcelain: '#684537' });
    expect(asset.presets.maintenance).toMatchObject({ porcelain: '#7b4632', powderCoat: '#cf7736' });

    const porcelainParts = [
      'divider-section-1', 'divider-section-2', 'divider-section-3', 'divider-section-4',
    ];
    expect(asset.palette.find((zone) => zone.name === 'porcelain')).toMatchObject({
      color: '#7b4632',
      parts: porcelainParts,
    });
    expect(asset.palette.find((zone) => zone.name === 'powderCoat')).toMatchObject({
      parts: ['secondary-box'],
    });
    expect(asset.palette.find((zone) => zone.name === 'stainlessSteel')).toMatchObject({
      parts: ['base-plate', 'pedestal'],
    });

    const document = await new NodeIO().readBinary(glb);
    const nodes = document.getRoot().listNodes();
    const colorsFor = (name: string) => {
      const node = nodes.find((candidate) => candidate.getName() === name);
      return node?.getMesh()?.listPrimitives().flatMap((primitive) => {
        const vertexColors = primitive.getAttribute('COLOR_0');
        if (vertexColors !== null) {
          return Array.from({ length: vertexColors.getCount() }, (_, index) => {
            const color = vertexColors.getElement(index, []);
            return color.slice(0, 3).map((channel) =>
              channel <= 0.0031308 ? 12.92 * channel : 1.055 * channel ** (1 / 2.4) - 0.055,
            );
          });
        }
        const material = primitive.getMaterial();
        return material === null ? [] : [material.getBaseColorFactor().slice(0, 3)];
      }) ?? [];
    };
    const expectedPorcelain = [1, 3, 5].map((shift) => parseInt('#7b4632'.slice(shift, shift + 2), 16) / 255);
    for (const part of porcelainParts) {
      const colors = colorsFor(part);
      expect(colors.length, `expected exported colors for ${part}`).toBeGreaterThan(0);
      expect(colors.every((color) => expectedPorcelain.every((channel, index) =>
        Math.abs(channel - color[index]!) < 0.015,
      )), `${part} should match the porcelain control`).toBe(true);
    }
    expect(colorsFor('secondary-box')).not.toEqual(colorsFor('divider-section-1'));
  }, 120_000);
});
