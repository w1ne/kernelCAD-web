// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import {
  buildTubePath, isTubePathError, trimPathEnds, tubePathErrorMessage, type TubePath, type V3,
} from '../../../src/shared/tube/tubePath';

function ok(points: V3[], r: number): TubePath {
  const p = buildTubePath(points, r);
  if (isTubePathError(p)) throw new Error(`unexpected ${p.kind}`);
  return p;
}

describe('buildTubePath', () => {
  it('one 90° bend: straights, arc and cut length', () => {
    const p = ok([[0, 0, 0], [100, 0, 0], [100, 80, 0]], 20);
    expect(p.bends).toHaveLength(1);
    expect(p.bends[0].angleDeg).toBeCloseTo(90, 9);
    expect(p.bends[0].tangentLen).toBeCloseTo(20, 9);
    expect(p.straights[0]).toBeCloseTo(80, 9);
    expect(p.straights[1]).toBeCloseTo(60, 9);
    expect(p.cutLength).toBeCloseTo(80 + 60 + (Math.PI / 2) * 20, 9);
    const arc = p.segments[1];
    if (arc.kind !== 'arc') throw new Error('expected arc');
    expect(arc.center).toEqual([80, 20, 0].map((v) => expect.closeTo(v, 9)));
    expect(arc.start).toEqual([80, 0, 0].map((v) => expect.closeTo(v, 9)));
    expect(arc.end).toEqual([100, 20, 0].map((v) => expect.closeTo(v, 9)));
    const dMid = Math.hypot(arc.mid[0] - 80, arc.mid[1] - 20, arc.mid[2]);
    expect(dMid).toBeCloseTo(20, 9);
  });

  it('out-of-plane second bend keeps both arcs tangent to the shared leg', () => {
    const p = ok([[0, 0, 0], [100, 0, 0], [100, 100, 0], [100, 100, 100]], 25);
    expect(p.bends.map((b) => b.angleDeg)).toEqual([expect.closeTo(90, 9), expect.closeTo(90, 9)]);
    expect(p.straights).toEqual([75, 50, 75].map((v) => expect.closeTo(v, 9)));
    expect(p.startDir).toEqual([1, 0, 0]);
    expect(p.endDir).toEqual([0, 0, 1].map((v) => expect.closeTo(v, 9)));
  });

  it('a redundant collinear corner changes nothing', () => {
    const a = ok([[0, 0, 0], [100, 0, 0], [100, 80, 0]], 20);
    const b = ok([[0, 0, 0], [40, 0, 0], [100, 0, 0], [100, 80, 0]], 20);
    expect(b.points).toHaveLength(3);
    expect(b.cutLength).toBeCloseTo(a.cutLength, 9);
    expect(b.segments).toHaveLength(a.segments.length);
  });

  it('reports a leg too short for its two tangents, with the missing length', () => {
    const p = buildTubePath([[0, 0, 0], [100, 0, 0], [100, 30, 0], [0, 30, 0]], 20);
    expect(p).toEqual({ kind: 'unreachable', leg: 1, missingMm: expect.closeTo(10, 9) });
  });

  it('reports a fold-back', () => {
    expect(buildTubePath([[0, 0, 0], [100, 0, 0], [0, 0, 0]], 20)).toEqual({ kind: 'reversal', corner: 1 });
  });

  it('reports fewer than two distinct points', () => {
    expect(buildTubePath([[0, 0, 0]], 20)).toEqual({ kind: 'too-few-points' });
    expect(buildTubePath([[0, 0, 0], [0, 0, 0]], 20)).toEqual({ kind: 'too-few-points' });
  });

  it('a straight tube has one line and no bends', () => {
    const p = ok([[0, 0, 0], [0, 0, 50]], 20);
    expect(p.segments).toEqual([{ kind: 'line', a: [0, 0, 0], b: [0, 0, 50] }]);
    expect(p.cutLength).toBe(50);
  });
});

describe('trimPathEnds', () => {
  it('shortens only the first and last straight', () => {
    const p = ok([[0, 0, 0], [100, 0, 0], [100, 80, 0]], 20);
    const t = trimPathEnds(p, 30, 10)!;
    expect(t.points[0]).toEqual([30, 0, 0]);
    expect(t.points[2]).toEqual([100, 70, 0].map((v) => expect.closeTo(v, 9)));
    expect(t.cutLength).toBeCloseTo(p.cutLength - 40, 9);
  });

  it('clamps the trim to the straight and returns undefined when nothing is left', () => {
    const p = ok([[0, 0, 0], [0, 0, 50]], 20);
    expect(trimPathEnds(p, 30, 30)).toBeUndefined();
  });

  it('a negative trim extends the end straights', () => {
    const p = ok([[0, 0, 0], [100, 0, 0], [100, 80, 0]], 20);
    const t = trimPathEnds(p, -5, -5)!;
    expect(t.points[0]).toEqual([-5, 0, 0]);
    expect(t.points[2]).toEqual([100, 85, 0].map((v) => expect.closeTo(v, 9)));
    expect(t.cutLength).toBeCloseTo(p.cutLength + 10, 9);
  });

  it('a single straight is gone once the two trims together cover it', () => {
    const p = ok([[0, 0, 0], [0, 0, 50]], 20);
    expect(trimPathEnds(p, 10, 45)).toBeUndefined();
    expect(trimPathEnds(p, 10, 15)!.cutLength).toBeCloseTo(25, 9);
  });
});

describe('tubePathErrorMessage', () => {
  it('names the short leg and how much is missing', () => {
    expect(tubePathErrorMessage('hyd-1', { kind: 'unreachable', leg: 1, missingMm: 10 })).toBe(
      "tube.corner.unreachable: tube 'hyd-1' leg 1 is 10.00 mm too short for the bends at its ends. Move a corner to lengthen the leg or lower bendRadius.",
    );
  });

  it('names the corner that folds back', () => {
    expect(tubePathErrorMessage('hyd-1', { kind: 'reversal', corner: 2 })).toBe(
      "tube.corner.collinear-reversal: tube 'hyd-1' folds back on itself at corner 2. Offset the next corner sideways.",
    );
  });

  it('asks for two distinct end points', () => {
    expect(tubePathErrorMessage('hyd-1', { kind: 'too-few-points' })).toBe(
      "tube.corner.too-few-points: tube 'hyd-1' needs two distinct end points.",
    );
  });
});
