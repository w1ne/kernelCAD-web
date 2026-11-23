// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { resolve } from 'node:path';
import { getBounds, NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const repoRoot = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/water-treatment/ferric-dosing-tank.kcad.ts';

beforeAll(async () => {
  await initOcct();
}, 120_000);

describe('water-treatment/ferric-dosing-tank polymer materials', () => {
  it('draws a polyethylene tank and bund with PVC pipework and a seated sight tube', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(repoRoot, source);

    expect(asset.stats.triangles).toBe(360);
    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
    expect(asset.stats.minUpM).toBeCloseTo(0, 6);
    expect(asset.params.filter((param) => param.type === 'color').map((param) => param.name).sort()).toEqual([
      'bundPolymer', 'pipePvc', 'sightTube', 'tankPolymer',
    ]);
    expect(Object.keys(asset.presets)).toEqual(['weathered', 'highVisibility']);
    expect(Object.keys(asset.presets.weathered!).sort()).toEqual(['bundPolymer', 'pipePvc', 'sightTube', 'tankPolymer']);

    const document = await new NodeIO().readBinary(glb);
    const nodes = document.getRoot().listNodes();
    const nodeFor = (name: string) => {
      const node = nodes.find((candidate) => candidate.getName() === name);
      expect(node, `${name} should export`).toBeDefined();
      return node!;
    };
    const colorsFor = (name: string) =>
      nodeFor(name).getMesh()?.listPrimitives().flatMap((primitive) => {
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
    const matches = (hex: string) => {
      const expected = [1, 3, 5].map((shift) => parseInt(hex.slice(shift, shift + 2), 16) / 255);
      return (color: number[]) => expected.every((channel, index) =>
        Math.abs(channel - color[index]!) < 0.015,
      );
    };
    const expectFinish = (names: string[], hex: string, finish: string) => {
      for (const name of names) {
        const colors = colorsFor(name);
        expect(colors.length, `${name} should render`).toBeGreaterThan(0);
        expect(colors.every(matches(hex)), `${name} should use ${finish}`).toBe(true);
      }
    };

    expectFinish(['tank', 'lid'], '#e6dfc4', 'the tank polyethylene');
    expectFinish(['bund'], '#5f7f95', 'the bund polyethylene');
    expectFinish(['vent', 'outlet'], '#8b9499', 'the PVC pipework finish');
    expectFinish(['level-column'], '#9a5a2a', 'the level sight tube colour');

    // GLB is Y up; the tank axis is the Y axis through the origin.
    const extent = (name: string) => {
      const { min, max } = getBounds(nodeFor(name));
      return { min, max, size: max.map((value, axis) => value - min[axis]!) };
    };
    const tank = extent('tank');
    const bund = extent('bund');
    const tankRadius = 0.21;

    // The sight tube touches the tank shell; before the fix its nearest corner stood 40 mm off it.
    const column = extent('level-column');
    const nearest = (low: number, high: number) => (low > 0 ? low : high < 0 ? high : 0);
    const columnGap = Math.hypot(
      nearest(column.min[0]!, column.max[0]!),
      nearest(column.min[2]!, column.max[2]!),
    );
    expect(columnGap, 'sight tube should touch the tank shell').toBeLessThanOrEqual(tankRadius);
    expect(columnGap, 'sight tube should stay on the outside of the shell').toBeGreaterThan(tankRadius - 0.02);
    expect(column.min[1]!).toBeGreaterThan(tank.min[1]!);
    expect(column.max[1]!).toBeLessThan(tank.max[1]!);

    // The dosing outlet is a horizontal stub that leaves the tank wall above the bund floor.
    const outlet = extent('outlet');
    const horizontal = Math.max(outlet.size[0]!, outlet.size[2]!);
    expect(horizontal, 'outlet should lie horizontal').toBeGreaterThan(outlet.size[1]! * 2);
    expect(outlet.min[1]!, 'outlet should clear the bund floor').toBeGreaterThan(bund.max[1]!);
    const reach = Math.max(
      Math.abs(outlet.min[0]!), Math.abs(outlet.max[0]!), Math.abs(outlet.min[2]!), Math.abs(outlet.max[2]!),
    );
    expect(reach, 'outlet should leave the tank shell').toBeGreaterThan(tankRadius + 0.08);
    for (const axis of [0, 2]) {
      expect(outlet.min[axis]!).toBeGreaterThanOrEqual(bund.min[axis]! - 1e-6);
      expect(outlet.max[axis]!).toBeLessThanOrEqual(bund.max[axis]! + 1e-6);
    }

    const all = getBounds(document.getRoot().listScenes()[0]!);
    expect(all.max[0]! - all.min[0]!).toBeCloseTo(0.65, 3);
    expect(all.max[1]! - all.min[1]!).toBeCloseTo(0.845, 3);
    expect(all.max[2]! - all.min[2]!).toBeCloseTo(0.52, 3);
  }, 120_000);
});
