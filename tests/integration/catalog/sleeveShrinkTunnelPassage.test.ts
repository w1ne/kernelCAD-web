// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const repoRoot = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/beverage-bottling-line/sleeve-shrink-tunnel.kcad.ts';

beforeAll(async () => {
  await initOcct();
}, 120_000);

describe('beverage-bottling-line/sleeve-shrink-tunnel passage', () => {
  it('opens a bottle passage through the shell and carries sleeved bottles on the bed', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(repoRoot, source);

    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
    expect(asset.params.filter((param) => param.type === 'color').map((param) => param.name)).toEqual([
      'stainlessSteel', 'powderCoat', 'sleeveFilm', 'petBottle',
    ]);
    expect(Object.keys(asset.presets)).toEqual(['sanitaryLine', 'legacyPlant']);

    const document = await new NodeIO().readBinary(glb);
    const nodes = document.getRoot().listNodes();
    const nodeFor = (name: string) => {
      const node = nodes.find((candidate) => candidate.getName() === name);
      expect(node, name).toBeDefined();
      return node!;
    };
    // Vertices are in model millimetres, Z up.
    const verticesFor = (name: string) => nodeFor(name).getMesh()!.listPrimitives().flatMap((primitive) => {
      const positions = primitive.getAttribute('POSITION')!;
      return Array.from({ length: positions.getCount() }, (_, index) =>
        positions.getElement(index, []));
    });
    const colorsFor = (name: string) => nodeFor(name).getMesh()!.listPrimitives().flatMap((primitive) => {
      const vertexColors = primitive.getAttribute('COLOR_0');
      if (vertexColors !== null) {
        return Array.from({ length: vertexColors.getCount() }, (_, index) =>
          vertexColors.getElement(index, []).slice(0, 3).map((channel) =>
            channel <= 0.0031308 ? 12.92 * channel : 1.055 * channel ** (1 / 2.4) - 0.055));
      }
      const material = primitive.getMaterial();
      return material === null ? [] : [material.getBaseColorFactor().slice(0, 3)];
    });
    const matches = (hex: string) => {
      const expected = [1, 3, 5].map((shift) => parseInt(hex.slice(shift, shift + 2), 16) / 255);
      return (color: number[]) => expected.every((channel, index) => Math.abs(channel - color[index]!) < 0.015);
    };

    // The shell sits on the conveyor bed instead of floating above it.
    const bedTop = Math.max(...verticesFor('conveyor-bed').map((vertex) => vertex[2]!));
    const shellBottom = Math.min(...verticesFor('tunnel-shell').map((vertex) => vertex[2]!));
    expect(Math.abs(shellBottom - bedTop)).toBeLessThan(1);

    // Each end collar is a frame: it has vertices on the 220 mm passage edge, not a solid plate.
    for (const name of ['opening-collar-infeed', 'opening-collar-outfeed', 'tunnel-shell']) {
      const lateral = verticesFor(name).map((vertex) => Math.abs(vertex[1]!));
      expect(lateral.some((value) => Math.abs(value - 110) < 1), `${name} should be cut by the passage`).toBe(true);
      const colors = colorsFor(name);
      expect(colors.length, name).toBeGreaterThan(0);
      expect(colors.every(matches('#aebdc1')), `${name} should be stainless steel`).toBe(true);
    }

    for (const name of ['bottle-infeed-sleeve', 'bottle-in-tunnel-sleeve', 'bottle-outfeed-sleeve']) {
      const colors = colorsFor(name);
      expect(colors.length, name).toBeGreaterThan(0);
      expect(colors.every(matches('#c8423a')), `${name} should be printed sleeve film`).toBe(true);
    }
  }, 120_000);
});
