// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const repoRoot = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/telecom-infrastructure/wall-mast-bracket.kcad.ts';

beforeAll(async () => {
  await initOcct();
}, 120_000);

describe('telecom-infrastructure/wall-mast-bracket bracket material', () => {
  it('makes the welded bracket one galvanized finish that clamps a mast with stainless U-bolts', async () => {
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

    // The wall plate, arms, gussets and saddles are one welded part: one galvanized finish.
    const ids = ['lower', 'upper'];
    expectFinish(['backplate'], '#77868d', 'the galvanized finish of the welded bracket');
    for (const name of ['clamp-upper', 'clamp-lower', 'gusset-a', 'gusset-b']) expect(names).not.toContain(name);
    expectFinish(
      ['mast', ...ids.flatMap((id) => [`arm-${id}`, `gusset-${id}`, `saddle-${id}`])],
      '#77868d',
      'the galvanized finish',
    );
    expectFinish(
      [
        ...[0, 1, 2, 3].map((n) => `anchor-bolt-${n}`),
        ...ids.flatMap((id) => [0, 1].flatMap((j) => [`u-bolt-${id}-${j}`, `nut-${id}-${j}-0`, `nut-${id}-${j}-1`])),
      ],
      '#d2dbdc',
      'stainless steel',
    );
    expectFinish(['mast-cap-top', 'mast-cap-bottom'], '#22292d', 'the polymer end cap');

    const colorParams = asset.params.filter((param) => param.type === 'color');
    expect(colorParams.map((param) => param.name).sort()).toEqual(['galvanizedSteel', 'polymer', 'stainlessSteel']);

    // World-space bounds in metres of a node's mesh (mm Z-up -> m Y-up).
    const bounds = (name: string) => {
      const node = nodes.find((candidate) => candidate.getName() === name)!;
      const m = node.getWorldMatrix();
      const points = node.getMesh()!.listPrimitives().flatMap((primitive) => {
        const position = primitive.getAttribute('POSITION')!;
        return Array.from({ length: position.getCount() }, (_, index) => {
          const [x, y, z] = position.getElement(index, []) as [number, number, number];
          return [0, 1, 2].map((axis) => m[axis]! * x + m[4 + axis]! * y + m[8 + axis]! * z + m[12 + axis]!);
        });
      });
      return [0, 1, 2].map((axis) => {
        const values = points.map((point) => point[axis]!);
        return [Math.min(...values), Math.max(...values)];
      });
    };
    // Y-up metres: index 0 = x, 1 = height, 2 = distance out from the wall.
    const plate = bounds('backplate');
    const mast = bounds('mast');
    expect(plate[1]![0], 'the wall plate should start at the ground line').toBeCloseTo(0, 3);
    for (const id of ids) {
      const arm = bounds(`arm-${id}`);
      const saddle = bounds(`saddle-${id}`);
      // The arm runs from the plate face to the saddle; the mast bears on the saddle face.
      expect(Math.abs(arm[2]![0] - plate[2]![1]), `arm-${id} should start at the plate face`).toBeLessThan(0.002);
      expect(Math.abs(saddle[2]![0] - arm[2]![1]), `saddle-${id} should close the arm end`).toBeLessThan(0.002);
      expect(Math.abs(mast[2]![0] - saddle[2]![1]), `the mast should bear on saddle-${id}`).toBeLessThan(0.002);
      const gusset = bounds(`gusset-${id}`);
      expect(Math.abs(gusset[1]![1] - arm[1]![0]), `gusset-${id} should sit under its arm`).toBeLessThan(0.002);
      for (const j of [0, 1]) {
        const bolt = bounds(`u-bolt-${id}-${j}`);
        // The U-bolt wraps the far side of the mast and its legs pass back through the saddle.
        expect(bolt[0]![0], `u-bolt-${id}-${j} should wrap the mast`).toBeLessThan(mast[0]![0]);
        expect(bolt[0]![1], `u-bolt-${id}-${j} should wrap the mast`).toBeGreaterThan(mast[0]![1]);
        expect(bolt[2]![1], `u-bolt-${id}-${j} should wrap the mast`).toBeGreaterThan(mast[2]![1]);
        expect(bolt[2]![0], `u-bolt-${id}-${j} legs should pass the saddle`).toBeLessThan(saddle[2]![0]);
        expect(bolt[1]![0]).toBeGreaterThan(mast[1]![0]);
        expect(bolt[1]![1]).toBeLessThan(mast[1]![1]);
      }
    }

    expect(asset.description).toMatch(/clamp a mast pipe with stainless U-bolts/i);
  }, 120_000);
});
