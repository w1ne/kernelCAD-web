// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const repoRoot = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/industrial-plant/compressed-air-receiver.kcad.ts';

beforeAll(async () => {
  await initOcct();
}, 120_000);

describe('industrial-plant/compressed-air-receiver materials', () => {
  it('renders the pressure gauge as a steel case with a glass lens, not a solid glass body', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(repoRoot, source);

    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
    expect(asset.params.filter((param) => param.type === 'color').map((param) => param.name)).toEqual([
      'steel', 'safetyPaint', 'gaugeGlass',
    ]);
    expect(Object.keys(asset.presets)).toEqual(['weathered', 'highVisibility']);

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

    const gaugeCase = colorsFor('pressure-gauge');
    expect(gaugeCase.length).toBeGreaterThan(0);
    expect(gaugeCase.every(matches('#6a7e87')), 'gauge case should be steel').toBe(true);
    expect(gaugeCase.some(matches('#91c6c8')), 'gauge case must not be glass').toBe(false);
    const stem = colorsFor('gauge-stem');
    expect(stem.length).toBeGreaterThan(0);
    expect(stem.every(matches('#6a7e87')), 'gauge stem should be steel').toBe(true);
    const lens = colorsFor('pressure-gauge-lens');
    expect(lens.length).toBeGreaterThan(0);
    expect(lens.every(matches('#91c6c8')), 'only the lens should be gauge glass').toBe(true);
  }, 120_000);
});
