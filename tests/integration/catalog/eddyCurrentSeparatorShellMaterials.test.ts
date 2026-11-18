// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const repoRoot = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/recycling-facility/eddy-current-separator.kcad.ts';

beforeAll(async () => {
  await initOcct();
}, 120_000);

describe('recycling-facility/eddy-current-separator shell material', () => {
  it('assigns the nonconductive composite finish to the outer head shell', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(repoRoot, source);
    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
    expect(asset.params.filter((param) => param.type === 'color').map((param) => param.name)).toEqual([
      'frame', 'belt', 'rotor', 'metal',
    ]);
    expect(Object.keys(asset.presets)).toEqual(['plant', 'weathered', 'copper', 'highVisibility']);
    for (const preset of Object.values(asset.presets)) {
      expect(preset).toHaveProperty('rotor');
    }
    expect(asset.palette.find((zone) => zone.name === 'rotor')?.parts).toEqual(
      expect.arrayContaining(['head-shell']),
    );

    const document = await new NodeIO().readBinary(glb);
    const shell = document.getRoot().listNodes().find((node) => node.getName() === 'head-shell');
    const shellColors = shell?.getMesh()?.listPrimitives().flatMap((primitive) => {
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
    const compositeCharcoal = [0x33 / 255, 0x39 / 255, 0x3d / 255];
    const matchesComposite = (color: number[]) => compositeCharcoal.every((channel, index) =>
      Math.abs(channel - color[index]!) < 0.01,
    );

    expect(shellColors.length).toBeGreaterThan(0);
    expect(shellColors.every(matchesComposite)).toBe(true);
  }, 120_000);
});
