// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const repoRoot = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/telecom-infrastructure/microwave-dish-antenna.kcad.ts';

beforeAll(async () => {
  await initOcct();
}, 120_000);

describe('telecom-infrastructure/microwave-dish-antenna materials', () => {
  it('keeps the elevation nut with the galvanized mount, not the radio-unit powder coat', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(repoRoot, source);

    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
    expect(asset.params.filter((param) => param.type === 'color').map((param) => param.name)).toEqual([
      'aluminum', 'radome', 'galvanizedSteel', 'powderCoat',
    ]);
    expect(Object.keys(asset.presets)).toEqual(['fieldSite', 'highVisibility']);

    const coat = asset.palette.find((zone) => zone.name === 'powderCoat');
    expect(coat?.parts).not.toContain('elevation-nut');
    expect(coat?.parts).toContain('odu-housing');
    const steel = asset.palette.find((zone) => zone.name === 'galvanizedSteel');
    expect(steel?.parts).toEqual(expect.arrayContaining(['elevation-nut', 'elevation-strut', 'collar-upper']));

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

    for (const name of ['elevation-nut', 'elevation-strut']) {
      const colors = colorsFor(name);
      expect(colors.length, `expected exported colors for ${name}`).toBeGreaterThan(0);
      expect(colors.every(matches('#77868d')), `${name} should use the galvanized-steel finish`).toBe(true);
    }

    const housing = colorsFor('odu-housing');
    expect(housing.length, 'expected exported colors for odu-housing').toBeGreaterThan(0);
    expect(housing.every(matches('#318b96')), 'odu-housing should keep the powder coat').toBe(true);
  }, 120_000);
});
