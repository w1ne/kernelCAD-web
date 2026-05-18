// tests/unit/capture/pathNurbsSegments.test.ts
//
// NURBS Slice D Task 2 — PathBuilder.spline / .nurbsSegment / .hermiteG2
// capture-side tests. Validates that the three new methods push the
// expected SketchCommand variants AND that the capture-time validation
// throws the right diagnostic codes on degenerate input.
//
// This test exercises ONLY the capture side. The OCCT lowerer for these
// commands ships in Slice D Task 3.

import { describe, it, expect } from 'vitest';
import { PathBuilder } from '../../../src/modeling/capture/sketch';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import { KernelError } from '../../../src/shared/intent/kernelError';
import type { SketchCommand } from '../../../src/shared/capture/sketchCommand';

function freshPath(): PathBuilder {
  return new PathBuilder(new CaptureSession());
}

// Capture the commands queued on a PathBuilder for assertion. Reaches
// through the private `commands` field for testing — the runtime contract
// is exercised via the public methods.
function readCommands(pb: PathBuilder): SketchCommand[] {
  return (pb as unknown as { commands: SketchCommand[] }).commands;
}

describe('PathBuilder.spline()', () => {
  it('accepts a Vec2[] and pushes a spline command', () => {
    const pb = freshPath()
      .moveTo(0, 0)
      .spline([
        [0, 0],
        [10, 5],
        [20, 0],
        [30, 5],
      ]);
    const cmds = readCommands(pb);
    expect(cmds).toHaveLength(2);
    expect(cmds[0].kind).toBe('moveTo');
    expect(cmds[1].kind).toBe('spline');
    const spline = cmds[1] as Extract<SketchCommand, { kind: 'spline' }>;
    expect(spline.points).toHaveLength(4);
    expect(spline.points[0].x.evaluated).toBe(0);
    expect(spline.points[3].x.evaluated).toBe(30);
    expect(spline.points[3].y.evaluated).toBe(5);
    expect(spline.tension).toBeUndefined();
  });

  it('stores optional tension as a Param', () => {
    const pb = freshPath()
      .moveTo(0, 0)
      .spline(
        [
          [0, 0],
          [10, 5],
        ],
        { tension: 0.7 },
      );
    const cmds = readCommands(pb);
    const spline = cmds[cmds.length - 1] as Extract<SketchCommand, { kind: 'spline' }>;
    expect(spline.tension?.evaluated).toBeCloseTo(0.7, 6);
  });

  it('rejects fewer than 2 waypoints with feature.path.spline.degenerate-points', () => {
    let err: KernelError | null = null;
    try {
      freshPath().moveTo(0, 0).spline([[0, 0]]);
    } catch (e) {
      err = e as KernelError;
    }
    expect(err).toBeInstanceOf(KernelError);
    expect(err?.code).toBe('feature.path.spline.degenerate-points');
  });

  it('rejects coincident consecutive waypoints', () => {
    let err: KernelError | null = null;
    try {
      freshPath().moveTo(0, 0).spline([
        [0, 0],
        [0, 0],
        [10, 0],
      ]);
    } catch (e) {
      err = e as KernelError;
    }
    expect(err).toBeInstanceOf(KernelError);
    expect(err?.code).toBe('feature.path.spline.degenerate-points');
  });

  it('rejects non-finite coords (NaN/Infinity)', () => {
    let err: KernelError | null = null;
    try {
      freshPath().moveTo(0, 0).spline([
        [0, 0],
        [Number.NaN, 5],
      ]);
    } catch (e) {
      err = e as KernelError;
    }
    expect(err).toBeInstanceOf(KernelError);
    expect(err?.code).toBe('feature.path.spline.degenerate-points');
  });
});

describe('PathBuilder.nurbsSegment()', () => {
  it('accepts control points and pushes a nurbsSegment command', () => {
    const pb = freshPath()
      .moveTo(0, 0)
      .nurbsSegment(
        [
          [0, 0],
          [5, 10],
          [15, 10],
          [20, 0],
        ],
        { degree: 3 },
      );
    const cmds = readCommands(pb);
    expect(cmds).toHaveLength(2);
    expect(cmds[1].kind).toBe('nurbsSegment');
    const seg = cmds[1] as Extract<SketchCommand, { kind: 'nurbsSegment' }>;
    expect(seg.controlPoints).toHaveLength(4);
    expect(seg.degree.evaluated).toBe(3);
    expect(seg.controlPoints[3].x.evaluated).toBe(20);
    expect(seg.controlPoints[3].y.evaluated).toBe(0);
    expect(seg.weights).toBeUndefined();
    expect(seg.knots).toBeUndefined();
  });

  it('defaults degree to 3 when opts omitted', () => {
    const pb = freshPath()
      .moveTo(0, 0)
      .nurbsSegment([
        [0, 0],
        [3, 4],
        [6, 4],
        [9, 0],
      ]);
    const seg = readCommands(pb)[1] as Extract<SketchCommand, { kind: 'nurbsSegment' }>;
    expect(seg.degree.evaluated).toBe(3);
  });

  it('accepts rational weights as Param[]', () => {
    const pb = freshPath()
      .moveTo(0, 0)
      .nurbsSegment(
        [
          [0, 0],
          [5, 10],
          [15, 10],
          [20, 0],
        ],
        { degree: 3, weights: [1, 2, 2, 1] },
      );
    const seg = readCommands(pb)[1] as Extract<SketchCommand, { kind: 'nurbsSegment' }>;
    expect(seg.weights).toHaveLength(4);
    expect(seg.weights?.[1].evaluated).toBe(2);
  });

  it('updates the pen position to the last control point', () => {
    const pb = freshPath()
      .moveTo(0, 0)
      .nurbsSegment([
        [0, 0],
        [5, 10],
        [15, 10],
        [20, 0],
      ])
      .lineTo(25, 0);
    const cmds = readCommands(pb);
    expect(cmds).toHaveLength(3);
    expect(cmds[2].kind).toBe('lineTo');
  });

  it('rejects fewer than degree+1 control points', () => {
    let err: KernelError | null = null;
    try {
      freshPath().moveTo(0, 0).nurbsSegment([[0, 0], [5, 5]], { degree: 3 });
    } catch (e) {
      err = e as KernelError;
    }
    expect(err).toBeInstanceOf(KernelError);
    expect(err?.code).toBe('feature.path.nurbs-segment.degenerate-controls');
  });

  it('rejects controlPoints[0] not matching current pen position', () => {
    let err: KernelError | null = null;
    try {
      freshPath()
        .moveTo(5, 0)
        .nurbsSegment(
          [
            [0, 0],
            [3, 4],
            [6, 4],
            [9, 0],
          ],
          { degree: 3 },
        );
    } catch (e) {
      err = e as KernelError;
    }
    expect(err).toBeInstanceOf(KernelError);
    expect(err?.code).toBe('feature.path.nurbs-segment.degenerate-controls');
  });

  it('rejects non-positive weights with weights-non-positive', () => {
    let err: KernelError | null = null;
    try {
      freshPath()
        .moveTo(0, 0)
        .nurbsSegment(
          [
            [0, 0],
            [3, 4],
            [6, 4],
            [9, 0],
          ],
          { degree: 3, weights: [1, 0, 2, 1] },
        );
    } catch (e) {
      err = e as KernelError;
    }
    expect(err).toBeInstanceOf(KernelError);
    expect(err?.code).toBe('feature.path.nurbs-segment.weights-non-positive');
  });

  it('rejects weights array length not matching controlPoints', () => {
    let err: KernelError | null = null;
    try {
      freshPath()
        .moveTo(0, 0)
        .nurbsSegment(
          [
            [0, 0],
            [3, 4],
            [6, 4],
            [9, 0],
          ],
          { degree: 3, weights: [1, 1, 1] },
        );
    } catch (e) {
      err = e as KernelError;
    }
    expect(err).toBeInstanceOf(KernelError);
    expect(err?.code).toBe('feature.path.nurbs-segment.degenerate-controls');
  });

  it('rejects knot vector with wrong length', () => {
    let err: KernelError | null = null;
    try {
      freshPath()
        .moveTo(0, 0)
        .nurbsSegment(
          [
            [0, 0],
            [3, 4],
            [6, 4],
            [9, 0],
          ],
          { degree: 3, knots: [0, 0, 0, 0, 1] }, // expected length = 4 + 3 + 1 = 8
        );
    } catch (e) {
      err = e as KernelError;
    }
    expect(err).toBeInstanceOf(KernelError);
    expect(err?.code).toBe('feature.path.nurbs-segment.degenerate-controls');
  });
});

describe('PathBuilder.hermiteG2()', () => {
  it('pushes a hermiteG2_2d command with all 12 fields populated', () => {
    const pb = freshPath()
      .moveTo(-10, 0)
      .hermiteG2(
        { point: [-10, 0], tangent: [0, 5] },
        { point: [10, 0], tangent: [0, -5] },
      );
    const cmds = readCommands(pb);
    expect(cmds).toHaveLength(2);
    expect(cmds[1].kind).toBe('hermiteG2_2d');
    const h = cmds[1] as Extract<SketchCommand, { kind: 'hermiteG2_2d' }>;
    expect(h.ax.evaluated).toBe(-10);
    expect(h.ay.evaluated).toBe(0);
    expect(h.bx.evaluated).toBe(10);
    expect(h.by.evaluated).toBe(0);
    expect(h.atx.evaluated).toBe(0);
    expect(h.aty.evaluated).toBe(5);
    expect(h.btx.evaluated).toBe(0);
    expect(h.bty.evaluated).toBe(-5);
    expect(h.acx).toBeUndefined();
    expect(h.acy).toBeUndefined();
    expect(h.bcx).toBeUndefined();
    expect(h.bcy).toBeUndefined();
  });

  it('captures optional curvature on both endpoints', () => {
    const pb = freshPath()
      .moveTo(0, 0)
      .hermiteG2(
        { point: [0, 0], tangent: [1, 0], curvature: [0, 0.1] },
        { point: [10, 0], tangent: [1, 0], curvature: [0, -0.1] },
      );
    const h = readCommands(pb)[1] as Extract<SketchCommand, { kind: 'hermiteG2_2d' }>;
    expect(h.acx?.evaluated).toBe(0);
    expect(h.acy?.evaluated).toBeCloseTo(0.1, 6);
    expect(h.bcx?.evaluated).toBe(0);
    expect(h.bcy?.evaluated).toBeCloseTo(-0.1, 6);
  });

  it('updates the pen position to b.point', () => {
    const pb = freshPath()
      .moveTo(-10, 0)
      .hermiteG2(
        { point: [-10, 0], tangent: [0, 5] },
        { point: [10, 0], tangent: [0, -5] },
      )
      .lineTo(20, 0);
    const cmds = readCommands(pb);
    expect(cmds).toHaveLength(3);
    expect(cmds[2].kind).toBe('lineTo');
  });

  it('rejects a.point not matching current pen position with hermite-g2.start-mismatch', () => {
    let err: KernelError | null = null;
    try {
      freshPath()
        .moveTo(0, 0)
        .hermiteG2(
          { point: [5, 0], tangent: [0, 5] },
          { point: [10, 0], tangent: [0, -5] },
        );
    } catch (e) {
      err = e as KernelError;
    }
    expect(err).toBeInstanceOf(KernelError);
    expect(err?.code).toBe('feature.path.hermite-g2.start-mismatch');
  });

  it('rejects calling hermiteG2 before any moveTo / segment', () => {
    let err: KernelError | null = null;
    try {
      freshPath().hermiteG2(
        { point: [0, 0], tangent: [0, 5] },
        { point: [10, 0], tangent: [0, -5] },
      );
    } catch (e) {
      err = e as KernelError;
    }
    expect(err).toBeInstanceOf(KernelError);
    expect(err?.code).toBe('feature.path.hermite-g2.start-mismatch');
  });

  it('tolerates the 1e-6 mm tolerance window', () => {
    // Floating-point noise within the 1e-6 mm tolerance must NOT throw.
    expect(() => {
      freshPath()
        .moveTo(0, 0)
        .hermiteG2(
          { point: [1e-7, 1e-7], tangent: [0, 5] },
          { point: [10, 0], tangent: [0, -5] },
        );
    }).not.toThrow();
  });
});
