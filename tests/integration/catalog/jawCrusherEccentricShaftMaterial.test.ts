// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const repoRoot = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/mining/jaw-crusher-module.kcad.ts';

beforeAll(async () => {
  await initOcct();
}, 120_000);

describe('mining/jaw-crusher-module material roles', () => {
  it('keeps the eccentric shaft steel and reserves manganese for the jaw liners', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(repoRoot, source);

    expect(asset.stats.triangles).toBe(3616);
    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
    expect(asset.params.filter((param) => param.type === 'color').map((param) => param.name)).toEqual([
      'coatedSteel', 'structuralSteel', 'rubber', 'manganeseSteel',
    ]);
    expect(Object.keys(asset.presets)).toEqual(['weathered', 'highVisibility', 'yellowPlant']);

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

    const shaft = colorsFor('eccentric-shaft');
    expect(shaft.length, 'eccentric shaft should render').toBeGreaterThan(0);
    expect(shaft.every(matches('#4b5459')), 'eccentric shaft should use structural steel').toBe(true);

    for (const part of ['fixed-jaw-liner', 'swing-jaw-liner']) {
      const liner = colorsFor(part);
      expect(liner.length, `${part} should render`).toBeGreaterThan(0);
      expect(liner.every(matches('#8e8b84')), `${part} should use manganese steel`).toBe(true);
    }
  }, 120_000);
});
