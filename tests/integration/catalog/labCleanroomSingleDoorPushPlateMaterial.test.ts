// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { resolve } from 'node:path';
import { getBounds, NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const repoRoot = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/lab-infrastructure/cleanroom-single-door-module.kcad.ts';

beforeAll(async () => {
  await initOcct();
}, 120_000);

describe('lab-infrastructure/cleanroom-single-door-module push plate material', () => {
  it('draws a stainless push plate that lies on the door leaf face', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(repoRoot, source);

    expect(asset.stats.triangles).toBe(72);
    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
    expect(asset.stats.minUpM).toBeCloseTo(0, 6);
    expect(asset.params.filter((param) => param.type === 'color').map((param) => param.name)).toEqual([
      'enamel', 'glass', 'stainless', 'steel',
    ]);
    expect(Object.keys(asset.presets)).toEqual(['cleanroom', 'highVisibility']);
    for (const preset of Object.values(asset.presets)) {
      expect(Object.keys(preset)).toContain('stainless');
    }

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

    expectFinish(['door-push-plate'], '#b8c7ca', 'the stainless steel finish');
    expectFinish(['header', 'door-leaf'], '#c9dedc', 'the enamel coating');
    expectFinish(['door-vision-panel'], '#55b7ca', 'the tinted safety glass');
    expectFinish(['outer-frame-left', 'outer-frame-right'], '#53666e', 'the structural steel finish');

    // GLB is Y up. The plate is a 100 mm x 300 mm sheet, 4 mm thick, on the leaf face.
    const extent = (name: string) => {
      const { min, max } = getBounds(nodeFor(name));
      return { min, max, size: max.map((value, axis) => value - min[axis]!) };
    };
    const plate = extent('door-push-plate');
    const leaf = extent('door-leaf');
    const depthAxis = plate.size.indexOf(Math.min(...plate.size));
    const widthAxis = [0, 2].find((axis) => axis !== depthAxis)!;
    expect(depthAxis, 'plate should lie flat on the leaf, not on the floor').not.toBe(1);
    expect(plate.size[depthAxis]).toBeCloseTo(0.004, 4);
    expect(plate.size[widthAxis]).toBeCloseTo(0.1, 4);
    expect(plate.size[1]).toBeCloseTo(0.3, 4);

    // The plate back face lies on the leaf front face; the plate stays inside the leaf outline.
    const near = Math.min(Math.abs(plate.min[depthAxis]!), Math.abs(plate.max[depthAxis]!));
    const leafFront = Math.max(Math.abs(leaf.min[depthAxis]!), Math.abs(leaf.max[depthAxis]!));
    expect(near, 'plate should touch the leaf face, not float in front of it').toBeCloseTo(leafFront, 4);
    expect(plate.min[widthAxis]).toBeGreaterThan(leaf.min[widthAxis]!);
    expect(plate.max[widthAxis]).toBeLessThan(leaf.max[widthAxis]!);
    expect(plate.min[1], 'plate centre should be at hand height').toBeGreaterThan(0.9);
    expect(plate.max[1]).toBeLessThan(1.4);
  }, 120_000);
});
