// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const repoRoot = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/postal-logistics/sliding-shoe-sorter-section.kcad.ts';

beforeAll(async () => {
  await initOcct();
}, 120_000);

describe('postal-logistics/sliding-shoe-sorter-section materials', () => {
  it('finishes the shoe guide rail as stainless steel, not the safety-amber marking', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(repoRoot, source);

    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
    expect(asset.params.filter((param) => param.type === 'color').map((param) => param.name)).toEqual([
      'paintedSteel', 'safetyAmber', 'structuralSteel', 'stainlessSteel',
    ]);
    expect(Object.keys(asset.presets)).toEqual(['weathered', 'highVisibility']);

    const stainless = asset.palette.find((zone) => zone.name === 'stainlessSteel');
    const amber = asset.palette.find((zone) => zone.name === 'safetyAmber');
    expect(stainless?.parts).toContain('shoe-rail');
    expect(amber?.parts).not.toContain('shoe-rail');
    expect(amber?.parts).toContain('shoe-a');

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

    const rail = colorsFor('shoe-rail');
    expect(rail.length, 'expected exported colors for shoe-rail').toBeGreaterThan(0);
    expect(rail.every(matches('#bbc4c4')), 'shoe-rail should use the stainless steel').toBe(true);

    const shoe = colorsFor('shoe-a');
    expect(shoe.length).toBeGreaterThan(0);
    expect(shoe.every(matches('#e7aa35')), 'diverter shoes should keep the safety amber').toBe(true);
  }, 120_000);
});
