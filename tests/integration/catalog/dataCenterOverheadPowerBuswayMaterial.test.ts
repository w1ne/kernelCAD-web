// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const repoRoot = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/data-center-infrastructure/overhead-power-busway.kcad.ts';

beforeAll(async () => {
  await initOcct();
}, 120_000);

describe('data-center-infrastructure/overhead-power-busway joint-cover material', () => {
  it('gives all four repeated sheet-steel joint covers the same finish', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(repoRoot, source);

    expect(asset.stats.triangles).toBe(140);
    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
    [2.51, 0.53, 0.56].forEach((expected, axis) => {
      expect(asset.stats.sizeM[axis]).toBeCloseTo(expected, 5);
    });
    const jointCovers = ['cover-joint-0', 'cover-joint-1', 'cover-joint-2', 'cover-joint-3'];
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
    const expected = [0x4f / 255, 0x74 / 255, 0x85 / 255];
    const matches = (color: number[]) => expected.every((channel, index) =>
      Math.abs(channel - color[index]!) < 0.015,
    );

    for (const part of jointCovers) {
      const colors = colorsFor(part);
      expect(colors.length, `expected exported colors for ${part}`).toBeGreaterThan(0);
      expect(colors.every(matches), `${part} should use the shared steel joint-cover finish`).toBe(true);
    }

    expect(asset.params.filter((param) => param.type === 'color').map((param) => param.name)).toEqual([
      'housingSteel', 'jointCoverSteel',
    ]);
    expect(Object.keys(asset.presets)).toEqual(['facilityStandard', 'highVisibility']);
  }, 120_000);
});
