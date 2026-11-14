// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const repoRoot = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/shipyard/weld-inspection-light-stand.kcad.ts';

beforeAll(async () => {
  await initOcct();
}, 120_000);

describe('shipyard/weld-inspection-light-stand materials', () => {
  it('gives the lamp lenses their own lens finish, distinct from the yellow lamp housings', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(repoRoot, source);

    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
    expect(asset.params.filter((param) => param.type === 'color').map((param) => param.name)).toEqual([
      'yardPaint', 'structuralSteel', 'safetyMarking', 'lampLens',
    ]);
    expect(Object.keys(asset.presets)).toEqual(['fresh-coat', 'weathered-yard']);
    for (const preset of Object.values(asset.presets)) {
      expect(preset).toHaveProperty('lampLens');
    }

    const lens = asset.palette.find((zone) => zone.name === 'lampLens');
    expect(lens?.parts).toEqual(['lamp-lens-0', 'lamp-lens-1']);
    const safety = asset.palette.find((zone) => zone.name === 'safetyMarking');
    expect(safety?.parts).toEqual(['lamp-head-0', 'lamp-head-1']);

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

    for (const name of ['lamp-lens-0', 'lamp-lens-1']) {
      const colors = colorsFor(name);
      expect(colors.length, `expected exported colors for ${name}`).toBeGreaterThan(0);
      expect(colors.every(matches('#f3f0d8')), `${name} should use the lamp-lens finish`).toBe(true);
    }

    for (const name of ['lamp-head-0', 'lamp-head-1']) {
      const colors = colorsFor(name);
      expect(colors.length, `expected exported colors for ${name}`).toBeGreaterThan(0);
      expect(colors.every(matches('#efb934')), `${name} should keep the safety-marking finish`).toBe(true);
    }
  }, 120_000);
});
