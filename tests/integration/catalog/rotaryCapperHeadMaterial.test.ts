// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const repoRoot = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/beverage-bottling-line/rotary-capper.kcad.ts';

beforeAll(async () => {
  await initOcct();
}, 120_000);

describe('beverage-bottling-line/rotary-capper materials', () => {
  it('renders the torque capping heads as stainless steel, not food-grade polymer', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(repoRoot, source);

    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
    expect(asset.params.filter((param) => param.type === 'color').map((param) => param.name)).toEqual([
      'stainlessSteel', 'powderCoat', 'foodPolymer',
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

    for (let index = 0; index < 8; index += 1) {
      const head = colorsFor(`capper-head-${index}`);
      expect(head.length, `capper-head-${index} mesh`).toBeGreaterThan(0);
      expect(head.every(matches('#aebdc1')), `capper-head-${index} should be stainless steel`).toBe(true);
    }
    const column = colorsFor('turret-column');
    expect(column.length).toBeGreaterThan(0);
    expect(column.every(matches('#aebdc1')), 'turret column should stay stainless steel').toBe(true);
    const guard = colorsFor('front-guard');
    expect(guard.length).toBeGreaterThan(0);
    expect(guard.every(matches('#397e91')), 'front guard should stay powder-coated steel').toBe(true);
  }, 120_000);
});
