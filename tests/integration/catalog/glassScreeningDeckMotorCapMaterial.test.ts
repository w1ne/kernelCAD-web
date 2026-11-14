// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const repoRoot = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/recycling-facility/glass-screening-deck.kcad.ts';

beforeAll(async () => {
  await initOcct();
}, 120_000);

describe('recycling-facility/glass-screening-deck motor cap material', () => {
  it('keeps motor end caps with the motor enamel, separate from polyurethane panels', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(repoRoot, source);

    expect(asset.stats.triangles).toBe(2016);
    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
    expect(asset.stats.sizeM).toEqual([5.975, 2.9, 3.945]);
    expect(asset.params.filter((param) => param.type === 'color').map((param) => param.name)).toEqual([
      'frame', 'panels', 'cullet', 'bins',
    ]);
    expect(Object.keys(asset.presets)).toEqual(['plant', 'flintLine', 'weathered', 'highVisibility']);

    const panels = asset.palette.find((zone) => zone.name === 'panels');
    expect(panels?.parts).toContain('upper-panel-0-f');
    expect(panels?.parts).not.toContain('motor-cap-f');
    expect(panels?.parts).not.toContain('motor-cap-b');

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

    for (const name of ['motor-f', 'motor-b', 'motor-cap-f', 'motor-cap-b']) {
      const colors = colorsFor(name);
      expect(colors.length, `expected exported colors for ${name}`).toBeGreaterThan(0);
      expect(colors.every(matches('#26292c')), `${name} should use the motor enamel`).toBe(true);
    }

    for (const name of ['upper-panel-0-f', 'lower-panel-0']) {
      const colors = colorsFor(name);
      expect(colors.length, `expected exported colors for ${name}`).toBeGreaterThan(0);
      expect(colors.every(matches('#d4572e')), `${name} should keep the polyurethane panel color`).toBe(true);
    }
  }, 120_000);
});
