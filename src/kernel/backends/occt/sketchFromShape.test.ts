// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect } from 'vitest';
import {
  makePlaneFrame,
  cardinalFrame,
  projectToFrame,
  bulgeThroughThreePoints,
  chainSegments,
  loopToCommands,
  segmentsPerimeter,
  segmentsSignedArea,
  type ProjectedSegment,
} from './sketchFromShape';

describe('sketchFromShape — frame math', () => {
  it('projects a cardinal XY frame identity-style', () => {
    const f = cardinalFrame('xy', 5);
    expect(projectToFrame(f, [2, 3, 5])).toEqual([2, 3]);
    expect(projectToFrame(f, [2, 3, 99])).toEqual([2, 3]);
  });

  it('builds a right-handed frame from origin + normal', () => {
    const f = makePlaneFrame([1, 0, 0], [1, 0, 0]);
    // u × v should equal normal
    const u = f.u, v = f.v, n = f.normal;
    expect(u[1] * v[2] - u[2] * v[1]).toBeCloseTo(n[0], 9);
    expect(u[2] * v[0] - u[0] * v[2]).toBeCloseTo(n[1], 9);
    expect(u[0] * v[1] - u[1] * v[0]).toBeCloseTo(n[2], 9);
  });
});

describe('sketchFromShape — bulge reconstruction', () => {
  it('gives +1 for a CCW semicircle (start -> top -> end)', () => {
    // unit circle: (1,0) -> (0,1) -> (-1,0), CCW sweep = π
    const b = bulgeThroughThreePoints([1, 0], [0, 1], [-1, 0]);
    expect(b).toBeCloseTo(1, 9);
  });

  it('gives -1 for a CW semicircle', () => {
    // (1,0) -> (0,-1) -> (-1,0), clockwise sweep = -π
    const b = bulgeThroughThreePoints([1, 0], [0, -1], [-1, 0]);
    expect(b).toBeCloseTo(-1, 9);
  });

  it('gives a quarter-circle bulge of tan(pi/8)', () => {
    // (1,0) -> (cos45, sin45) -> (0,1)
    const s = Math.SQRT1_2;
    const b = bulgeThroughThreePoints([1, 0], [s, s], [0, 1]);
    expect(b).toBeCloseTo(Math.tan(Math.PI / 8), 9);
  });

  it('returns null for collinear points', () => {
    expect(bulgeThroughThreePoints([0, 0], [1, 0], [2, 0])).toBeNull();
  });
});

describe('sketchFromShape — area & perimeter', () => {
  it('computes area and perimeter of a unit square', () => {
    const sq: ProjectedSegment[] = [
      { x0: 0, y0: 0, x1: 10, y1: 0 },
      { x0: 10, y0: 0, x1: 10, y1: 4 },
      { x0: 10, y0: 4, x1: 0, y1: 4 },
      { x0: 0, y0: 4, x1: 0, y1: 0 },
    ];
    expect(Math.abs(segmentsSignedArea(sq))).toBeCloseTo(40, 9);
    expect(segmentsPerimeter(sq)).toBeCloseTo(28, 9);
  });

  it('adds the circular cap for a full circle (two semicircles)', () => {
    // radius-3 circle as two +1 bulges on a diameter chord (6 long)
    const circ: ProjectedSegment[] = [
      { x0: -3, y0: 0, x1: 3, y1: 0, bulge: 1 },
      { x0: 3, y0: 0, x1: -3, y1: 0, bulge: 1 },
    ];
    expect(Math.abs(segmentsSignedArea(circ))).toBeCloseTo(Math.PI * 9, 6);
    expect(segmentsPerimeter(circ)).toBeCloseTo(2 * Math.PI * 3, 6);
  });
});

describe('sketchFromShape — chaining', () => {
  it('chains unordered segments into one closed loop', () => {
    const segs: ProjectedSegment[] = [
      { x0: 10, y0: 0, x1: 10, y1: 4 },
      { x0: 0, y0: 4, x1: 0, y1: 0 },
      { x0: 0, y0: 0, x1: 10, y1: 0 },
      { x0: 10, y0: 4, x1: 0, y1: 4 },
    ];
    const { loops, openChains } = chainSegments(segs);
    expect(loops).toHaveLength(1);
    expect(loops[0]).toHaveLength(4);
    expect(openChains).toHaveLength(0);
  });

  it('flips segments that arrive reversed', () => {
    const segs: ProjectedSegment[] = [
      { x0: 10, y0: 0, x1: 0, y1: 0 }, // reversed
      { x0: 0, y0: 0, x1: 0, y1: 4 },
      { x0: 0, y0: 4, x1: 10, y1: 4 },
      { x0: 10, y0: 4, x1: 10, y1: 0 },
    ];
    const { loops } = chainSegments(segs);
    expect(loops).toHaveLength(1);
    expect(Math.abs(segmentsSignedArea(loops[0]))).toBeCloseTo(40, 6);
  });

  it('reports an open chain with dangling endpoints', () => {
    const segs: ProjectedSegment[] = [
      { x0: 0, y0: 0, x1: 10, y1: 0 },
      { x0: 10, y0: 0, x1: 10, y1: 4 },
    ];
    const { loops, openChains } = chainSegments(segs);
    expect(loops).toHaveLength(0);
    expect(openChains).toHaveLength(1);
  });

  it('emits moveTo/lineTo/close commands', () => {
    const loop: ProjectedSegment[] = [
      { x0: 0, y0: 0, x1: 4, y1: 0 },
      { x0: 4, y0: 0, x1: 4, y1: 4 },
      { x0: 4, y0: 4, x1: 0, y1: 4 },
      { x0: 0, y0: 4, x1: 0, y1: 0 },
    ];
    const cmds = loopToCommands(loop);
    expect(cmds[0].kind).toBe('moveTo');
    expect(cmds[cmds.length - 1].kind).toBe('close');
    expect(cmds.filter((c) => c.kind === 'lineTo')).toHaveLength(4);
  });

  it('emits a bulgeArc command for an arc segment', () => {
    const loop: ProjectedSegment[] = [
      { x0: -3, y0: 0, x1: 3, y1: 0, bulge: 1 },
      { x0: 3, y0: 0, x1: -3, y1: 0, bulge: 1 },
    ];
    const cmds = loopToCommands(loop);
    expect(cmds.some((c) => c.kind === 'bulgeArc')).toBe(true);
  });
});
