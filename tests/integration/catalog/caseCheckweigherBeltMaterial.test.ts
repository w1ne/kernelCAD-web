// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const repoRoot = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/beverage-bottling-line/case-checkweigher.kcad.ts';

beforeAll(async () => {
  await initOcct();
}, 120_000);

describe('beverage-bottling-line/case-checkweigher belt material', () => {
  it('keeps the three polymer belts separate from the stainless support beds', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(repoRoot, source);

    expect(asset.stats.triangles).toBe(248);
    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
    expect(asset.triangleBudget).toBe(320);
    [1.26, 0.78, 0.785].forEach((expected, axis) => {
      expect(asset.stats.sizeM[axis]).toBeCloseTo(expected, 5);
    });
    expect(asset.description).toContain('separate infeed, isolated weigh belt, outfeed');
    expect(asset.description).not.toContain('reject output');
    expect(asset.params.filter((param) => param.type === 'color').map((param) => param.name)).toEqual([
      'stainlessSteel', 'powderCoat', 'safetyPaint', 'beltPolymer',
    ]);
    expect(Object.keys(asset.presets)).toEqual(['sanitaryLine', 'legacyPlant']);
    expect(asset.presets.sanitaryLine?.beltPolymer).toBe('#edf0e8');
    expect(asset.presets.legacyPlant?.beltPolymer).toBe('#292f32');

    const belt = asset.palette.find((zone) => zone.name === 'beltPolymer');
    expect(belt?.color).toBe('#30373b');
    expect(belt?.parts).toEqual(['infeed-belt', 'weigh-belt', 'outfeed-belt']);
    const steel = asset.palette.find((zone) => zone.name === 'stainlessSteel');
    expect(steel?.parts).toEqual(expect.arrayContaining(['left-bed', 'weigh-bed', 'right-bed']));
    expect(steel?.parts).not.toContain('weigh-belt');

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
    const expectedPolymer = [0x30 / 255, 0x37 / 255, 0x3b / 255];
    const matchesPolymer = (color: number[]) => expectedPolymer.every((channel, index) =>
      Math.abs(channel - color[index]!) < 0.015,
    );

    for (const name of ['infeed-belt', 'weigh-belt', 'outfeed-belt']) {
      const colors = colorsFor(name);
      expect(colors.length, `expected exported colors for ${name}`).toBeGreaterThan(0);
      expect(colors.every(matchesPolymer), `${name} should use the polymer belt control`).toBe(true);
    }
  }, 120_000);
});
