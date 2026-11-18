// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const repoRoot = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/wind-energy/oil-cooler-module.kcad.ts';

beforeAll(async () => {
  await initOcct();
}, 120_000);

describe('wind-energy/oil-cooler-module materials', () => {
  it('makes the oil headers aluminium like the brazed core, not the copper pipework', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(repoRoot, source);

    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
    expect(asset.params.filter((param) => param.type === 'color').map((param) => param.name)).toEqual([
      'powderCoatedSteel', 'aluminium', 'fanBlade', 'pipework',
    ]);
    expect(Object.keys(asset.presets)).toEqual(['weathered', 'highVisibility', 'nacelleWhite']);

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

    for (const name of ['header-top', 'header-bottom']) {
      const header = colorsFor(name);
      expect(header.length).toBeGreaterThan(0);
      expect(header.every(matches('#aab7bb')), `${name} should be the aluminium core finish`).toBe(true);
    }
    for (const name of ['inlet-line', 'outlet-line', 'thermostatic-bypass']) {
      const line = colorsFor(name);
      expect(line.length).toBeGreaterThan(0);
      expect(line.every(matches('#9a5a32')), `${name} should keep the oil pipework`).toBe(true);
    }
  }, 120_000);
});
