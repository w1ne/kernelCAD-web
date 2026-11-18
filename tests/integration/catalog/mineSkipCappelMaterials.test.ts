// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const repoRoot = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/mining/mine-skip.kcad.ts';

beforeAll(async () => {
  await initOcct();
}, 120_000);

describe('mining/mine-skip cappel material', () => {
  it('assigns the steel rope termination to the structural-steel control', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(repoRoot, source);
    expect(asset.stats.triangles).toBe(1490);
    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
    [5.2, 16, 5.4].forEach((expected, axis) => {
      expect(asset.stats.sizeM[axis]).toBeCloseTo(expected, 5);
    });
    expect(Object.keys(asset.presets)).toEqual(['weathered', 'highVisibility', 'blueHoist']);

    const steel = asset.palette.find((zone) => zone.name === 'structuralSteel');
    expect(steel?.parts).toContain('cappel');
    expect(asset.palette.find((zone) => zone.name === 'floor-edge-stripe')?.parts).not.toContain('cappel');

    const document = await new NodeIO().readBinary(glb);
    const cappel = document.getRoot().listNodes().find((node) => node.getName() === 'cappel');
    const colors = cappel?.getMesh()?.listPrimitives().flatMap((primitive) => {
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
    const structuralSteel = [0x4f / 255, 0x5b / 255, 0x62 / 255];
    const matchesStructuralSteel = (color: number[]) => structuralSteel.every((channel, index) =>
      Math.abs(channel - color[index]!) < 0.015,
    );

    expect(colors.length, 'expected exported cappel colors').toBeGreaterThan(0);
    expect(colors.every(matchesStructuralSteel)).toBe(true);
  }, 120_000);
});
