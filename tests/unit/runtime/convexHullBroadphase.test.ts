// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct, OcctBackend } from '../../../src/kernel/backends/occt/occtBackend';
import { detectInterferences } from '../../../src/modeling/runtime/detectInterferences';
import { hullCoverPoints, hullsProveSeparated } from '../../../src/modeling/runtime/convexHullBroadphase';
import { runScript } from '../../../src/composition/runScript';
import { lowerScriptScene } from '../../../src/agent/script-runtime/checkInterference';

async function sceneOf(code: string) {
  const run = await runScript({ code, fileName: 'hull-broadphase.kcad.ts' });
  const { scene } = await lowerScriptScene(run);
  if (scene === undefined) throw new Error('expected a lowered scene');
  return scene;
}

describe('convex hull broad-phase', () => {
  beforeAll(async () => {
    await initOcct();
  });

  it('still reports a real overlapping pair', async () => {
    const scene = await sceneOf(`
      const arm = assembly('overlap');
      arm.part('a', box(10, 10, 10, true));
      arm.part('b', box(10, 10, 10, true).translate(8, 0, 0));
      return arm.model();
    `);
    const result = detectInterferences(scene, 0.01, new Set());
    expect(result.pairs).toHaveLength(1);
    expect(result.pairs[0]!.volumeMm3).toBeGreaterThan(0.01);
  });

  it('still reports a cube nested inside a larger cube', async () => {
    // Face-box unions would miss this: the inner faces sit away from the
    // outer faces, but the solids share the inner cube's volume. The convex
    // hull of each body contains that interior.
    const scene = await sceneOf(`
      const arm = assembly('nested');
      arm.part('outer', box(10, 10, 10, true));
      arm.part('inner', box(4, 4, 4, true));
      return arm.model();
    `);
    const result = detectInterferences(scene, 0.01, new Set());
    expect(result.pairs).toHaveLength(1);
    expect(result.pairs[0]!.volumeMm3).toBeGreaterThan(60);
    const outer = scene.parts.find((part) => part.name === 'outer');
    const inner = scene.parts.find((part) => part.name === 'inner');
    expect(outer?.shape).toBeInstanceOf(OcctBackend);
    expect(inner?.shape).toBeInstanceOf(OcctBackend);
    expect(hullsProveSeparated(outer!.shape, outer!.worldTransform, inner!.shape, inner!.worldTransform)).toBe(false);
  });

  it('does not invent a collision for nested L-shapes whose AABBs overlap', async () => {
    // The convex hull of an L fills the inner corner, so the hulls meet and
    // the exact boolean still has to run. It must report no volume.
    const scene = await sceneOf(`
      const arm = assembly('nested-el');
      const el = box(30, 8, 8).union(box(8, 30, 8));
      arm.part('a', el);
      arm.part('b', el.translate(16, 16, 0));
      return arm.model();
    `);
    const result = detectInterferences(scene, 0.01, new Set());
    expect(result.pairs).toEqual([]);
    const a = scene.parts.find((part) => part.name === 'a');
    const b = scene.parts.find((part) => part.name === 'b');
    expect(a?.shape).toBeInstanceOf(OcctBackend);
    expect(b?.shape).toBeInstanceOf(OcctBackend);
    const points = hullCoverPoints(a!.shape as InstanceType<typeof OcctBackend>);
    expect(points !== undefined && points.length >= 8).toBe(true);
    expect(hullsProveSeparated(a!.shape, a!.worldTransform, b!.shape, b!.worldTransform)).toBe(false);
  });
});
