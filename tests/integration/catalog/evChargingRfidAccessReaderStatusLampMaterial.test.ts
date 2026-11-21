// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { resolve } from 'node:path';
import { getBounds, NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const repoRoot = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/ev-charging-infrastructure/rfid-access-reader-pedestal.kcad.ts';

beforeAll(async () => {
  await initOcct();
}, 120_000);

describe('ev-charging-infrastructure/rfid-access-reader-pedestal status lamp material', () => {
  it('draws an indicator-polymer lamp that sits on the post face below the reader', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(repoRoot, source);

    expect(asset.stats.triangles).toBe(104);
    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
    [0.36, 0.98, 0.36].forEach((expected, axis) => {
      expect(asset.stats.sizeM[axis]).toBeCloseTo(expected, 5);
    });
    expect(asset.stats.minUpM).toBeCloseTo(0, 6);
    expect(asset.params.filter((param) => param.type === 'color').map((param) => param.name)).toEqual([
      'powderCoat', 'displayGlass', 'stainlessSteel', 'indicatorPolymer',
    ]);
    expect(Object.keys(asset.presets)).toEqual(['fleetReady', 'nightService']);
    for (const preset of Object.values(asset.presets)) {
      expect(Object.keys(preset)).toContain('indicatorPolymer');
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

    expectFinish(['status-lamp'], '#48b866', 'the green indicator polymer');
    expectFinish(['reader-face', 'cap'], '#397f90', 'the powder-coat finish');
    expectFinish(['reader-window'], '#79cfda', 'the display glass');
    expectFinish(['base-plate', 'post'], '#b5c0c2', 'the stainless steel finish');

    // GLB is Y up. The lamp axis must be horizontal: a 30 mm deep, 52 mm wide lens
    // that starts on the post face and sits below the reader housing.
    const extent = (name: string) => {
      const { min, max } = getBounds(nodeFor(name));
      return { min, max, size: max.map((value, axis) => value - min[axis]!) };
    };
    const lamp = extent('status-lamp');
    const post = extent('post');
    const reader = extent('reader-face');
    const depthAxis = lamp.size.indexOf(Math.min(...lamp.size));
    expect(depthAxis, 'lamp axis should be horizontal, not vertical').not.toBe(1);
    expect(lamp.size[depthAxis]).toBeCloseTo(0.03, 4);
    expect(lamp.size[1]).toBeGreaterThan(0.045);
    expect(lamp.size[1]).toBeLessThanOrEqual(0.0521);
    expect(lamp.max[1], 'lamp should sit below the reader housing').toBeLessThan(reader.min[1]!);
    expect(lamp.min[1], 'lamp should sit on the post').toBeGreaterThan(post.min[1]!);

    // The lens back face lies on the post front face; the lens stands 30 mm proud of it.
    const near = Math.min(Math.abs(lamp.min[depthAxis]!), Math.abs(lamp.max[depthAxis]!));
    const far = Math.max(Math.abs(lamp.min[depthAxis]!), Math.abs(lamp.max[depthAxis]!));
    const postFront = Math.max(Math.abs(post.min[depthAxis]!), Math.abs(post.max[depthAxis]!));
    const readerFront = Math.max(Math.abs(reader.min[depthAxis]!), Math.abs(reader.max[depthAxis]!));
    expect(near, 'lamp should touch the post face, not float in front of it').toBeCloseTo(postFront, 4);
    expect(far - postFront).toBeCloseTo(0.03, 4);
    expect(far, 'lamp should not stand proud of the reader housing').toBeLessThanOrEqual(readerFront + 1e-6);
  }, 120_000);
});
