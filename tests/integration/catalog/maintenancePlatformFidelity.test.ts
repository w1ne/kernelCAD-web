// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const repoRoot = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/industrial-plant/maintenance-platform.kcad.ts';

beforeAll(async () => {
  await initOcct();
}, 120_000);

describe('industrial-plant/maintenance-platform', () => {
  it('keeps the platform guarded and connects its three-riser stair to the deck', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(repoRoot, source);
    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
    expect(asset.stats.minUpM).toBeCloseTo(0, 6);
    expect(asset.stats.sizeM[1]).toBeGreaterThan(1.7);
    expect(asset.stats.sizeM[1]).toBeLessThan(1.9);
    expect(asset.params.filter((param) => param.type === 'color').map((param) => param.name)).toEqual([
      'steel', 'safetyPaint',
    ]);
    expect(Object.keys(asset.presets)).toEqual(['weathered', 'highVisibility']);

    const steel = asset.palette.find((zone) => zone.name === 'steel')?.parts ?? [];
    const safetyPaint = asset.palette.find((zone) => zone.name === 'safetyPaint')?.parts ?? [];
    expect(steel).toEqual(expect.arrayContaining([
      'platform-deck', 'platform-leg-front-left', 'stair-stringer-left', 'stair-tread-lower',
    ]));
    expect(safetyPaint).toEqual(expect.arrayContaining([
      'platform-top-rail-back', 'platform-mid-rail-side-left', 'platform-toe-board-back',
      'stair-handrail-left', 'stair-nosing-upper',
    ]));

    const document = await new NodeIO().readBinary(glb);
    const nodes = document.getRoot().listNodes();
    const names = nodes.map((node) => node.getName());
    expect(names.filter((name) => name.startsWith('stair-tread-'))).toHaveLength(3);
    expect(names.filter((name) => name.startsWith('stair-handrail-') && !name.startsWith('stair-handrail-post-')))
      .toHaveLength(2);
    expect(names).toEqual(expect.arrayContaining([
      'platform-top-rail-side-left', 'platform-top-rail-side-right', 'platform-top-rail-back',
      'platform-mid-rail-back', 'platform-toe-board-back', 'guard-post-front-left',
      'stair-handrail-post-left-lower', 'stair-handrail-post-left-middle',
      'stair-handrail-post-left-upper',
    ]));
    expect(names).not.toContain('platform-top-rail-front');

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
          const offset = axis;
          return world[offset]! * point[0]! + world[offset + 4]! * point[1]!
            + world[offset + 8]! * point[2]! + world[offset + 12]!;
        });
      });
      return { min: Math.min(...axisValues), max: Math.max(...axisValues) };
    };

    const deck = bounds('platform-deck', 1);
    const topRail = bounds('platform-top-rail-side-left', 1);
    const frontPost = bounds('guard-post-front-left', 1);
    expect(topRail.max - deck.max).toBeCloseTo(1.07, 3);
    expect(frontPost.min).toBeCloseTo(deck.max, 3);
    expect(frontPost.max).toBeCloseTo(topRail.max, 3);

    const treadCenters = ['stair-tread-lower', 'stair-tread-middle', 'stair-tread-upper']
      .map((name) => {
        const z = bounds(name, 1);
        return (z.min + z.max) / 2;
      });
    expect(treadCenters[0]).toBeCloseTo(0.1565, 3);
    expect(treadCenters[1]).toBeCloseTo(0.325, 3);
    expect(treadCenters[2]).toBeCloseTo(0.4935, 3);

    const lowerTreadX = bounds('stair-tread-lower', 0);
    const lowerTreadWidth = bounds('stair-tread-lower', 2);
    expect(lowerTreadX.max - lowerTreadX.min).toBeCloseTo(0.25, 3);
    expect(lowerTreadWidth.max - lowerTreadWidth.min).toBeCloseTo(0.56, 3);
  }, 120_000);
});
