// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const repoRoot = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/mining/grizzly-scalping-deck.kcad.ts';

beforeAll(async () => {
  await initOcct();
}, 120_000);

describe('mining/grizzly-scalping-deck materials', () => {
  it('renders the coil springs as support steel and keeps the vibrator covers safety yellow', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(repoRoot, source);

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

    const coilNames = Array.from({ length: 2 }, (_, position) =>
      Array.from({ length: 2 }, (_, side) =>
        Array.from({ length: 5 }, (_, coil) => `spring-coil-${position}-${side}-${coil}`),
      ).flat(),
    ).flat();
    expect(coilNames).toHaveLength(20);
    for (const name of coilNames) {
      const colors = colorsFor(name);
      expect(colors.length, `${name} should be present in the exported GLB`).toBeGreaterThan(0);
      expect(colors.every(matches('#4b5459')), `${name} should use the support-steel finish`).toBe(true);
    }

    const warningCover = colorsFor('vibrator-weight-cover-0');
    expect(warningCover.length).toBeGreaterThan(0);
    expect(warningCover.every(matches('#e8c21e')), 'vibrator weight covers should stay safety yellow').toBe(true);
  }, 120_000);
});
