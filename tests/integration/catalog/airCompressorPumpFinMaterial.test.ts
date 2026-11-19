// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const repoRoot = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/industrial-plant/air-compressor.kcad.ts';

beforeAll(async () => {
  await initOcct();
}, 120_000);

describe('industrial-plant/air-compressor pump-fin materials', () => {
  it('keeps the finned pump cylinders and heads on the cast-iron palette', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(repoRoot, source);
    const finParts = [
      ...Array.from({ length: 6 }, (_, index) => `pump-fin-0-${index}`),
      ...Array.from({ length: 6 }, (_, index) => `pump-fin-1-${index}`),
    ];

    expect(asset.stats.triangles).toBe(4594);
    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
    [1, 0.896, 0.372].forEach((expected, axis) => {
      expect(asset.stats.sizeM[axis]).toBeCloseTo(expected, 5);
    });
    expect(asset.params.filter((param) => param.type === 'color').map((param) => param.name)).toEqual([
      'receiverSteel', 'pumpIron', 'motorPaint', 'rubber',
    ]);
    expect(Object.keys(asset.presets)).toEqual(['plant', 'weathered', 'highVisibility']);

    const pumpIronParts = asset.palette.find((zone) => zone.name === 'pumpIron')?.parts ?? [];
    expect(pumpIronParts).toEqual(expect.arrayContaining([
      ...finParts,
      'pump-barrel-0', 'pump-head-0', 'pump-barrel-1', 'pump-head-1',
    ]));
    const receiverSteelParts = asset.palette.find((zone) => zone.name === 'receiverSteel')?.parts ?? [];
    expect(receiverSteelParts).not.toEqual(expect.arrayContaining(finParts));

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
    const iron = [0x44 / 255, 0x4b / 255, 0x50 / 255];
    const matchesIron = (color: number[]) => iron.every((channel, index) =>
      Math.abs(channel - color[index]!) < 0.015,
    );

    for (const name of [...finParts, 'pump-barrel-0', 'pump-head-0', 'pump-barrel-1', 'pump-head-1']) {
      const colors = colorsFor(name);
      expect(colors.length, `expected exported colors for ${name}`).toBeGreaterThan(0);
      expect(colors.every(matchesIron), `${name} should use pump cast iron`).toBe(true);
    }
  }, 120_000);
});
