// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const repoRoot = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/industrial-plant/cyclone-separator.kcad.ts';

// The cone, vortex-finder stack and tangential inlet are one welded steel
// process shell; only the top flange ring carries safety paint.
const steelShell = [
  'cone-step-0', 'cone-step-1', 'cone-step-2', 'cone-step-3', 'outlet-stack', 'tangential-inlet',
];

const parseHex = (hex: string): number[] => [0, 1, 2].map((index) =>
  Number.parseInt(hex.slice(1 + index * 2, 3 + index * 2), 16) / 255,
);

beforeAll(async () => {
  await initOcct();
}, 120_000);

describe('industrial-plant/cyclone-separator materials', () => {
  it('uses steel for the whole process shell and preserves the current size and mesh budget', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(repoRoot, source);

    expect(asset.stats.triangles).toBe(388);
    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
    expect(asset.stats.sizeM).toEqual([0.6437, 1.066, 0.54]);

    const steelParts = asset.palette.find((zone) => zone.name === 'steel')?.parts ?? [];
    const safetyPaintParts = asset.palette.find((zone) => zone.name === 'safetyPaint')?.parts ?? [];
    for (const part of steelShell) expect(steelParts).toContain(part);
    expect(safetyPaintParts).toEqual(['upper-rim']);

    const document = await new NodeIO().readBinary(glb);
    const steel = parseHex('#707e83');
    const matchesSteel = (color: number[]) => steel.every((channel, index) =>
      Math.abs(channel - color[index]!) < 0.015,
    );
    for (const part of steelShell) {
      const node = document.getRoot().listNodes().find((candidate) => candidate.getName() === part);
      expect(node, part).toBeDefined();
      const colors = node?.getMesh()?.listPrimitives().flatMap((primitive) => {
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
      expect(colors.length, part).toBeGreaterThan(0);
      expect(colors.every(matchesSteel), part).toBe(true);
    }
  }, 120_000);
});
