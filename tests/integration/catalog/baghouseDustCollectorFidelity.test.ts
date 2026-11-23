// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const repoRoot = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/industrial-plant/baghouse-dust-collector.kcad.ts';

beforeAll(async () => {
  await initOcct();
}, 120_000);

describe('industrial-plant/baghouse-dust-collector', () => {
  it('keeps filter media inside the plenum and tapers the dust hopper to its outlet', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(repoRoot, source);
    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
    expect(asset.stats.minUpM).toBeCloseTo(0, 5);
    expect(asset.stats.sizeM[1]).toBeLessThan(0.9);

    const steelParts = asset.palette.find((zone) => zone.name === 'steel')?.parts ?? [];
    expect(steelParts).toEqual(expect.arrayContaining([
      'hopper-front', 'hopper-back', 'hopper-left', 'hopper-right', 'hopper-discharge', 'dust-outlet',
    ]));
    const document = await new NodeIO().readBinary(glb);
    const nodes = document.getRoot().listNodes();
    const filterNodes = nodes.filter((node) => node.getName().startsWith('filter-bag-'));
    expect(filterNodes).toHaveLength(6);

    const positionsFor = (nodeName: string): [number, number, number][] => {
      const node = nodes.find((candidate) => candidate.getName() === nodeName);
      const mesh = node?.getMesh();
      if (node === undefined || mesh === null || mesh === undefined) return [];
      const world = node.getWorldMatrix();
      return mesh.listPrimitives().flatMap((primitive) => {
        const position = primitive.getAttribute('POSITION');
        if (position === null) return [];
        return Array.from({ length: position.getCount() }, (_, index) => {
          const point = position.getElement(index, []);
          return [
            world[0]! * point[0]! + world[4]! * point[1]! + world[8]! * point[2]! + world[12]!,
            world[1]! * point[0]! + world[5]! * point[1]! + world[9]! * point[2]! + world[13]!,
            world[2]! * point[0]! + world[6]! * point[1]! + world[10]! * point[2]! + world[14]!,
          ];
        });
      });
    };

    const filterY = filterNodes.flatMap((node) => positionsFor(node.getName())).map((point) => point[1]);
    expect(Math.min(...filterY)).toBeGreaterThan(0.3588);
    expect(Math.max(...filterY)).toBeLessThan(0.8372);

    const frontWall = positionsFor('hopper-front');
    const topY = Math.max(...frontWall.map((point) => point[1]));
    const bottomY = Math.min(...frontWall.map((point) => point[1]));
    const topX = frontWall.filter((point) => Math.abs(point[1] - topY) < 0.002).map((point) => point[0]);
    const bottomX = frontWall.filter((point) => Math.abs(point[1] - bottomY) < 0.002).map((point) => point[0]);
    const topWidth = Math.max(...topX) - Math.min(...topX);
    const bottomWidth = Math.max(...bottomX) - Math.min(...bottomX);
    expect(topWidth).toBeGreaterThan(0.5);
    expect(bottomWidth).toBeLessThan(0.2);
    expect(bottomWidth).toBeLessThan(topWidth / 2);
  }, 120_000);
});
