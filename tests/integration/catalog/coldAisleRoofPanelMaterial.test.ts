// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const repoRoot = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/data-center-infrastructure/cold-aisle-roof-panel.kcad.ts';
const roofPanels = ['roof-panel-0', 'roof-panel-1', 'roof-panel-2', 'roof-panel-3', 'roof-panel-4'];

beforeAll(async () => {
  await initOcct();
}, 120_000);

describe('data-center-infrastructure/cold-aisle-roof-panel materials', () => {
  it('makes every containment roof panel from the polymer, not one panel of five', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(repoRoot, source);

    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
    expect(asset.params.filter((param) => param.type === 'color').map((param) => param.name)).toEqual([
      'steel', 'polymer',
    ]);
    expect(Object.keys(asset.presets)).toEqual(['facilityStandard', 'highVisibility']);

    const polymer = asset.palette.find((zone) => zone.name === 'polymer');
    const steel = asset.palette.find((zone) => zone.name === 'steel');
    expect(polymer?.parts).toEqual(expect.arrayContaining(roofPanels));
    for (const panel of roofPanels) expect(steel?.parts).not.toContain(panel);
    expect(steel?.parts).toContain('canopy-frame-front');

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

    for (const panel of roofPanels) {
      const colors = colorsFor(panel);
      expect(colors.length, `expected exported colors for ${panel}`).toBeGreaterThan(0);
      expect(colors.every(matches('#c99b35')), `${panel} should use the polymer`).toBe(true);
    }
    const frame = colorsFor('canopy-frame-front');
    expect(frame.length).toBeGreaterThan(0);
    expect(frame.every(matches('#4f7485')), 'the canopy frame should stay painted steel').toBe(true);
  }, 120_000);
});
