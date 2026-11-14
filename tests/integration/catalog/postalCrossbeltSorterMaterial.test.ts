// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const repoRoot = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/postal-logistics/crossbelt-sorter-section.kcad.ts';

beforeAll(async () => {
  await initOcct();
}, 120_000);

describe('postal-logistics/crossbelt-sorter-section belt material', () => {
  it('keeps rubber belt surfaces separate from the molded-polymer carriers', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(repoRoot, source);

    expect(asset.stats.triangles).toBeGreaterThan(720);
    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
    [0.775, 0.84, 1.18].forEach((expected, axis) => {
      expect(asset.stats.sizeM[axis]).toBeCloseTo(expected, 5);
    });
    expect(Object.keys(asset.presets)).toEqual(['weathered', 'highVisibility']);
    expect(asset.presets.weathered?.beltRubber).toBe('#3d3d39');
    expect(asset.presets.highVisibility?.beltRubber).toBe('#252b2e');

    const rubber = asset.palette.find((zone) => zone.name === 'beltRubber');
    expect(rubber?.parts).toEqual(['crossbelt-1', 'crossbelt-2', 'crossbelt-3', 'crossbelt-4']);
    const polymer = asset.palette.find((zone) => zone.name === 'polymer');
    expect(polymer?.parts).toEqual(['tray-1', 'tray-2', 'tray-3', 'tray-4']);

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
    const matchesRubber = (color: number[]) => {
      const expected = [1, 3, 5].map((shift) => parseInt('#30373b'.slice(shift, shift + 2), 16) / 255);
      return expected.every((channel, index) => Math.abs(channel - color[index]!) < 0.015);
    };

    for (const name of ['crossbelt-1', 'crossbelt-2', 'crossbelt-3', 'crossbelt-4']) {
      const colors = colorsFor(name);
      expect(colors.length, `expected exported colors for ${name}`).toBeGreaterThan(0);
      expect(colors.every(matchesRubber), `${name} should keep its rubber belt color`).toBe(true);
    }
  }, 120_000);
});
