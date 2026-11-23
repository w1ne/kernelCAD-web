// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const repoRoot = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/telecom-infrastructure/fiber-drop-terminal.kcad.ts';

beforeAll(async () => {
  await initOcct();
}, 120_000);

describe('telecom-infrastructure/fiber-drop-terminal housing material', () => {
  it('makes the drop terminal a moulded polymer housing with capped ports on a stainless pole bracket', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(repoRoot, source);

    expect(Object.keys(asset.presets)).toEqual(['fieldSite', 'highVisibility']);
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

    // A fiber drop terminal is a moulded polymer housing: no powder-coated steel case, hood or face.
    const colorParams = asset.params.filter((param) => param.type === 'color');
    expect(colorParams.map((param) => param.name).sort(), 'the terminal should have no powder-coated steel finish').toEqual([
      'housing',
      'poleWood',
      'polymer',
      'stainlessSteel',
    ]);
    for (const name of ['case', 'hood', 'face', 'port-0']) expect(names).not.toContain(name);
    const ports = [0, 1, 2, 3, 4, 5];
    expectFinish(['housing', ...ports.map((i) => `port-boss-${i}`)], '#3d4347', 'the moulded polymer housing');
    expectFinish(
      [...ports.map((i) => `port-cap-${i}`), 'lid-seam', 'tether-gland', 'tether-cable'],
      '#15191c',
      'the black polymer finish',
    );
    expectFinish(['bracket', 'band-strap-0', 'band-strap-1', ...[0, 1, 2, 3].map((i) => `lid-screw-${i}`)], '#d2dbdc', 'stainless steel');
    expectFinish(['pole'], '#7a5b3e', 'pole wood');

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
    // Y-up metres: index 0 = x, 1 = height, 2 = distance out of the front face.
    const near = (a: number, b: number) => Math.abs(a - b) < 0.002;
    const pole = bounds('pole');
    const bracket = bounds('bracket');
    const housing = bounds('housing');
    const seam = bounds('lid-seam');
    expect(near(pole[1]![0], 0), 'the pole section should stand on the ground').toBe(true);
    // Pole -> bracket -> housing stack from back to front without gaps.
    expect(near(bracket[2]![0], pole[2]![1]), 'the bracket should sit on the pole front').toBe(true);
    expect(near(housing[2]![0], bracket[2]![1]), 'the housing back should sit on the bracket').toBe(true);
    expect(bracket[1]![0] < housing[1]![0] && bracket[1]![1] > housing[1]![1], 'the bracket should span the housing height').toBe(true);
    expect(housing[0]![1] - housing[0]![0], 'the housing should be wider than the pole').toBeGreaterThan(pole[0]![1] - pole[0]![0]);
    for (const i of [0, 1]) {
      const strap = bounds(`band-strap-${i}`);
      for (const axis of [0, 2]) {
        expect(strap[axis]![0], `band-strap-${i} should wrap the pole`).toBeLessThan(pole[axis]![0]);
        expect(strap[axis]![1], `band-strap-${i} should wrap the pole`).toBeGreaterThan(pole[axis]![1]);
      }
      expect(strap[1]![0] > bracket[1]![0] && strap[1]![1] < bracket[1]![1], `band-strap-${i} should be within the bracket height`).toBe(true);
    }
    // The lid seam rings the housing between its bottom and top.
    expect(seam[1]![0] > housing[1]![0] && seam[1]![1] < housing[1]![1], 'the lid seam should be on the housing sides').toBe(true);
    expect(near(seam[2]![1], housing[2]![1] + 0.001), 'the lid seam should show on the housing front').toBe(true);
    for (const i of [0, 1, 2, 3]) {
      const screw = bounds(`lid-screw-${i}`);
      expect(near(screw[2]![0], housing[2]![1]), `lid-screw-${i} should sit on the housing front`).toBe(true);
      expect(screw[1]![0], `lid-screw-${i} should be in the lid, above the seam`).toBeGreaterThan(seam[1]![1]);
    }
    // Each port is a boss on the housing front, closed by a dust cap, below the seam.
    for (const i of ports) {
      const boss = bounds(`port-boss-${i}`);
      const cap = bounds(`port-cap-${i}`);
      expect(near(boss[2]![0], housing[2]![1]), `port-boss-${i} should stand on the housing front`).toBe(true);
      expect(near(cap[2]![0], boss[2]![1]), `port-cap-${i} should close its boss`).toBe(true);
      expect(boss[1]![0] > housing[1]![0] && boss[1]![1] < seam[1]![0], `port-boss-${i} should be in the base, below the seam`).toBe(true);
      expect(boss[0]![0] > housing[0]![0] && boss[0]![1] < housing[0]![1], `port-boss-${i} should be within the housing length`).toBe(true);
    }
    // The tether leaves through a gland under the housing and reaches the ground.
    const gland = bounds('tether-gland');
    const cable = bounds('tether-cable');
    expect(near(gland[1]![1], housing[1]![0]), 'the gland should sit under the housing').toBe(true);
    for (const axis of [0, 2]) {
      expect(gland[axis]![0]).toBeGreaterThan(housing[axis]![0]);
      expect(gland[axis]![1]).toBeLessThan(housing[axis]![1]);
    }
    expect(near(cable[1]![0], 0) && near(cable[1]![1], gland[1]![0]), 'the tether should run from the gland to the ground').toBe(true);

    expect(asset.description).toMatch(/moulded polymer housing/);
    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
  }, 120_000);
});
