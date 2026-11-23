// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const repoRoot = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/beverage-bottling-line/pet-blow-molder.kcad.ts';

beforeAll(async () => {
  await initOcct();
}, 120_000);

describe('beverage-bottling-line/pet-blow-molder enclosure material', () => {
  it('separates the light enclosure finish from stainless tooling and the powder-coated base', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(repoRoot, source);

    expect(asset.stats.triangles).toBe(364);
    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
    expect(asset.params.filter((param) => param.type === 'color').map((param) => param.name)).toEqual([
      'stainlessSteel', 'powderCoat', 'enclosureCoat',
    ]);
    expect(Object.keys(asset.presets)).toEqual(['sanitaryLine', 'legacyPlant']);

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

    for (const part of ['machine-body', 'service-door-left', 'service-door-right', 'heating-tunnel']) {
      const colors = colorsFor(part);
      expect(colors.length, `${part} should be present in the exported GLB`).toBeGreaterThan(0);
      expect(colors.every(matches('#d2dfe1')), `${part} should use the enclosure finish`).toBe(true);
    }

    expect(colorsFor('mold-column-0').every(matches('#aebdc1'))).toBe(true);
    expect(colorsFor('base').every(matches('#397e91'))).toBe(true);
    expect(colorsFor('control-pedestal').every(matches('#397e91'))).toBe(true);
  }, 120_000);
});
