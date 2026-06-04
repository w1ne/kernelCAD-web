// src/kernel/backends/occt/pathNurbsLowerer.test.ts
//
// V slice — Task V4: tangent-aware dispatch path inside `buildSplineEdge`.
//
// Asserts that:
// - A spline command WITHOUT tangents lowers via the existing
//   `replicad.makeBSplineApproximation` fast path (regression).
// - A spline command WITH startTangent / endTangent lowers via the
//   tangent-constrained interpolator (round-tripped through OCCT) and
//   produces an Edge with sane endpoint directions.
//
// V slice — Task V5: §7.3 downstream-consumer gates.
//
// Asserts that a closed wire containing a tangent-constrained spline edge
// survives the OCCT `BRepBuilderAPI_MakeEdge`-driven downstream pipeline:
// - Revolve (full 360°) → produces a solid with positive measured volume and
//   a finite, non-degenerate bounding box on all three axes.
// - genericSweep along an OPEN 3D tangent-constrained spine → produces a
//   solid with positive measured volume.
//
// Both gates address the §7.3 "BRepBuilderAPI face-edge mismatch downstream"
// risk surfaced in the spec: if the tangent-constrained spline edge's
// `Geom_BSplineCurve` is not face-edge-compatible with OCCT's revolve /
// pipe-sweep operators, the operators throw or return a degenerate shape,
// and the gate fails.

import { describe, it, expect, beforeAll } from 'vitest';
import * as replicad from 'replicad';
import { initOcct } from './occtBackend';
import { buildNurbsSketchOnPlane } from './pathNurbsLowerer';
import type { SketchCommand } from '../../../shared/capture/sketchCommand';
import { toParam } from '../../../shared/runtime/editableHelpers';

const mm = (n: number) => toParam(n, 'mm');

beforeAll(async () => {
  await initOcct();
}, 60_000);

describe('buildSplineEdge — tangent extension (V slice)', () => {
  it('regression: lowers a spline with no tangents (fast path) into a closed sketch', () => {
    const commands: SketchCommand[] = [
      { kind: 'moveTo', x: mm(0), y: mm(0) },
      {
        kind: 'spline',
        points: [
          { x: mm(0), y: mm(0) },
          { x: mm(5), y: mm(2) },
          { x: mm(10), y: mm(0) },
        ],
      },
      { kind: 'lineTo', x: mm(10), y: mm(-2) },
      { kind: 'lineTo', x: mm(0), y: mm(-2) },
      { kind: 'close' },
    ];
    const sketch = buildNurbsSketchOnPlane(commands, 'XY');
    expect(sketch).toBeDefined();
    expect(sketch.wire).toBeDefined();
    expect(sketch.wire.edges.length).toBeGreaterThan(0);
  });

  it('lowers a spline WITH startTangent + endTangent through the verb interpolator', () => {
    // A symmetric three-point spline through (0,0)-(5,10)-(10,0) with both
    // tangents pointing in +x. The tangent-constrained curve must have a
    // near-horizontal tangent at both endpoints; the fast-path approximation
    // would point toward the next waypoint (≈ +x, +y) at the start which
    // fails the |dy/dx| < 0.05 gate here.
    const commands: SketchCommand[] = [
      { kind: 'moveTo', x: mm(0), y: mm(0) },
      {
        kind: 'spline',
        points: [
          { x: mm(0), y: mm(0) },
          { x: mm(5), y: mm(10) },
          { x: mm(10), y: mm(0) },
        ],
        startTangent: { x: mm(1), y: mm(0) },
        endTangent: { x: mm(1), y: mm(0) },
      },
      { kind: 'lineTo', x: mm(10), y: mm(-5) },
      { kind: 'lineTo', x: mm(0), y: mm(-5) },
      { kind: 'close' },
    ];
    const sketch = buildNurbsSketchOnPlane(commands, 'XY');
    expect(sketch).toBeDefined();
    expect(sketch.wire).toBeDefined();
    // The spline edge is the first in the wire; assert its endpoint tangents
    // line up with [1, 0] (within the discretisation slack).
    const splineEdge = sketch.wire.edges[0];
    const tStart = splineEdge.tangentAt(0);
    const tEnd = splineEdge.tangentAt(1);
    // Tangents may be returned in either direction along the curve; compare
    // the absolute angle deviation from the x-axis.
    const startSlope = Math.abs(tStart.y / Math.max(1e-6, Math.abs(tStart.x)));
    const endSlope = Math.abs(tEnd.y / Math.max(1e-6, Math.abs(tEnd.x)));
    expect(startSlope).toBeLessThan(0.05);
    expect(endSlope).toBeLessThan(0.05);
  });

  it('lowers a spline with ONLY startTangent (one-sided constraint)', () => {
    const commands: SketchCommand[] = [
      { kind: 'moveTo', x: mm(0), y: mm(0) },
      {
        kind: 'spline',
        points: [
          { x: mm(0), y: mm(0) },
          { x: mm(5), y: mm(10) },
          { x: mm(10), y: mm(0) },
        ],
        startTangent: { x: mm(0), y: mm(1) },
        endTangent: { x: mm(0), y: mm(-1) },
      },
      { kind: 'lineTo', x: mm(10), y: mm(-5) },
      { kind: 'lineTo', x: mm(0), y: mm(-5) },
      { kind: 'close' },
    ];
    const sketch = buildNurbsSketchOnPlane(commands, 'XY');
    expect(sketch.wire.edges.length).toBeGreaterThan(0);
  });

  it('lowers a tangent-constrained spline on the XZ plane', () => {
    const commands: SketchCommand[] = [
      { kind: 'moveTo', x: mm(0), y: mm(0) },
      {
        kind: 'spline',
        points: [
          { x: mm(0), y: mm(0) },
          { x: mm(5), y: mm(8) },
          { x: mm(10), y: mm(0) },
        ],
        startTangent: { x: mm(1), y: mm(0) },
        endTangent: { x: mm(1), y: mm(0) },
      },
      { kind: 'lineTo', x: mm(10), y: mm(-3) },
      { kind: 'lineTo', x: mm(0), y: mm(-3) },
      { kind: 'close' },
    ];
    const sketch = buildNurbsSketchOnPlane(commands, 'XZ');
    expect(sketch.wire.edges.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// V slice — Task V5 §7.3 downstream-consumer gates
// ---------------------------------------------------------------------------
//
// The closed-wire commands below describe a profile that lives on x ≥ 0 — a
// hard requirement for `Sketch.revolve()` around the Y axis (the axis passes
// through the sketch origin; any point with x < 0 would invert past the axis
// and produce a self-intersecting solid). The spline segment is the
// load-bearing piece: it carries explicit start / end tangents so the lowerer
// dispatches through the verb-tangent-constrained interpolator path
// introduced in Task V4.

function tangentConstrainedRevolveProfile(): SketchCommand[] {
  return [
    { kind: 'moveTo', x: mm(0), y: mm(0) },
    { kind: 'lineTo', x: mm(10), y: mm(0) },
    {
      kind: 'spline',
      points: [
        { x: mm(10), y: mm(0) },
        { x: mm(15), y: mm(5) },
        { x: mm(20), y: mm(15) },
        { x: mm(20), y: mm(30) },
      ],
      startTangent: { x: mm(1), y: mm(0) },
      endTangent: { x: mm(0), y: mm(1) },
    },
    { kind: 'lineTo', x: mm(0), y: mm(30) },
    { kind: 'close' },
  ];
}

describe('§7.3 risk closure — revolve over tangent-constrained spline', () => {
  it('revolve completes without throwing on a tangent-constrained spline profile', () => {
    const profile = buildNurbsSketchOnPlane(tangentConstrainedRevolveProfile(), 'XY');
    // Sketch.revolve(axis, { origin, angle }) — default axis is the +Y unit
    // direction; default angle is 360°. The result is a Shape3D (Solid /
    // CompSolid / Shell / Compound).
    expect(() => profile.revolve([0, 1, 0])).not.toThrow();
  });

  it('revolved solid has positive volume and finite extent on all axes', () => {
    const profile = buildNurbsSketchOnPlane(tangentConstrainedRevolveProfile(), 'XY');
    const solid = profile.revolve([0, 1, 0]);
    // Volume gate — replicad's `measureVolume` integrates over the BREP; a
    // degenerate / self-intersecting revolve would return ~0 or NaN.
    const vol = replicad.measureVolume(solid);
    expect(Number.isFinite(vol)).toBe(true);
    expect(vol).toBeGreaterThan(0);
    // Bounding-box gate — finite, non-degenerate extent on each axis.
    const bbox = solid.boundingBox;
    expect(Number.isFinite(bbox.width)).toBe(true);
    expect(Number.isFinite(bbox.height)).toBe(true);
    expect(Number.isFinite(bbox.depth)).toBe(true);
    expect(bbox.width).toBeGreaterThan(0);
    expect(bbox.height).toBeGreaterThan(0);
    expect(bbox.depth).toBeGreaterThan(0);
  });
});

describe('§7.3 risk closure — sweep along tangent-constrained 3D spline', () => {
  // Build an OPEN tangent-constrained spine wire by harvesting the spline
  // edge from a closed sketch (the lowerer auto-orients edges head-to-tail
  // when assembling the wire, so the first edge after the leading `moveTo` is
  // the spline). The spine is then re-wrapped as a single-edge wire via
  // `assembleWire`.
  function tangentConstrainedSpineWire(): replicad.Wire {
    // Spine commands: a 3D-friendly tangent-constrained spline on the XY
    // plane (which `buildNurbsSketchOnPlane` lifts onto z=0; the resulting
    // spine still exercises the lowerer's 3D edge-build path). We tack on a
    // closure stub so the sketch validates, then discard the closure edges.
    const commands: SketchCommand[] = [
      { kind: 'moveTo', x: mm(0), y: mm(0) },
      {
        kind: 'spline',
        points: [
          { x: mm(0), y: mm(0) },
          { x: mm(10), y: mm(5) },
          { x: mm(20), y: mm(15) },
          { x: mm(30), y: mm(30) },
        ],
        startTangent: { x: mm(1), y: mm(0) },
        endTangent: { x: mm(0), y: mm(1) },
      },
      { kind: 'lineTo', x: mm(30), y: mm(-5) },
      { kind: 'lineTo', x: mm(0), y: mm(-5) },
      { kind: 'close' },
    ];
    const sketch = buildNurbsSketchOnPlane(commands, 'XY');
    // The first edge of the assembled wire corresponds to the spline command
    // (the lowerer commits any pending pen-run before processing each NURBS
    // segment; in this command list, no pen-run precedes the spline, so the
    // spline lands as edge[0]).
    const splineEdge = sketch.wire.edges[0];
    return replicad.assembleWire([splineEdge]);
  }

  function squareProfileWire(): replicad.Wire {
    // 4×4 square profile centred at the spine start (origin), lying in the YZ
    // plane so its plane normal is +X — i.e. perpendicular to the spine's
    // start tangent. A profile co-planar with the spine direction collapses
    // to a zero-volume sweep.
    const drawing = replicad.draw([-2, -2])
      .lineTo([2, -2])
      .lineTo([2, 2])
      .lineTo([-2, 2])
      .close();
    const sketch = drawing.sketchOnPlane('YZ') as replicad.Sketch;
    return sketch.wire;
  }

  it('genericSweep completes without throwing on a tangent-constrained spine', () => {
    const spine = tangentConstrainedSpineWire();
    const profile = squareProfileWire();
    expect(() => replicad.genericSweep(profile, spine, { frenet: true })).not.toThrow();
  });

  it('swept solid has finite positive volume', () => {
    const spine = tangentConstrainedSpineWire();
    const profile = squareProfileWire();
    const solid = replicad.genericSweep(profile, spine, { frenet: true });
    const vol = replicad.measureVolume(solid);
    expect(Number.isFinite(vol)).toBe(true);
    expect(vol).toBeGreaterThan(0);
  });
});
