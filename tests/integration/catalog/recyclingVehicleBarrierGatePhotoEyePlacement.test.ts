// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { resolve } from 'node:path';
import { getBounds, NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const repoRoot = resolve(import.meta.dirname, '../../..');
const source = 'catalog/kits/recycling-facility/vehicle-barrier-gate.kcad.ts';

beforeAll(async () => {
  await initOcct();
}, 120_000);

describe('recycling-facility/vehicle-barrier-gate photo-eye placement', () => {
  it('stands the photo-eye pair either side of the lane with the beam across it', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(repoRoot, source);

    expect(asset.stats.triangles).toBe(1050);
    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
    [4.52, 1.266, 0.595].forEach((expected, axis) => {
      expect(asset.stats.sizeM[axis]).toBeCloseTo(expected, 5);
    });
    expect(asset.stats.minUpM).toBeCloseTo(0, 6);
    expect(asset.params.filter((param) => param.type === 'color').map((param) => param.name)).toEqual([
      'cabinet', 'boom', 'stripes', 'beacon',
    ]);
    expect(Object.keys(asset.presets)).toEqual(['siteOrange', 'councilBlue', 'weathered']);

    const document = await new NodeIO().readBinary(glb);
    const nodes = document.getRoot().listNodes();
    const extent = (name: string) => {
      const node = nodes.find((candidate) => candidate.getName() === name);
      expect(node, `${name} should export`).toBeDefined();
      const { min, max } = getBounds(node!);
      return {
        min,
        max,
        size: max.map((value, axis) => value - min[axis]!),
        centre: max.map((value, axis) => (value + min[axis]!) / 2),
      };
    };

    // GLB is Y up. The closed boom spans the lane, so its long axis is the lane width
    // and the remaining horizontal axis is the direction of travel.
    const boomTube = extent('boom-tube');
    const widthAxis = boomTube.size.indexOf(Math.max(...boomTube.size));
    expect(widthAxis, 'closed boom should be horizontal').not.toBe(1);
    const travelAxis = 2 - widthAxis;
    const plinth = extent('plinth');
    const restFoot = extent('rest-foot');
    const posts = [extent('eye-post-0'), extent('eye-post-1')];
    const heads = [extent('eye-head-0'), extent('eye-head-1')];
    const lenses = [extent('eye-lens-0'), extent('eye-lens-1')];

    // The drive lane is the clear width between the cabinet plinth and the rest-post foot.
    const laneNear = plinth.max[widthAxis]!;
    const laneFar = restFoot.min[widthAxis]!;
    expect(laneFar - laneNear).toBeGreaterThan(3.5);
    for (const [index, post] of posts.entries()) {
      const insideLane = post.max[widthAxis]! > laneNear + 0.3 && post.min[widthAxis]! < laneFar - 0.3;
      expect(insideLane, `eye-post-${index} should not stand in the drive lane`).toBe(false);
    }
    expect(posts[0]!.min[widthAxis], 'cabinet-side post should clear the plinth').toBeGreaterThanOrEqual(laneNear);
    expect(posts[0]!.max[widthAxis]).toBeLessThanOrEqual(laneNear + 0.3);
    expect(posts[1]!.centre[widthAxis]).toBeCloseTo(restFoot.centre[widthAxis]!, 4);
    expect(posts[1]!.centre[widthAxis]! - posts[0]!.centre[widthAxis]!).toBeCloseTo(3.61, 4);

    // Both posts are on one line across the lane, just behind the boom and clear of it.
    expect(posts[0]!.centre[travelAxis]).toBeCloseTo(posts[1]!.centre[travelAxis]!, 5);
    const boomOffset = Math.abs(posts[0]!.centre[travelAxis]! - boomTube.centre[travelAxis]!);
    expect(boomOffset).toBeCloseTo(0.3, 4);
    for (const head of heads) {
      const clearOfBoom = head.min[travelAxis]! > boomTube.max[travelAxis]! || head.max[travelAxis]! < boomTube.min[travelAxis]!;
      expect(clearOfBoom, 'photo-eye head should not sit under the boom').toBe(true);
      const clearOfRestFoot = head.min[travelAxis]! > restFoot.max[travelAxis]! || head.max[travelAxis]! < restFoot.min[travelAxis]!;
      expect(clearOfRestFoot, 'photo-eye should not stand on the rest-post foot').toBe(true);
    }

    // Each lens is a 10 mm disc on the head face that looks across the lane at the other head.
    for (const [index, lens] of lenses.entries()) {
      const head = heads[index]!;
      expect(lens.size.indexOf(Math.min(...lens.size)), `eye-lens-${index} axis should cross the lane`).toBe(widthAxis);
      expect(lens.size[widthAxis]).toBeCloseTo(0.01, 4);
      expect(lens.centre[travelAxis]).toBeCloseTo(head.centre[travelAxis]!, 5);
      expect(lens.min[1]).toBeGreaterThan(head.min[1]!);
      expect(lens.max[1]).toBeLessThan(head.max[1]!);
    }
    expect(lenses[0]!.min[widthAxis], 'cabinet-side lens should face the lane').toBeCloseTo(heads[0]!.max[widthAxis]!, 4);
    expect(lenses[1]!.max[widthAxis], 'rest-side lens should face the lane').toBeCloseTo(heads[1]!.min[widthAxis]!, 4);
    expect(lenses[0]!.centre[1]).toBeCloseTo(lenses[1]!.centre[1]!, 5);
  }, 120_000);
});
