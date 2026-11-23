// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const repoRoot = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/industrial-plant/process-water-silo.kcad.ts';

beforeAll(async () => {
  await initOcct();
}, 120_000);

describe('industrial-plant/process-water-silo process fittings', () => {
  it('uses the steel finish on visible wetted parts and keeps safety paint on the shell band', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(repoRoot, source);

    expect(asset.stats.triangles).toBe(588);
    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);

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

    for (const name of ['discharge-transition', 'top-nozzle', 'side-nozzle']) {
      const colors = colorsFor(name);
      expect(colors.length, `${name} should render`).toBeGreaterThan(0);
      expect(colors.every(matches('#77838a')), `${name} should use the steel finish`).toBe(true);
    }

    const bandColors = colorsFor('stiffener-0');
    expect(bandColors.length, 'stiffener-0 should render').toBeGreaterThan(0);
    expect(bandColors.every(matches('#d9a343')), 'stiffener-0 should retain safety paint').toBe(true);
  }, 120_000);
});
