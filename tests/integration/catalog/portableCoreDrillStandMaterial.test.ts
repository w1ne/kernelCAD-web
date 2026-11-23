// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const repoRoot = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/construction-equipment/portable-core-drill-stand.kcad.ts';

beforeAll(async () => {
  await initOcct();
}, 120_000);

describe('construction-equipment/portable-core-drill-stand material roles', () => {
  it('uses exposed structural steel for the core-bit barrel while keeping the stand painted', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(repoRoot, source);

    expect(asset.stats.triangles).toBe(92);
    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
    expect(asset.stats.sizeM).toEqual([0.5616, 1.1046, 0.4]);
    expect(asset.params.filter((param) => param.type === 'color').map((param) => param.name)).toEqual([
      'equipmentPaintColor', 'structuralSteelColor',
    ]);
    expect(Object.keys(asset.presets)).toEqual(['weathered', 'highVisibility']);
    expect(asset.palette.find((zone) => zone.name === 'structuralSteelColor')?.parts).toContain('core-bit');
    expect(asset.palette.find((zone) => zone.name === 'equipmentPaintColor')?.parts).not.toContain('core-bit');

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

    const bitColors = colorsFor('core-bit');
    expect(bitColors.length, 'core-bit should render in the exported GLB').toBeGreaterThan(0);
    expect(bitColors.every(matches('#89969a')), 'core-bit should use exposed structural steel').toBe(true);

    for (const name of ['drill-base', 'guide-column']) {
      const colors = colorsFor(name);
      expect(colors.length, `${name} should render`).toBeGreaterThan(0);
      expect(colors.every(matches('#e1a31b')), `${name} should retain equipment enamel`).toBe(true);
    }
  }, 120_000);
});
