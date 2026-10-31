// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// The mesh point queries that gate the tendon-body check must agree with the
// exact OCCT probe (`measureGapToBody`) wherever they are allowed to decide:
// away from the surface, inside/outside; near it, "needs the exact probe".
import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct, OcctBackend } from '../../../src/kernel/backends/occt/occtBackend';
import { Transform } from '../../../src/shared/runtime/se3';
import { measureGapToBody } from '../../../src/modeling/runtime/jointMeshContinuity';
import { anyTriangleWithin, buildMeshPointIndex, pointInsideMesh } from '../../../src/modeling/runtime/meshPointQuery';
import { MESH_DECISION_MARGIN_MM, TENDON_BODY_CLEARANCE_MM } from '../../../src/modeling/runtime/tendonBodyIntersect';

const REACH = TENDON_BODY_CLEARANCE_MM + MESH_DECISION_MARGIN_MM;

/** Deterministic LCG so a failure reproduces. */
function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
}

beforeAll(async () => {
  await initOcct();
}, 60_000);

async function shapes(): Promise<Record<string, OcctBackend>> {
  const O = OcctBackend;
  return {
    box: O.box(20, 10, 6, true),
    // cylinder(h, r): a bored tube, a sphere on a plate, a cylinder with a ball bite.
    boredCylinder: O.cylinder(30, 12).subtract(O.cylinder(40, 5).translate(0, 0, -5)),
    ballOnPlate: O.box(30, 30, 6, true).union(O.sphere(8).translate(0, 0, 3)),
    bitten: O.cylinder(20, 10).subtract(O.sphere(6).translate(10, 0, 20)),
  };
}

describe('meshPointQuery agrees with the exact OCCT probe', () => {
  it('inside/outside away from the surface, and flags every point near it', async () => {
    const placed = Transform.translation(40, -7, 3).compose(Transform.rotationAxisAngleDeg([1, 2, 3], 37));
    const inverse = placed.inverse();
    const next = rng(7);
    let decided = 0;
    for (const [name, shape] of Object.entries(await shapes())) {
      const mesh = shape.getMesh();
      const index = buildMeshPointIndex(mesh.positions, mesh.indices, REACH);
      expect(index.closed, name).toBe(true);
      const box = shape.boundingBox();
      for (let i = 0; i < 160; i++) {
        const local = [0, 1, 2].map((a) => box.min[a] - 3 + next() * (box.max[a] - box.min[a] + 6)) as [number, number, number];
        const world = placed.point(local) as [number, number, number];
        const exact = measureGapToBody(shape, placed, world);
        expect(exact, `${name} #${i}`).toBeDefined();
        const roundTrip = inverse.point(world);
        expect(Math.hypot(...roundTrip.map((v, a) => v - local[a])), 'inverse').toBeLessThan(1e-9);
        if (anyTriangleWithin(index, local, REACH)) continue; // the exact probe decides these
        decided++;
        // Not near the mesh → not near the surface either.
        expect(exact === 0 || exact! >= TENDON_BODY_CLEARANCE_MM, `${name} #${i} gap ${exact}`).toBe(true);
        expect(pointInsideMesh(index, local), `${name} #${i} gap ${exact}`).toBe(exact === 0);
      }
    }
    expect(decided).toBeGreaterThan(300);
  }, 180_000);

  it('anyTriangleWithin is true for points just off a face and false farther out', async () => {
    const { box } = await shapes();
    const mesh = box.getMesh();
    const index = buildMeshPointIndex(mesh.positions, mesh.indices, REACH);
    // Box spans x ±10, y ±5, z ±3.
    expect(anyTriangleWithin(index, [10.4, 0, 0], REACH)).toBe(true);
    expect(anyTriangleWithin(index, [9.6, 0, 0], REACH)).toBe(true);
    expect(anyTriangleWithin(index, [11, 0, 0], REACH)).toBe(false);
    expect(anyTriangleWithin(index, [0, 0, 0], REACH)).toBe(false);
    expect(pointInsideMesh(index, [0, 0, 0])).toBe(true);
    expect(pointInsideMesh(index, [0, 0, 3.0001 + 1])).toBe(false);
    // A ray from the centre runs exactly through edges and vertices on two axes.
    expect(pointInsideMesh(index, [0, 0, 0.5])).toBe(true);
  }, 60_000);
});
