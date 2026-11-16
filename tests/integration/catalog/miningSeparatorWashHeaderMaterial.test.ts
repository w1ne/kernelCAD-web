// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const repoRoot = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/mining/magnetic-separator-drum.kcad.ts';

beforeAll(async () => {
  await initOcct();
}, 120_000);

describe('mining/magnetic-separator-drum materials', () => {
  it('makes the wash-water riser the same frame steel as the spray pipe it feeds', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(repoRoot, source);

    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
    expect(asset.params.filter((param) => param.type === 'color').map((param) => param.name)).toEqual([
      'tankPaint', 'drumStainless', 'frameSteel', 'slurry',
    ]);
    expect(Object.keys(asset.presets)).toEqual(['weathered', 'plantBlue', 'highVisibility']);

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

    for (const name of ['wash-header-0', 'spray-pipe-0']) {
      const pipe = colorsFor(name);
      expect(pipe.length).toBeGreaterThan(0);
      expect(pipe.every(matches('#4b5459')), `${name} should be the frame steel wash-water line`).toBe(true);
    }
    const nozzles = colorsFor('spray-nozzle-0-0');
    expect(nozzles.length).toBeGreaterThan(0);
    expect(nozzles.every(matches('#c3cbcc')), 'spray nozzles should keep the stainless finish').toBe(true);
  }, 120_000);
});
