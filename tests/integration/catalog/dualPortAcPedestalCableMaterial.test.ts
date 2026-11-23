// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const repoRoot = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/ev-charging-infrastructure/dual-port-ac-pedestal.kcad.ts';

beforeAll(async () => {
  await initOcct();
}, 120_000);

describe('ev-charging-infrastructure/dual-port-ac-pedestal materials', () => {
  it('gives the hanging cable leads a cable-elastomer finish, distinct from the powder-coated enclosure', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(repoRoot, source);

    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
    expect(asset.params.filter((param) => param.type === 'color').map((param) => param.name)).toEqual([
      'powderCoat', 'displayGlass', 'safetyPolymer', 'engineeringPolymer', 'cableElastomer',
    ]);
    expect(Object.keys(asset.presets)).toEqual(['fleetReady', 'nightService']);
    for (const preset of Object.values(asset.presets)) {
      expect(preset).toHaveProperty('cableElastomer');
    }

    const cable = asset.palette.find((zone) => zone.name === 'cableElastomer');
    expect(cable?.parts).toEqual(['left-cable', 'right-cable']);
    const coat = asset.palette.find((zone) => zone.name === 'powderCoat');
    expect(coat?.parts).not.toContain('left-cable');
    expect(coat?.parts).not.toContain('right-cable');
    expect(coat?.parts).toContain('main-enclosure');

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

    for (const name of ['left-cable', 'right-cable']) {
      const colors = colorsFor(name);
      expect(colors.length, `expected exported colors for ${name}`).toBeGreaterThan(0);
      expect(colors.every(matches('#1b2427')), `${name} should use the cable-elastomer finish`).toBe(true);
    }

    for (const name of ['main-enclosure', 'pedestal-column']) {
      const colors = colorsFor(name);
      expect(colors.length, `expected exported colors for ${name}`).toBeGreaterThan(0);
      expect(colors.every(matches('#397f90')), `${name} should keep the powder-coat finish`).toBe(true);
    }
  }, 120_000);
});
