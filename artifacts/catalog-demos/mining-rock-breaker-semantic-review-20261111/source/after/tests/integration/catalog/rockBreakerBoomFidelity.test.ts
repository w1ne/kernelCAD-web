// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const repoRoot = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/mining/rock-breaker-boom.kcad.ts';

beforeAll(async () => {
  await initOcct();
}, 120_000);

describe('mining/rock-breaker-boom', () => {
  it('bolts both warning posts onto the top face of the grizzly wall', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(repoRoot, source);
    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
    expect(asset.stats.minUpM).toBeCloseTo(0, 6);

    const document = await new NodeIO().readBinary(glb);
    const nodes = document.getRoot().listNodes();
    const names = nodes.map((node) => node.getName());
    expect(names.filter((name) => name.startsWith('warning-post-base-'))).toHaveLength(2);
    expect(names.filter((name) => /^warning-post-anchor-\d-\d$/.test(name))).toHaveLength(8);
    expect(names.filter((name) => /^warning-post-anchor-nut-\d-\d$/.test(name))).toHaveLength(8);

    const bounds = (name: string, axis: 0 | 1 | 2): { min: number; max: number } => {
      const node = nodes.find((candidate) => candidate.getName() === name);
      const mesh = node?.getMesh();
      if (node === undefined || mesh === null || mesh === undefined) return { min: Infinity, max: -Infinity };
      const world = node.getWorldMatrix();
      const axisValues = mesh.listPrimitives().flatMap((primitive) => {
        const position = primitive.getAttribute('POSITION');
        if (position === null) return [];
        return Array.from({ length: position.getCount() }, (_, index) => {
          const point = position.getElement(index, []);
          return world[axis]! * point[0]! + world[axis + 4]! * point[1]!
            + world[axis + 8]! * point[2]! + world[axis + 12]!;
        });
      });
      return { min: Math.min(...axisValues), max: Math.max(...axisValues) };
    };

    // The exported GLB converts the source Z-up model to Y-up coordinates.
    const wallTop = bounds('pit-wall-1', 1);
    expect(wallTop.max).toBeCloseTo(1.2, 3);
    for (const index of [0, 1]) {
      const plate = bounds(`warning-post-base-${index}`, 1);
      const post = bounds(`warning-post-${index}`, 1);
      expect(plate.min).toBeCloseTo(wallTop.max, 3);
      expect(post.min).toBeCloseTo(plate.max, 3);
      for (let anchor = 0; anchor < 4; anchor++) {
        const bolt = bounds(`warning-post-anchor-${index}-${anchor}`, 1);
        const nut = bounds(`warning-post-anchor-nut-${index}-${anchor}`, 1);
        expect(bolt.min).toBeLessThan(wallTop.max);
        expect(bolt.max).toBeCloseTo(plate.max, 3);
        expect(nut.min).toBeCloseTo(plate.max, 3);
        expect(nut.max).toBeGreaterThan(plate.max);
      }
      for (const axis of [0, 2] as const) {
        const wallFootprint = bounds('pit-wall-1', axis);
        const plateFootprint = bounds(`warning-post-base-${index}`, axis);
        expect(plateFootprint.min).toBeGreaterThanOrEqual(wallFootprint.min);
        expect(plateFootprint.max).toBeLessThanOrEqual(wallFootprint.max);
      }
    }
  }, 120_000);
});
