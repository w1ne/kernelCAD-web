// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const repoRoot = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/grid-substation/substation-hv-cable-termination.kcad.ts';

beforeAll(async () => {
  await initOcct();
}, 120_000);

describe('grid-substation/substation-hv-cable-termination materials', () => {
  it('makes the cable clamp galvanized steel hardware, not cable jacket', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(repoRoot, source);

    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
    expect(asset.params.filter((param) => param.type === 'color').map((param) => param.name)).toEqual([
      'galvanizedSteel', 'cableJacket', 'porcelain', 'copper',
    ]);
    expect(Object.keys(asset.presets)).toEqual(['weathered', 'maintenance']);

    const steel = asset.palette.find((zone) => zone.name === 'galvanizedSteel');
    const jacket = asset.palette.find((zone) => zone.name === 'cableJacket');
    expect(steel?.parts).toEqual(expect.arrayContaining(['base', 'cable-clamp']));
    expect(jacket?.parts).toEqual(['cable-riser']);

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

    const clamp = colorsFor('cable-clamp');
    expect(clamp.length).toBeGreaterThan(0);
    expect(clamp.every(matches('#7f8c92')), 'the cable clamp should be galvanized steel').toBe(true);
    const riser = colorsFor('cable-riser');
    expect(riser.length).toBeGreaterThan(0);
    expect(riser.every(matches('#263d50')), 'the cable riser should keep the cable jacket').toBe(true);
  }, 120_000);
});
