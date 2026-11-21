// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const repoRoot = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/mining/assay-sample-divider.kcad.ts';

beforeAll(async () => {
  await initOcct();
}, 120_000);

describe('mining/assay-sample-divider collection-container material', () => {
  it('keeps rotary sample buckets on the stainless-steel palette', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(repoRoot, source);
    const bucketParts = Array.from({ length: 8 }, (_, index) => `sample-bucket-${index}`);
    const oreParts = Array.from({ length: 8 }, (_, index) => `sample-bucket-ore-${index}`);

    expect(asset.stats.triangles).toBe(2032);
    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
    expect(asset.stats.sizeM).toEqual([0.69, 0.82, 0.504868]);
    expect(asset.params.filter((param) => param.type === 'color').map((param) => param.name)).toEqual([
      'housingPaint', 'stainlessSteel', 'sampleOre',
    ]);
    expect(Object.keys(asset.presets)).toEqual(['weathered', 'labWhite', 'highVisibility']);

    const bucketZone = asset.palette.find((zone) => zone.name === 'stainlessSteel');
    expect(bucketZone?.parts).toEqual(expect.arrayContaining(bucketParts));
    expect(bucketZone?.parts).not.toEqual(expect.arrayContaining(oreParts));
    expect(asset.palette.find((zone) => zone.name === 'sampleOre')?.parts)
      .toEqual(expect.arrayContaining(oreParts));

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
    const expectedSteel = [0xb9 / 255, 0xc1 / 255, 0xc4 / 255];
    const matchesSteel = (color: number[]) => expectedSteel.every((channel, index) =>
      Math.abs(channel - color[index]!) < 0.015,
    );

    for (const name of bucketParts) {
      const colors = colorsFor(name);
      expect(colors.length, `expected exported colors for ${name}`).toBeGreaterThan(0);
      expect(colors.every(matchesSteel), `${name} should use the stainless-steel palette`).toBe(true);
    }
  }, 120_000);
});
