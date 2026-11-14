// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const repoRoot = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/water-treatment/reverse-osmosis-skid.kcad.ts';

beforeAll(async () => {
  await initOcct();
}, 120_000);

describe('water-treatment/reverse-osmosis-skid materials', () => {
  it('keeps FRP vessel shells distinct from stainless process piping', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(repoRoot, source);
    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
    expect(asset.params.filter((param) => param.type === 'color').map((param) => param.name)).toEqual([
      'coatedSteel', 'structuralSteel', 'stainlessSteel', 'reinforcedComposite',
    ]);
    expect(Object.keys(asset.presets)).toEqual(['weathered', 'highVisibility']);
    for (const preset of Object.values(asset.presets)) {
      expect(preset).toHaveProperty('reinforcedComposite');
    }
    expect(asset.palette.find((zone) => zone.name === 'reinforcedComposite')?.parts).toEqual(
      expect.arrayContaining(['membrane-vessel-1', 'membrane-vessel-2', 'membrane-vessel-3']),
    );
    expect(asset.palette.find((zone) => zone.name === 'stainlessSteel')?.parts).toEqual(
      expect.arrayContaining(['feed-manifold', 'permeate-manifold']),
    );

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
    const frpShell = [0xf0 / 255, 0xee / 255, 0xe7 / 255];
    const stainless = [0xb5 / 255, 0xc0 / 255, 0xc0 / 255];
    const matches = (expected: number[]) => (color: number[]) => expected.every((channel, index) =>
      Math.abs(channel - color[index]!) < 0.015,
    );

    const vesselColors = colorsFor('membrane-vessel-1');
    const manifoldColors = colorsFor('feed-manifold');
    expect(vesselColors.length).toBeGreaterThan(0);
    expect(vesselColors.every(matches(frpShell))).toBe(true);
    expect(manifoldColors.length).toBeGreaterThan(0);
    expect(manifoldColors.every(matches(stainless))).toBe(true);
  }, 120_000);
});
