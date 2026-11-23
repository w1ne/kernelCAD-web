// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { resolve } from 'node:path';
import { getBounds, NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const repoRoot = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/wind-energy/tower-base-flange.kcad.ts';

beforeAll(async () => {
  await initOcct();
}, 120_000);

describe('wind-energy/tower-base-flange anchor material', () => {
  it('draws galvanized anchor studs and nuts that stand on the flange around the shell', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(repoRoot, source);

    expect(asset.params.filter((param) => param.type === 'color').map((param) => param.name).sort()).toEqual([
      'anchorSteel', 'structuralSteel',
    ]);
    expect(asset.params.find((param) => param.name === 'anchorSteel')?.label).toBe('Galvanized anchor steel');
    expect(Object.keys(asset.presets)).toEqual(['weathered', 'highVisibility']);
    expect(Object.keys(asset.presets.weathered!)).toContain('anchorSteel');
    expect(asset.description).not.toMatch(/stainless/i);
    expect(asset.stats.triangles).toBe(792);
    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
    expect(asset.stats.minUpM).toBeCloseTo(0, 6);

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
    const indices = [0, 1, 2, 3, 4, 5, 6, 7];
    const studs = indices.map((index) => `anchor-${index}`);
    const nuts = indices.map((index) => `anchor-nut-${index}`);

    expectFinish(['flange', 'sleeve'], '#556971', 'the structural steel finish');
    expectFinish([...studs, ...nuts], '#a9b6b7', 'the galvanized anchor steel finish');

    // GLB is Y up; the flange axis is the Y axis.
    const extent = (name: string) => {
      const { min, max } = getBounds(nodeFor(name));
      return {
        min,
        max,
        radius: (max[0]! - min[0]!) / 2,
        centerRadius: Math.hypot((min[0]! + max[0]!) / 2, (min[2]! + max[2]!) / 2),
      };
    };
    const flange = extent('flange');
    const sleeve = extent('sleeve');
    expect(flange.min[1]).toBeCloseTo(0, 5);
    expect(flange.max[1]).toBeCloseTo(0.09, 5);
    expect(flange.radius).toBeCloseTo(0.31, 4);
    expect(sleeve.min[1], 'shell stub should stand on the flange').toBeCloseTo(0.09, 5);
    expect(sleeve.max[1]).toBeCloseTo(0.63, 5);
    expect(sleeve.radius, 'shell stub should be a wide tower shell, not a post').toBeCloseTo(0.19, 4);

    for (const index of indices) {
      const stud = extent(`anchor-${index}`);
      const nut = extent(`anchor-nut-${index}`);
      expect(stud.centerRadius, `anchor-${index} bolt circle`).toBeCloseTo(0.25, 3);
      expect(nut.centerRadius, `anchor-nut-${index} bolt circle`).toBeCloseTo(0.25, 3);
      expect(stud.max[1], `anchor-${index} should project above the flange`).toBeCloseTo(0.15, 5);
      expect(stud.min[1], `anchor-${index} should pass into the flange`).toBeLessThan(flange.max[1]!);
      expect(nut.min[1], `anchor-nut-${index} should sit on the flange`).toBeCloseTo(flange.max[1]!, 5);
      expect(nut.max[1], `anchor-${index} should project above its nut`).toBeLessThan(stud.max[1]!);
      expect(nut.radius, `anchor-nut-${index} should be wider than its stud`).toBeGreaterThan(stud.radius);
      expect(nut.centerRadius - nut.radius, `anchor-nut-${index} should clear the shell`).toBeGreaterThan(sleeve.radius);
      expect(nut.centerRadius + nut.radius, `anchor-nut-${index} should be on the flange`).toBeLessThan(flange.radius);
    }

    const all = getBounds(document.getRoot().listScenes()[0]!);
    expect(all.max[0]! - all.min[0]!).toBeCloseTo(0.62, 3);
    expect(all.max[1]! - all.min[1]!).toBeCloseTo(0.63, 3);
  }, 120_000);
});
