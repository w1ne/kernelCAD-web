// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const repoRoot = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/recycling-facility/conveyor-transfer-tower.kcad.ts';

beforeAll(async () => {
  await initOcct();
}, 120_000);

describe('recycling-facility/conveyor-transfer-tower roof material', () => {
  it('keeps the sheet roof on cladding and the access steel on structure', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(repoRoot, source);

    expect(asset.stats.triangles).toBe(2054);
    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
    [17.83, 6.8, 3.902507].forEach((expected, axis) => {
      expect(asset.stats.sizeM[axis]).toBeCloseTo(expected, 5);
    });
    expect(asset.params.filter((param) => param.type === 'color').map((param) => param.name)).toEqual([
      'cladding', 'structure', 'gallery', 'belts',
    ]);
    expect(Object.keys(asset.presets)).toEqual(['plant', 'weathered', 'highVisibility', 'oxide']);

    const cladding = asset.palette.find((zone) => zone.name === 'cladding');
    expect(cladding?.parts).toEqual(expect.arrayContaining([
      'tower-body', 'roof', 'tail-house', 'tail-house-roof',
    ]));
    const structure = asset.palette.find((zone) => zone.name === 'structure');
    expect(structure?.parts).toEqual(expect.arrayContaining([
      'column-lf', 'column-rf', 'roof-vent-cap', 'ladder-rung-0',
    ]));
    expect(structure?.parts).not.toContain('roof');
    expect(structure?.parts).not.toContain('tail-house-roof');

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
    const rgb = (hex: string) => [1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255);
    const matches = (expected: number[]) => (color: number[]) => expected.every((channel, index) =>
      Math.abs(channel - color[index]!) < 0.015,
    );

    for (const [part, color] of [
      ['roof', rgb('#b9c2c4')],
      ['tail-house-roof', rgb('#b9c2c4')],
      ['tower-body', rgb('#b9c2c4')],
      ['column-lf', rgb('#e0a526')],
      ['roof-vent-cap', rgb('#e0a526')],
    ] as const) {
      const colors = colorsFor(part);
      expect(colors.length, `expected exported colors for ${part}`).toBeGreaterThan(0);
      expect(colors.every(matches(color)), `${part} should keep its intended material`).toBe(true);
    }
  }, 120_000);
});
