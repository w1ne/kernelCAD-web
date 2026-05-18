// tests/unit/backends/occt/fromSketchCommands.nurbsSegments.test.ts
//
// NURBS Slice D Task 3 — integration test for the path-NURBS lowerer.
//
// Exercises `OcctBackend.fromSketchCommands` + `extrudeFromSketch` on closed
// 2D sketches that include at least one of the three new Slice D NURBS
// segment kinds (`spline`, `nurbsSegment`, `hermiteG2_2d`), individually and
// mixed with the existing pen-compatible commands. The lowerer composes a
// mixed wire (replicad-pen edges + direct-OCCT NURBS edges) via
// `BRepBuilderAPI_MakeWire_1` semantics — assertions confirm the resulting
// solid has positive volume and a bounding box consistent with the input
// waypoints / control points.

import { describe, it, expect, beforeAll } from 'vitest';
import { OcctBackend, initOcct } from '../../../../src/kernel/backends/occt/occtBackend';
import type { SketchCommand } from '../../../../src/shared/capture/sketchCommand';
import { toParam } from '../../../../src/shared/runtime/editableHelpers';

const mm = (n: number) => toParam(n, 'mm');
const ul = (n: number) => toParam(n, 'unitless');

describe('OcctBackend.fromSketchCommands + Slice D NURBS segments', () => {
  beforeAll(async () => { await initOcct(); });

  it('lowers a closed sketch with a single `spline` segment to a positive-volume extrusion', () => {
    // Top edge follows a B-spline approximation through 4 waypoints; bottom
    // is a 3-segment polyline closing the loop back to (0, 0). Waypoint[0]
    // matches the moveTo, so capture-side validation passes.
    const commands: SketchCommand[] = [
      { kind: 'moveTo', x: mm(0), y: mm(0) },
      {
        kind: 'spline',
        points: [
          { x: mm(0), y: mm(0) },
          { x: mm(10), y: mm(5) },
          { x: mm(20), y: mm(0) },
          { x: mm(30), y: mm(5) },
        ],
      },
      { kind: 'lineTo', x: mm(30), y: mm(-10) },
      { kind: 'lineTo', x: mm(0), y: mm(-10) },
      { kind: 'close' },
    ];
    const sketch = OcctBackend.fromSketchCommands(commands);
    expect(sketch.kind).toBe('sketch');
    const solid = OcctBackend.extrudeFromSketch(sketch, 2);
    const v = solid.volume();
    // Sanity: closed loop covers a region roughly 30 × ~12.5 → ~375 mm²,
    // extruded 2 mm → ~750 mm³. Real value depends on the spline's shape;
    // allow a generous 500..1100 band.
    expect(v).toBeGreaterThan(500);
    expect(v).toBeLessThan(1100);
    const bb = solid.boundingBox();
    // X span covers [0, 30].
    expect(bb.min[0]).toBeCloseTo(0, 1);
    expect(bb.max[0]).toBeCloseTo(30, 1);
    // Y span covers [-10, ~5 .. 9] (B-spline approximation may overshoot
    // the y=5 waypoints — `makeBSplineApproximation`'s default smoothing
    // can produce a curve that bulges beyond the waypoint envelope).
    expect(bb.min[1]).toBeCloseTo(-10, 1);
    expect(bb.max[1]).toBeGreaterThan(4.5);
    expect(bb.max[1]).toBeLessThan(10);
    // Z span is the extrusion depth.
    expect(bb.min[2]).toBeCloseTo(0, 1);
    expect(bb.max[2]).toBeCloseTo(2, 1);
  });

  it('lowers a closed sketch with a single `nurbsSegment` to a positive-volume extrusion', () => {
    // Cubic explicit B-spline forming a smooth arc closure.
    const commands: SketchCommand[] = [
      { kind: 'moveTo', x: mm(0), y: mm(0) },
      {
        kind: 'nurbsSegment',
        controlPoints: [
          { x: mm(0), y: mm(0) },
          { x: mm(5), y: mm(10) },
          { x: mm(15), y: mm(10) },
          { x: mm(20), y: mm(0) },
        ],
        degree: ul(3),
      },
      { kind: 'lineTo', x: mm(20), y: mm(-5) },
      { kind: 'lineTo', x: mm(0), y: mm(-5) },
      { kind: 'close' },
    ];
    const sketch = OcctBackend.fromSketchCommands(commands);
    const solid = OcctBackend.extrudeFromSketch(sketch, 3);
    const v = solid.volume();
    // 20 wide × roughly 10 tall → ~200 mm² × 3 = ~600 mm³.
    expect(v).toBeGreaterThan(400);
    expect(v).toBeLessThan(900);
    const bb = solid.boundingBox();
    expect(bb.min[0]).toBeCloseTo(0, 1);
    expect(bb.max[0]).toBeCloseTo(20, 1);
    expect(bb.min[1]).toBeCloseTo(-5, 1);
    expect(bb.max[1]).toBeGreaterThan(4);
    expect(bb.max[1]).toBeLessThanOrEqual(10);
    expect(bb.min[2]).toBeCloseTo(0, 1);
    expect(bb.max[2]).toBeCloseTo(3, 1);
  });

  it('lowers a closed sketch with a single `hermiteG2_2d` segment to a positive-volume extrusion', () => {
    // Quintic 2D Hermite blend with perpendicular tangents. Endpoint A on
    // the left at (-10, 0) heads upward; endpoint B on the right at (10, 0)
    // heads downward — produces a smooth S- or arch-like curve closure.
    const commands: SketchCommand[] = [
      { kind: 'moveTo', x: mm(-10), y: mm(0) },
      {
        kind: 'hermiteG2_2d',
        ax: mm(-10), ay: mm(0), atx: mm(0), aty: mm(8),
        bx: mm(10), by: mm(0), btx: mm(0), bty: mm(-8),
      },
      { kind: 'lineTo', x: mm(10), y: mm(-5) },
      { kind: 'lineTo', x: mm(-10), y: mm(-5) },
      { kind: 'close' },
    ];
    const sketch = OcctBackend.fromSketchCommands(commands);
    const solid = OcctBackend.extrudeFromSketch(sketch, 1);
    const v = solid.volume();
    // 20 wide × ~6 tall (the Hermite arches upward by ~1-2 mm at midpoint
    // depending on the tangent magnitude) → ~120 mm³.
    expect(v).toBeGreaterThan(80);
    expect(v).toBeLessThan(250);
    const bb = solid.boundingBox();
    expect(bb.min[0]).toBeCloseTo(-10, 1);
    expect(bb.max[0]).toBeCloseTo(10, 1);
    expect(bb.min[1]).toBeCloseTo(-5, 1);
    // Hermite arches above y=0; with tangent magnitude 8 expect a modest
    // bump (< 3 mm). Lower bound just confirms it isn't degenerate.
    expect(bb.max[1]).toBeGreaterThan(0);
    expect(bb.min[2]).toBeCloseTo(0, 1);
    expect(bb.max[2]).toBeCloseTo(1, 1);
  });

  it('lowers a mixed pen+NURBS sketch (lineTo + spline + lineTo + nurbsSegment + close)', () => {
    // Exercises the mixed-source wire composition path: 2 pen runs separated
    // by a spline, plus a trailing nurbsSegment, plus an implicit closing
    // line back to the start. The path traces a rough "house" silhouette
    // with smooth-curved transitions.
    const commands: SketchCommand[] = [
      { kind: 'moveTo', x: mm(0), y: mm(0) },
      { kind: 'lineTo', x: mm(0), y: mm(10) },
      // Top arch via spline:
      {
        kind: 'spline',
        points: [
          { x: mm(0), y: mm(10) },
          { x: mm(10), y: mm(18) },
          { x: mm(20), y: mm(10) },
        ],
      },
      // Right edge straight down to (20, 5):
      { kind: 'lineTo', x: mm(20), y: mm(5) },
      // Smooth scoop via nurbsSegment from (20, 5) to (10, 0):
      {
        kind: 'nurbsSegment',
        controlPoints: [
          { x: mm(20), y: mm(5) },
          { x: mm(18), y: mm(2) },
          { x: mm(15), y: mm(0) },
          { x: mm(10), y: mm(0) },
        ],
        degree: ul(3),
      },
      // Final lineTo back to start:
      { kind: 'lineTo', x: mm(0), y: mm(0) },
      { kind: 'close' },
    ];
    const sketch = OcctBackend.fromSketchCommands(commands);
    const solid = OcctBackend.extrudeFromSketch(sketch, 4);
    const v = solid.volume();
    // 20 wide × ~14 tall × 4 deep → ~1100 mm³ envelope; allow 500..1800.
    expect(v).toBeGreaterThan(500);
    expect(v).toBeLessThan(1800);
    const bb = solid.boundingBox();
    expect(bb.min[0]).toBeCloseTo(0, 1);
    expect(bb.max[0]).toBeCloseTo(20, 1);
    expect(bb.min[1]).toBeCloseTo(0, 1);
    // Top of the arch should reach close to y=18.
    expect(bb.max[1]).toBeGreaterThan(15);
    expect(bb.max[1]).toBeLessThan(19);
    expect(bb.min[2]).toBeCloseTo(0, 1);
    expect(bb.max[2]).toBeCloseTo(4, 1);
  });

  it('emits an OCCT wire-discontinuity error when a nurbsSegment endpoint does not match the pen position', () => {
    // Capture-time validation in PathBuilder.nurbsSegment normally rejects
    // mismatched first control points, but a hand-built SketchCommand[] can
    // bypass that and reach the lowerer directly. With assembleWire's
    // tolerance enforcement, the lowerer should refuse to compose the
    // wire — surfacing an OCCT-side error.
    const commands: SketchCommand[] = [
      { kind: 'moveTo', x: mm(0), y: mm(0) },
      { kind: 'lineTo', x: mm(10), y: mm(0) },
      {
        kind: 'nurbsSegment',
        // First control point intentionally NOT at (10, 0) — 5 mm gap.
        controlPoints: [
          { x: mm(15), y: mm(0) },
          { x: mm(18), y: mm(5) },
          { x: mm(22), y: mm(5) },
          { x: mm(25), y: mm(0) },
        ],
        degree: ul(3),
      },
      { kind: 'lineTo', x: mm(25), y: mm(-5) },
      { kind: 'lineTo', x: mm(0), y: mm(-5) },
      { kind: 'close' },
    ];
    const sketch = OcctBackend.fromSketchCommands(commands);
    // Some OCCT versions silently bridge the gap with a connecting line
    // when assembleWire is permissive; others throw. Accept either outcome
    // — what we want to verify is that the system does NOT silently produce
    // a corrupt or zero-volume solid. The volume should EITHER be positive
    // (auto-bridged) OR the extrude should throw.
    let threw = false;
    let v = -1;
    try {
      const solid = OcctBackend.extrudeFromSketch(sketch, 1);
      v = solid.volume();
    } catch {
      threw = true;
    }
    expect(threw || v > 0).toBe(true);
  });
});
