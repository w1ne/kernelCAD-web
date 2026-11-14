// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const repoRoot = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/beverage-bottling-line/case-layer-palletizer.kcad.ts';

beforeAll(async () => {
  await initOcct();
}, 120_000);

describe('beverage-bottling-line/case-layer-palletizer pallet material', () => {
  it('uses a pallet-timber control for the pallet deck and preserves the model envelope', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(repoRoot, source);

    expect(asset.stats.triangles).toBe(132);
    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
    [2.39, 2.025, 1.1875].forEach((expected, axis) => {
      expect(asset.stats.sizeM[axis]).toBeCloseTo(expected, 5);
    });
    expect(Object.keys(asset.presets)).toEqual(['sanitaryLine', 'legacyPlant']);
    expect(asset.presets.sanitaryLine).toMatchObject({ palletTimber: '#a9794c' });
    expect(asset.presets.legacyPlant).toMatchObject({ palletTimber: '#704d31' });

    const timber = asset.palette.find((zone) => zone.name === 'palletTimber');
    expect(timber?.parts).toContain('pallet-deck');
    expect(timber?.color).toBe('#95683f');
    expect(asset.palette.some((zone) => zone.name === 'corrugatedBoard')).toBe(false);

    const document = await new NodeIO().readBinary(glb);
    const pallet = document.getRoot().listNodes().find((node) => node.getName() === 'pallet-deck');
    const colors = pallet?.getMesh()?.listPrimitives().flatMap((primitive) => {
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
    const expectedTimber = [0x95 / 255, 0x68 / 255, 0x3f / 255];
    const matchesTimber = (color: number[]) => expectedTimber.every((channel, index) =>
      Math.abs(channel - color[index]!) < 0.015,
    );

    expect(colors.length, 'expected exported pallet-deck colors').toBeGreaterThan(0);
    expect(colors.every(matchesTimber)).toBe(true);
  }, 120_000);
});
