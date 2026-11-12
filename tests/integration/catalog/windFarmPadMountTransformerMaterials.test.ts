// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const repoRoot = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/wind-energy/wind-farm-pad-mount-transformer.kcad.ts';

beforeAll(async () => {
  await initOcct();
}, 120_000);

describe('wind-energy/wind-farm-pad-mount-transformer radiator materials', () => {
  it('uses the coated-steel control for all radiator fins and keeps ceramic bushings separate', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(repoRoot, source);

    expect(asset.stats.triangles).toBe(360);
    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
    expect(asset.description).toContain('a side cooling bank');
    expect(asset.description).not.toContain('two side cooling banks');
    [0.9, 0.973, 0.7].forEach((expected, axis) => {
      expect(asset.stats.sizeM[axis]).toBeCloseTo(expected, 5);
    });
    expect(asset.params.filter((param) => param.type === 'color').map((param) => param.name)).toEqual([
      'powderCoatedSteel', 'concrete', 'ceramic',
    ]);
    expect(Object.keys(asset.presets)).toEqual(['weathered', 'highVisibility']);
    expect(asset.presets.weathered).toMatchObject({ powderCoatedSteel: '#1f5765' });
    expect(asset.presets.highVisibility).toMatchObject({ powderCoatedSteel: '#d8a62b' });

    const steel = asset.palette.find((zone) => zone.name === 'powderCoatedSteel');
    const concrete = asset.palette.find((zone) => zone.name === 'concrete');
    const ceramic = asset.palette.find((zone) => zone.name === 'ceramic');
    const finNames = Array.from({ length: 5 }, (_, index) => `fin-${index}`);
    expect(steel?.parts).toEqual(expect.arrayContaining(['tank', 'lid', ...finNames]));
    expect(concrete?.parts).toContain('pad');
    expect(ceramic?.parts).toEqual(expect.arrayContaining([
      'bushing-base-0', 'bushing-base-1', 'bushing-base-2',
      'bushing-0', 'bushing-1', 'bushing-2',
    ]));
    expect(asset.palette.find((zone) => zone.name === 'aluminium')).toBeUndefined();

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
    const matches = (hex: string) => {
      const expected = [1, 3, 5].map((shift) => parseInt(hex.slice(shift, shift + 2), 16) / 255);
      return (color: number[]) => expected.every((channel, index) =>
        Math.abs(channel - color[index]!) < 0.015,
      );
    };

    for (const name of [...finNames, 'tank', 'lid']) {
      const colors = colorsFor(name);
      expect(colors.length, `expected exported colors for ${name}`).toBeGreaterThan(0);
      expect(colors.every(matches('#287082')), `${name} should use the coated-steel control`).toBe(true);
    }
    expect(colorsFor('pad').every(matches('#8b8c84'))).toBe(true);
    expect(colorsFor('bushing-0').every(matches('#eee2ca'))).toBe(true);
  }, 120_000);
});
