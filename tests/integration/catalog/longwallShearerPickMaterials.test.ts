// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const repoRoot = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/mining/longwall-shearer.kcad.ts';
const isPick = (name: string): boolean => name.startsWith('vane-pick-') || name.startsWith('face-pick-');

const parseHex = (hex: string): number[] => [0, 1, 2].map((index) =>
  Number.parseInt(hex.slice(1 + index * 2, 3 + index * 2), 16) / 255,
);

beforeAll(async () => {
  await initOcct();
}, 120_000);

describe('mining/longwall-shearer cutter-pick materials', () => {
  it('assigns all cutter picks to the existing drum-and-pick steel control', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(repoRoot, source);

    expect(asset.stats.triangles).toBe(3504);
    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
    expect(asset.stats.sizeM).toEqual([20, 3.35, 5.85]);
    expect(asset.params.find((param) => param.name === 'drumSteel')?.label).toBe('Drum and pick steel');
    expect(asset.presets).toMatchObject({
      weathered: { drumSteel: '#77706a' },
      eickhoffGreen: { drumSteel: '#9da19e' },
      highVisibility: { drumSteel: '#b0b5b2' },
    });

    const drumSteelParts = asset.palette.find((zone) => zone.name === 'drumSteel')?.parts ?? [];
    const steelworkParts = asset.palette.find((zone) => zone.name === 'steelwork')?.parts ?? [];
    const pickParts = drumSteelParts.filter(isPick);
    expect(pickParts).toHaveLength(40);
    expect(steelworkParts.some(isPick)).toBe(false);

    const document = await new NodeIO().readBinary(glb);
    const nodes = document.getRoot().listNodes();
    const expected = parseHex('#8f9491');
    const colorMatches = (color: number[]) => expected.every((channel, index) =>
      Math.abs(channel - color[index]!) < 0.015,
    );

    for (const partName of pickParts) {
      const node = nodes.find((candidate) => candidate.getName() === partName);
      expect(node, `expected exported node ${partName}`).toBeDefined();
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

      expect(colors.length, `expected exported colors for ${partName}`).toBeGreaterThan(0);
      expect(colors.every(colorMatches), `${partName} should match drumSteel`).toBe(true);
    }
  }, 120_000);
});
