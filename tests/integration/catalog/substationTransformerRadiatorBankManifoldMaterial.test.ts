// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const repoRoot = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/grid-substation/substation-transformer-radiator-bank.kcad.ts';

beforeAll(async () => {
  await initOcct();
}, 120_000);

describe('grid-substation/substation-transformer-radiator-bank manifolds', () => {
  it('uses the radiator steel finish for both oil manifolds and keeps the source controls live', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(repoRoot, source);

    expect(asset.stats.triangles).toBe(200);
    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);

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
    const expected = [1, 3, 5].map((shift) => parseInt('#b5c0c0'.slice(shift, shift + 2), 16) / 255);
    for (const name of ['inlet-manifold', 'outlet-manifold']) {
      const colors = colorsFor(name);
      expect(colors.length, `expected exported colors for ${name}`).toBeGreaterThan(0);
      expect(colors.every((color) => expected.every((channel, index) =>
        Math.abs(channel - color[index]!) < 0.015,
      )), `${name} should use the radiator steel finish`).toBe(true);
    }

    expect(asset.params.filter((param) => param.type === 'color').map((param) => param.name)).toEqual([
      'transformerEnamel', 'stainlessSteel',
    ]);
    expect(Object.keys(asset.presets)).toEqual(['weathered', 'maintenance']);
    expect(asset.presets.weathered).toMatchObject({
      transformerEnamel: '#5a6c53',
      stainlessSteel: '#9da4a0',
    });

    const steel = asset.palette.find((zone) => zone.name === 'stainlessSteel');
    expect(steel?.parts).toEqual(expect.arrayContaining([
      'radiator-fin-1', 'radiator-fin-10', 'inlet-manifold', 'outlet-manifold',
    ]));
    expect(asset.palette.some((zone) => zone.parts.includes('inlet-manifold') && zone.name !== 'stainlessSteel'))
      .toBe(false);
    expect(asset.palette.some((zone) => zone.parts.includes('outlet-manifold') && zone.name !== 'stainlessSteel'))
      .toBe(false);
  }, 120_000);
});
