// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const repoRoot = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/telecom-infrastructure/split-cable-duct.kcad.ts';

beforeAll(async () => {
  await initOcct();
}, 120_000);

describe('telecom-infrastructure/split-cable-duct duct material', () => {
  it('makes the split duct two HDPE half shells around the cables, not painted steel slabs', async () => {
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

    // A telecom split duct is an HDPE conduit: no powder-coated steel channel or lid slabs.
    expect(names, 'no powder-coated steel base or lid slab may form the duct').not.toContain('base-a');
    for (const name of ['base-b', 'lid-a', 'lid-b', 'center-join']) expect(names).not.toContain(name);
    expectFinish(['shell-upper', 'shell-lower'], '#e07a1f', 'the HDPE duct colour');
    const fasteners = [0, 1, 2, 3, 4, 5].flatMap((index) => [`bolt-${index}`, `nut-${index}`]);
    expectFinish(fasteners, '#d2dbdc', 'the stainless finish');
    expectFinish(['cable-0', 'cable-1', 'cable-2'], '#22292d', 'the black polymer');

    const colorParams = asset.params.filter((param) => param.type === 'color');
    expect(colorParams.map((param) => param.name).sort()).toEqual(['duct', 'polymer', 'stainlessSteel']);

    // World-space extent in metres of a node's mesh along one axis (mm Z-up -> m Y-up).
    const extent = (name: string, axis: 0 | 1 | 2) => {
      const node = nodes.find((candidate) => candidate.getName() === name)!;
      const m = node.getWorldMatrix();
      const values = node.getMesh()!.listPrimitives().flatMap((primitive) => {
        const position = primitive.getAttribute('POSITION')!;
        return Array.from({ length: position.getCount() }, (_, index) => {
          const [x, y, z] = position.getElement(index, []) as [number, number, number];
          return m[axis]! * x + m[4 + axis]! * y + m[8 + axis]! * z + m[12 + axis]!;
        });
      });
      return [Math.min(...values), Math.max(...values)];
    };
    const [upperBottom, upperTop] = extent('shell-upper', 1);
    const [lowerBottom, lowerTop] = extent('shell-lower', 1);
    expect(lowerBottom, 'the lower shell should rest on the ground').toBeCloseTo(0, 3);
    expect(upperBottom, 'the half shells should meet on the flange seam').toBeCloseTo(lowerTop, 3);
    expect(upperTop - lowerBottom, 'the duct should be 150 mm across').toBeCloseTo(0.15, 3);
    for (const name of ['cable-0', 'cable-1', 'cable-2']) {
      const [cableBottom, cableTop] = extent(name, 1);
      expect(cableBottom, `${name} should lie in the bore`).toBeGreaterThan(lowerBottom + 0.007);
      expect(cableTop, `${name} should lie in the bore`).toBeLessThan(upperTop - 0.007);
      // The cables run along the duct axis and leave both open ends.
      const ductEnds = extent('shell-upper', 2);
      const cableEnds = extent(name, 2);
      expect(cableEnds[0], `${name} should leave one end`).toBeLessThan(ductEnds[0]);
      expect(cableEnds[1], `${name} should leave the other end`).toBeGreaterThan(ductEnds[1]);
    }

    expect(asset.description).toMatch(/HDPE conduit split lengthwise into upper and lower half shells/i);
  }, 120_000);
});
