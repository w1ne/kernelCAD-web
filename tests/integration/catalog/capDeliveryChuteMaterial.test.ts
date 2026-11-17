// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const repoRoot = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/beverage-bottling-line/cap-delivery-chute.kcad.ts';

beforeAll(async () => {
  await initOcct();
}, 120_000);

describe('beverage-bottling-line/cap-delivery-chute materials', () => {
  it('renders the clear side slot as polycarbonate between stainless wall strips', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(repoRoot, source);

    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
    expect(asset.params.filter((param) => param.type === 'color').map((param) => param.name)).toEqual([
      'stainlessSteel', 'powderCoat', 'clearPolycarbonate',
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

    const slot = colorsFor('side-slot-window');
    expect(slot.length).toBeGreaterThan(0);
    expect(slot.every(matches('#8fd0e6')), 'the side slot should be clear polycarbonate').toBe(true);
    for (const name of ['side-left-kick-strip', 'side-left-top-strip', 'side-right', 'cover', 'chute-floor']) {
      const colors = colorsFor(name);
      expect(colors.length, name).toBeGreaterThan(0);
      expect(colors.every(matches('#aebdc1')), `${name} should be stainless steel`).toBe(true);
    }
  }, 120_000);
});
