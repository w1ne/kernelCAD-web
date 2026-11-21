// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const repoRoot = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/telecom-infrastructure/gnss-timing-antenna.kcad.ts';

beforeAll(async () => {
  await initOcct();
}, 120_000);

describe('telecom-infrastructure/gnss-timing-antenna radome material', () => {
  it('covers the antenna element with one polymer radome and no metal cap', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(repoRoot, source);

    expect(Object.keys(asset.presets)).toEqual(['fieldSite', 'highVisibility']);
    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
    expect(asset.stats.minUpM).toBeCloseTo(0, 6);

    const document = await new NodeIO().readBinary(glb);
    const nodes = document.getRoot().listNodes();
    const names = nodes.map((node) => node.getName());
    const colorsFor = (name: string) => {
      const node = nodes.find((candidate) => candidate.getName() === name);
      expect(node, `${name} should export`).toBeDefined();
      return node!.getMesh()?.listPrimitives().flatMap((primitive) => {
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
    const expectFinish = (partNames: string[], hex: string, finish: string) => {
      for (const name of partNames) {
        const colors = colorsFor(name);
        expect(colors.length, `${name} should render`).toBeGreaterThan(0);
        expect(colors.every(matches(hex)), `${name} should use ${finish}`).toBe(true);
      }
    };

    // Metal above a GNSS patch blocks the satellite signal: the top part must be the polymer radome.
    expect(names, 'no powder-coated steel cap may sit over the antenna element').not.toContain('cap');
    expectFinish(['radome'], '#eceee9', 'the polymer radome colour');
    expectFinish(['base-skirt', 'bush', 'cable-gland', 'cable-run', 'cable-drop'], '#22282b', 'the dark polymer');
    expectFinish(['pole', 'bolt-0', 'bolt-1', 'bolt-2', 'bolt-3'], '#77868d', 'the galvanized finish');
    expectFinish(['base'], '#318b96', 'the powder-coated plate finish');

    const colorParams = asset.params.filter((param) => param.type === 'color');
    expect(colorParams.map((param) => param.name).sort()).toEqual(['galvanizedSteel', 'polymer', 'powderCoat', 'radome']);

    // Vertical extent in metres of a node's mesh after its world matrix (mm Z-up -> m Y-up).
    const heights = (name: string) => {
      const node = nodes.find((candidate) => candidate.getName() === name)!;
      const m = node.getWorldMatrix();
      const ys = node.getMesh()!.listPrimitives().flatMap((primitive) => {
        const position = primitive.getAttribute('POSITION')!;
        return Array.from({ length: position.getCount() }, (_, index) => {
          const [x, y, z] = position.getElement(index, []) as [number, number, number];
          return m[1]! * x + m[5]! * y + m[9]! * z + m[13]!;
        });
      });
      return [Math.min(...ys), Math.max(...ys)];
    };
    const [, radomeTop] = heights('radome');
    for (const name of names.filter((name) => name !== 'radome' && nodes.find((n) => n.getName() === name)?.getMesh())) {
      expect(heights(name)[1], `${name} should stay below the radome top`).toBeLessThan(radomeTop - 0.05);
    }
    expect(heights('radome')[0], 'radome should sit on the base skirt').toBeCloseTo(heights('base-skirt')[1], 3);

    expect(asset.description).toMatch(/white polymer radome .* with no metal above the antenna element/i);
  }, 120_000);
});
