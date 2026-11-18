// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const repoRoot = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/railway/tank-wagon.kcad.ts';

const springs = ['a', 'b'].flatMap((tag) =>
  [-1, 1].flatMap((side) => [-180, 0, 180].map((dx) => `spring-${tag}-${side}-${dx}`)),
);

beforeAll(async () => {
  await initOcct();
}, 120_000);

describe('railway/tank-wagon materials', () => {
  it('gives the freight-bogie springs the running-gear steel, not the stainless fittings finish', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(repoRoot, source);

    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
    expect(asset.params.filter((param) => param.type === 'color').map((param) => param.name)).toEqual([
      'railSteel', 'paintedSteel', 'stainlessSteel', 'safetyMarking',
    ]);
    expect(Object.keys(asset.presets)).toEqual(['weathered', 'freshService', 'whiteChemical']);

    const runningGear = asset.palette.find((zone) => zone.name === 'railSteel');
    const fittings = asset.palette.find((zone) => zone.name === 'stainlessSteel');
    for (const spring of springs) {
      expect(runningGear?.parts).toContain(spring);
      expect(fittings?.parts).not.toContain(spring);
    }
    expect(fittings?.parts).toContain('manway');

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

    for (const name of springs) {
      const colors = colorsFor(name);
      expect(colors.length, `expected exported colors for ${name}`).toBeGreaterThan(0);
      expect(colors.every(matches('#3f4649')), `${name} should use the running-gear steel`).toBe(true);
    }

    const manway = colorsFor('manway');
    expect(manway.length).toBeGreaterThan(0);
    expect(manway.every(matches('#b8c1c2')), 'manway should keep the stainless fittings finish').toBe(true);
  }, 120_000);
});
