// src/kernel/backends/occt/holeDetection.test.ts
//
// W4 inspection — Task 2: cylindrical-hole detection core on BREP solids.
// Synthetic fixtures only (OcctBackend primitives); STEP involvement lives
// in later orchestrator layers.

import { describe, it, expect, beforeAll } from 'vitest';
import { OcctBackend, initOcct } from './occtBackend';
import { detectCylindricalHoles } from './holeDetection';

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

  it('merges seam-split co-axial faces into one hole', () => {
    // Boolean cuts routinely split a bore into two half-cylinder faces.
    // Whatever face count OCCT emits, the result is ONE reported hole.
    const holes = detectCylindricalHoles(plateWithHole(10));
    expect(holes).toHaveLength(1);
  });
});
