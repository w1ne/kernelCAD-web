// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const repoRoot = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/industrial-plant/bucket-elevator.kcad.ts';

beforeAll(async () => {
  await initOcct();
}, 120_000);

describe('industrial-plant/bucket-elevator', () => {
  it('keeps the bucket loop inside the casing and exposes distinct material controls', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(repoRoot, source);
    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
    expect(asset.stats.minUpM).toBeCloseTo(0, 5);
    expect(asset.params.filter((param) => param.type === 'color').map((param) => param.name)).toEqual([
      'steel', 'safetyPaint', 'beltRubber', 'bucketPolymer',
    ]);
    expect(Object.keys(asset.presets)).toEqual(['weathered', 'highVisibility']);
    expect(asset.palette.find((zone) => zone.name === 'beltRubber')?.parts).toEqual(
      expect.arrayContaining(['bucket-belt-rising', 'bucket-belt-return']),
    );
    expect(asset.palette.find((zone) => zone.name === 'bucketPolymer')?.parts).toEqual(
      expect.arrayContaining(['bucket-0-back', 'bucket-0-floor', 'bucket-0-left-cheek', 'bucket-0-right-cheek']),
    );

    const document = await new NodeIO().readBinary(glb);
    const nodes = document.getRoot().listNodes();
    const bucketNodes = nodes.filter((node) => /^bucket-\d-(back|floor|left-cheek|right-cheek|front-lip)$/.test(node.getName()));
    expect(bucketNodes).toHaveLength(30);
    expect(nodes.filter((node) => /^bucket-belt-(rising|return)$/.test(node.getName()))).toHaveLength(2);

    const bounds = (name: string): { min: number[]; max: number[] } => {
      const node = nodes.find((candidate) => candidate.getName() === name);
      const mesh = node?.getMesh();
      if (node === undefined || mesh === null || mesh === undefined) {
        throw new Error(`Missing exported catalog part: ${name}`);
      }
      const world = node.getWorldMatrix();
      const points = mesh.listPrimitives().flatMap((primitive) => {
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
      return {
        min: [0, 1, 2].map((axis) => Math.min(...points.map((point) => point[axis]!))),
        max: [0, 1, 2].map((axis) => Math.max(...points.map((point) => point[axis]!))),
      };
    };

    for (const node of bucketNodes) {
      const part = bounds(node.getName());
      // GLB coordinates are metres; the front inspection window spans ±76 mm in source X.
      expect(part.min[0]).toBeGreaterThanOrEqual(-0.076);
      expect(part.max[0]).toBeLessThanOrEqual(0.076);
      // The casing's outer front/back planes are ±130 mm in source Y (GLB Z).
      expect(part.min[2]).toBeGreaterThanOrEqual(-0.13);
      expect(part.max[2]).toBeLessThanOrEqual(0.13);
    }
  }, 120_000);
});
