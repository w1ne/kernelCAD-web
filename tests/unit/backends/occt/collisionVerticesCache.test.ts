// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// collisionVertices() is the MJCF collision cloud. Physics export and a
// later playback export mesh the same rest-pose parts; remeshing them is
// what pushed a lofted compact-arm livePhysicsPoses file past 60 s.

import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct, OcctBackend } from '../../../../src/kernel/backends/occt/occtBackend';

describe('collisionVertices mesh cache', () => {
  beforeAll(async () => {
    await initOcct();
  }, 60_000);

  it('meshes a shape once per tolerance pair and returns the same cloud', () => {
    const body = OcctBackend.box(20, 12, 8);
    const shape = body.getReplicadShape();
    const original = shape.mesh.bind(shape);
    let calls = 0;
    shape.mesh = ((opts: { tolerance?: number; angularTolerance?: number }) => {
      calls += 1;
      return original(opts);
    }) as typeof shape.mesh;

    const first = body.collisionVertices();
    const second = body.collisionVertices();
    expect(calls).toBe(1);
    expect(second).toBe(first);
    expect(first.length).toBeGreaterThan(0);
    expect(first.length % 3).toBe(0);

    const finer = body.collisionVertices(0.2, 0.3);
    expect(calls).toBe(2);
    expect(finer).not.toBe(first);
    expect(body.collisionVertices(0.2, 0.3)).toBe(finer);
    expect(calls).toBe(2);
  });

  it('does not reuse a mesh across different solids', () => {
    const a = OcctBackend.box(10, 10, 10);
    const b = OcctBackend.box(10, 10, 20);
    const shapeA = a.getReplicadShape();
    const original = shapeA.mesh.bind(shapeA);
    let callsOnA = 0;
    shapeA.mesh = ((opts: { tolerance?: number; angularTolerance?: number }) => {
      callsOnA += 1;
      return original(opts);
    }) as typeof shapeA.mesh;

    const vertsA = a.collisionVertices();
    const vertsB = b.collisionVertices();
    expect(callsOnA).toBe(1);
    expect(vertsB).not.toBe(vertsA);
    const extent = (verts: Float32Array) => Math.max(...Array.from(verts, (n) => Math.abs(n)));
    expect(extent(vertsB)).toBeGreaterThan(extent(vertsA));
    expect(a.collisionVertices()).toBe(vertsA);
    expect(callsOnA).toBe(1);
  });
});
