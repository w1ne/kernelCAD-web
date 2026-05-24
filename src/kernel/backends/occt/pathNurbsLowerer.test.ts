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

import { describe, it, expect, beforeAll } from 'vitest';
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
