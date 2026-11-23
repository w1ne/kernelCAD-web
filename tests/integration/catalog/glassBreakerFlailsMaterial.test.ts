// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const repoRoot = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/recycling-facility/glass-breaker-screen.kcad.ts';

beforeAll(async () => {
  await initOcct();
}, 120_000);

describe('recycling-facility/glass-breaker-screen flail materials', () => {
  it('keeps all chain flails on the editable wear-steel control', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(repoRoot, source);

    // Export cleanup removes redundant coplanar rows. Geometry envelope,
    // part inventory, and editable material assignments are checked below.
    expect(asset.stats.triangles).toBe(2936);
    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
    expect(asset.params.filter((param) => param.type === 'color').map((param) => param.name)).toEqual([
      'housing', 'wearSteel', 'glass', 'labels',
    ]);
    expect(Object.keys(asset.presets)).toEqual(['plant', 'weathered', 'highVisibility', 'flintLine']);

    const flailNames = Array.from({ length: 16 }, (_, index) => `flail-${Math.floor(index / 4)}-${index % 4}`);
    const wearSteel = asset.palette.find((zone) => zone.name === 'wearSteel');
    expect(wearSteel?.parts).toEqual(expect.arrayContaining(flailNames));
    expect(wearSteel?.parts).toHaveLength(23);

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
    const matchesWearSteel = (color: number[]) => {
      const expected = [0x9a, 0xa2, 0xa7].map((channel) => channel / 255);
      return expected.every((channel, index) => Math.abs(channel - color[index]!) < 0.015);
    };

    for (const name of flailNames) {
      const colors = colorsFor(name);
      expect(colors.length, `${name} should render`).toBeGreaterThan(0);
      expect(colors.every(matchesWearSteel), `${name} should use the wear-steel control`).toBe(true);
    }
  }, 120_000);
});
