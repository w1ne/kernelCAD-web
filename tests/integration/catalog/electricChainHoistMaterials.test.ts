// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const repoRoot = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/industrial-plant/electric-chain-hoist.kcad.ts';

const parseHex = (hex: string): number[] => [0, 1, 2].map((index) =>
  Number.parseInt(hex.slice(1 + index * 2, 3 + index * 2), 16) / 255,
);

beforeAll(async () => {
  await initOcct();
}, 120_000);

describe('industrial-plant/electric-chain-hoist materials', () => {
  it('uses steel for the load chain and preserves the current size and mesh budget', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(repoRoot, source);

    expect(asset.stats.triangles).toBe(192);
    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
    expect(asset.stats.sizeM).toEqual([0.448, 0.441, 0.25]);

    const steelParts = asset.palette.find((zone) => zone.name === 'steel')?.parts ?? [];
    const safetyPaintParts = asset.palette.find((zone) => zone.name === 'safetyPaint')?.parts ?? [];
    expect(steelParts).toContain('chain');
    expect(safetyPaintParts).not.toContain('chain');

    const document = await new NodeIO().readBinary(glb);
    const chain = document.getRoot().listNodes().find((node) => node.getName() === 'chain');
    expect(chain).toBeDefined();
    const colors = chain?.getMesh()?.listPrimitives().flatMap((primitive) => {
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

    const steel = parseHex('#667780');
    const matchesSteel = (color: number[]) => steel.every((channel, index) =>
      Math.abs(channel - color[index]!) < 0.015,
    );
    expect(colors.length).toBeGreaterThan(0);
    expect(colors.every(matchesSteel)).toBe(true);
  }, 120_000);
});
