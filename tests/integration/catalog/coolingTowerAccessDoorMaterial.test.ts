// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const repoRoot = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/data-center-infrastructure/cooling-tower-cell.kcad.ts';

beforeAll(async () => {
  await initOcct();
}, 120_000);

describe('data-center-infrastructure/cooling-tower-cell access-door material', () => {
  it('keeps the molded FRP door with the casing finish, separate from the fan stack', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(repoRoot, source);

    expect(asset.stats.triangles).toBe(2110);
    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
    [3.3, 3.906, 2.53].forEach((expected, axis) => {
      expect(asset.stats.sizeM[axis]).toBeCloseTo(expected, 5);
    });
    expect(Object.keys(asset.presets)).toEqual(['sandFRP', 'greyFRP', 'weathered']);

    const casing = asset.palette.find((zone) => zone.name === 'casing');
    expect(casing?.parts).toContain('access-door');
    const stack = asset.palette.find((zone) => zone.name === 'stack');
    expect(stack?.parts).toContain('fan-stack');
    expect(stack?.parts).not.toContain('access-door');

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

    for (const [name, hex] of [
      ['access-door', '#6f9fb2'],
      ['fan-stack', '#e6e8e3'],
    ] as const) {
      const colors = colorsFor(name);
      expect(colors.length, `expected exported colors for ${name}`).toBeGreaterThan(0);
      expect(colors.every(matches(hex)), `${name} should keep its material color`).toBe(true);
    }
  }, 120_000);
});
