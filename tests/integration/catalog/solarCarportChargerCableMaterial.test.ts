// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const repoRoot = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/solar-energy/solar-carport-canopy.kcad.ts';

beforeAll(async () => {
  await initOcct();
}, 120_000);

describe('solar-energy/solar-carport-canopy materials', () => {
  it('draws the EV charging cable as a polymer jacket, not galvanized steel', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(repoRoot, source);

    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
    expect(asset.params.filter((param) => param.type === 'color').map((param) => param.name)).toEqual([
      'galvanizedSteel', 'aluminum', 'solarGlass', 'concrete', 'chargerPlastic', 'chargerCable',
    ]);
    expect(Object.keys(asset.presets)).toEqual(['fieldService', 'highVisibility']);
    expect(asset.presets.fieldService).toMatchObject({ chargerCable: '#262b2e' });
    expect(asset.presets.highVisibility).toMatchObject({ chargerCable: '#1b1e20' });

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

    for (const name of ['ev-charger-cable-0', 'ev-charger-cable-1', 'ev-charger-cable-2']) {
      const cable = colorsFor(name);
      expect(cable.length).toBeGreaterThan(0);
      expect(cable.every(matches('#202427')), `${name} should be the charging cable jacket`).toBe(true);
    }
    for (const name of ['column-right-rear', 'girder-left', 'ev-charger-holster']) {
      const part = colorsFor(name);
      expect(part.length).toBeGreaterThan(0);
      expect(part.every(matches('#748184')), `${name} should keep galvanized steel`).toBe(true);
    }
    const housing = colorsFor('ev-charger-housing');
    expect(housing.length).toBeGreaterThan(0);
    expect(housing.every(matches('#2f8f6a')), 'ev-charger-housing should keep the housing colour').toBe(true);
  }, 120_000);
});
