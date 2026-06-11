// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/occt/holeDetection.test.ts
//
// W4 inspection — Task 2: cylindrical-hole detection core on BREP solids.
// Synthetic fixtures only (OcctBackend primitives); STEP involvement lives
// in later orchestrator layers.

import { describe, it, expect, beforeAll } from 'vitest';
import { OcctBackend, initOcct } from './occtBackend';
import {
  detectCylindricalHoles,
  resolveBoreExtents,
  MIN_ANGULAR_COVERAGE_RAD,
  type ConcaveCylFace,
} from './holeDetection';

beforeAll(async () => {
  await initOcct();
});

/** 20×20×10 plate (centered, z ∈ [-5, 5]) with a Ø4 hole on the Z axis at (0,0).
 *  The drill enters from the top face (z = 5) and reaches down `depth` mm. */
function plateWithHole(depth: number): OcctBackend {
  const plate = OcctBackend.box(20, 20, 10, true); // centered
  const drill = OcctBackend.cylinder(depth, 2).translate(0, 0, 5 - depth);
  return plate.subtract(drill);
}

describe('detectCylindricalHoles', () => {
  it('reports a blind hole with diameter, depth, axis', () => {
    const holes = detectCylindricalHoles(plateWithHole(6));
    expect(holes).toHaveLength(1);
    const h = holes[0];
    expect(h.kind).toBe('blind');
    expect(h.diameterMm).toBeCloseTo(4, 3);
    expect(h.depthMm).toBeCloseTo(6, 2);
    // Blind convention: origin at the mouth, direction INTO the hole.
    expect(h.axisOrigin[0]).toBeCloseTo(0, 3);
    expect(h.axisOrigin[1]).toBeCloseTo(0, 3);
    expect(h.axisOrigin[2]).toBeCloseTo(5, 2);
    expect(h.axisDirection[2]).toBeCloseTo(-1, 3);
  });

  it('reports a through hole', () => {
    const holes = detectCylindricalHoles(plateWithHole(10));
    expect(holes).toHaveLength(1);
    expect(holes[0].kind).toBe('through');
    expect(holes[0].depthMm).toBeCloseTo(10, 2);
  });

  it('ignores convex cylinders (bosses)', () => {
    const boss = OcctBackend.box(20, 20, 10, true)
      .union(OcctBackend.cylinder(5, 3).translate(0, 0, 5));
    expect(detectCylindricalHoles(boss)).toHaveLength(0);
  });

  it('ignores partial concave cylinders (fillet-like)', () => {
    // A box with a quarter-round channel cut along one top edge: concave
    // cylindrical face with ~90° angular coverage — not a hole. The
    // cutting cylinder is centered on its own axis before rotation so the
    // channel spans the full edge regardless of rotation sign convention.
    const channel = OcctBackend.cylinder(40, 3)
      .translate(0, 0, -20)
      .rotate([1, 0, 0], 90)
      .translate(10, 0, 5);
    const part = OcctBackend.box(20, 20, 10, true).subtract(channel);
    expect(detectCylindricalHoles(part)).toHaveLength(0);
  });

  it('reports two through-holes on a plate with two parallel bores', () => {
    // 20×20×10 plate with TWO Ø4 through-holes at (±5, 0).
    const plate = OcctBackend.box(20, 20, 10, true)
      .subtract(OcctBackend.cylinder(10, 2).translate(5, 0, -5))
      .subtract(OcctBackend.cylinder(10, 2).translate(-5, 0, -5));
    const holes = detectCylindricalHoles(plate);
    expect(holes).toHaveLength(2);
    const xs = holes.map((h) => h.axisOrigin[0]).sort((a, b) => a - b);
    expect(xs[0]).toBeCloseTo(-5, 3);
    expect(xs[1]).toBeCloseTo(5, 3);
    for (const h of holes) {
      expect(h.kind).toBe('through');
      expect(h.diameterMm).toBeCloseTo(4, 3);
      expect(h.depthMm).toBeCloseTo(10, 2);
      // Loose axis pin: the axis line passes through (±5, 0, ·) ...
      expect(Math.abs(h.axisOrigin[0])).toBeCloseTo(5, 3);
      expect(h.axisOrigin[1]).toBeCloseTo(0, 3);
      // ... and runs along Z. The axis SIGN is arbitrary for a through
      // hole (no mouth/bottom asymmetry) — accept either.
      expect(Math.abs(h.axisDirection[2])).toBeCloseTo(1, 3);
    }
  });

  it('flags an internal duct (both axial ends closed) as blind + bothEndsClosed', () => {
    // Cylindrical void fully interior to a 20-cube: cylinder z ∈ [-5, 5]
    // inside box z ∈ [-10, 10] — both ends probe closed.
    const part = OcctBackend.box(20, 20, 20, true)
      .subtract(OcctBackend.cylinder(10, 2).translate(0, 0, -5));
    const holes = detectCylindricalHoles(part);
    expect(holes).toHaveLength(1);
    expect(holes[0].kind).toBe('blind');
    expect(holes[0].bothEndsClosed).toBe(true);
    expect(holes[0].diameterMm).toBeCloseTo(4, 3);
    expect(holes[0].depthMm).toBeCloseTo(10, 2);
  });

  it('reports a single hole on a boolean-cut bore (faceCount >= 1)', () => {
    // A genuinely seam-split fixture is NOT attainable through the
    // OcctBackend boolean path: replicad's cut/fuse unconditionally run
    // SimplifyResult(true, true, 1e-3), which unifies same-domain faces,
    // so a plate-minus-cylinder bore always arrives as ONE cylindrical
    // face. The multi-face grouping/merge path is exercised directly on
    // face descriptors in the suite below; this test only pins the honest
    // end-to-end contract for what OCCT actually emits.
    const holes = detectCylindricalHoles(plateWithHole(10));
    expect(holes).toHaveLength(1);
    expect(holes[0].faceCount).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// Pure grouping/merge pipeline — exercised directly on face descriptors,
// since boolean-built fixtures can never seam-split (see test above). Faces
// like these arise in imported STEP/IGES bodies where the authoring kernel
// kept the seam split.
// ---------------------------------------------------------------------------

/** Concave cylindrical face descriptor with overridable fields. Default:
 *  full 2π face of radius 2 on the +Z axis through the origin, v ∈ [0, 10]. */
function face(over: Partial<ConcaveCylFace> = {}): ConcaveCylFace {
  return {
    loc: [0, 0, 0],
    dir: [0, 0, 1],
    radiusMm: 2,
    du: 2 * Math.PI,
    v1: 0,
    v2: 10,
    ...over,
  };
}

describe('resolveBoreExtents (pure grouping + interval union)', () => {
  it('merges two seam-split half-bores into one bore (coverage sums to 2π)', () => {
    // Two half-cylinder faces (~π angular extent each), same axis, same
    // radius, same axial range — the classic boolean seam split.
    const halves = [face({ du: Math.PI }), face({ du: Math.PI })];
    const bores = resolveBoreExtents(halves);
    expect(bores).toHaveLength(1);
    expect(bores[0].faceCount).toBe(2);
    expect(bores[0].radiusMm).toBeCloseTo(2, 9);
    expect(bores[0].tMin).toBeCloseTo(0, 9);
    expect(bores[0].tMax).toBeCloseTo(10, 9);
    // Summed coverage 2π clears the partial-cylinder gate.
    expect(2 * Math.PI).toBeGreaterThan(MIN_ANGULAR_COVERAGE_RAD);
  });

  it('groups a co-axial half-bore with flipped dir and merges the extent', () => {
    // Face B is the second half of the bore but reports the same axis
    // line with the OPPOSITE direction and a different loc; its v
    // endpoints must map through its OWN loc/dir: z = 10 - v, so
    // v ∈ [0, 10] covers z ∈ [0, 10] — the same axial range as face A.
    const a = face({ du: Math.PI, v1: 0, v2: 10 });
    const b = face({ loc: [0, 0, 10], dir: [0, 0, -1], du: Math.PI, v1: 0, v2: 10 });
    const bores = resolveBoreExtents([a, b]);
    expect(bores).toHaveLength(1);
    expect(bores[0].faceCount).toBe(2);
    expect(bores[0].tMin).toBeCloseTo(0, 9);
    expect(bores[0].tMax).toBeCloseTo(10, 9);
  });

  it('unions intervals across an axial gap <= 0.05 mm', () => {
    const a = face({ v1: 0, v2: 5 });
    const b = face({ v1: 5.04, v2: 10 }); // 0.04 mm gap
    const bores = resolveBoreExtents([a, b]);
    expect(bores).toHaveLength(1);
    expect(bores[0].faceCount).toBe(2);
    expect(bores[0].tMin).toBeCloseTo(0, 9);
    expect(bores[0].tMax).toBeCloseTo(10, 9);
  });

  it('keeps intervals separate across an axial gap > 0.05 mm', () => {
    // Two co-axial bores with material between them — must NOT merge.
    const a = face({ v1: 0, v2: 5 });
    const b = face({ v1: 5.1, v2: 10 }); // 0.1 mm gap
    const bores = resolveBoreExtents([a, b]);
    expect(bores).toHaveLength(2);
    expect(bores[0].faceCount).toBe(1);
    expect(bores[1].faceCount).toBe(1);
    const spans = bores.map((bo) => [bo.tMin, bo.tMax]).sort((x, y) => x[0] - y[0]);
    expect(spans[0][0]).toBeCloseTo(0, 9);
    expect(spans[0][1]).toBeCloseTo(5, 9);
    expect(spans[1][0]).toBeCloseTo(5.1, 9);
    expect(spans[1][1]).toBeCloseTo(10, 9);
  });

  it('rejects partial faces whose summed coverage stays below the gate', () => {
    // Two fillet-like channels on the same axis: 2 rad each, 4 rad total
    // (< 5.8 rad) — grouped, but not a hole.
    const bores = resolveBoreExtents([face({ du: 2 }), face({ du: 2 })]);
    expect(bores).toHaveLength(0);
  });

  it('keeps different radii in separate groups', () => {
    const a = face({ radiusMm: 2 });
    const b = face({ radiusMm: 2.5 }); // Δr = 0.5 > 0.01 mm tolerance
    const bores = resolveBoreExtents([a, b]);
    expect(bores).toHaveLength(2);
    const radii = bores.map((bo) => bo.radiusMm).sort((x, y) => x - y);
    expect(radii[0]).toBeCloseTo(2, 9);
    expect(radii[1]).toBeCloseTo(2.5, 9);
  });

  it('keeps non-coincident parallel axes in separate groups', () => {
    const a = face();
    const b = face({ loc: [5, 0, 0] }); // parallel axis 5 mm away
    const bores = resolveBoreExtents([a, b]);
    expect(bores).toHaveLength(2);
    expect(bores[0].faceCount).toBe(1);
    expect(bores[1].faceCount).toBe(1);
  });
});
