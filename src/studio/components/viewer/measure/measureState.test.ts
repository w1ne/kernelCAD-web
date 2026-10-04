// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import type { EdgePolyline } from './edgePolylines';
import { vdist } from './measureMath';
import { applyClick, EMPTY_MEASURE } from './measureState';

const circleEdge: EdgePolyline = {
  pts: new Float32Array(0),
  closed: true,
  corners: [0],
  circle: { center: [5, 5, 0], radius: 6, normal: [0, 0, 1], rms: 0 },
};

describe('applyClick', () => {
  it('click 1 sets A, click 2 sets B, click 3 starts over', () => {
    const s1 = applyClick(EMPTY_MEASURE, { kind: 'face', point: [0, 0, 0] }, []);
    expect(s1).toMatchObject({ a: [0, 0, 0], b: null });
    const s2 = applyClick(s1, { kind: 'face', point: [10, 0, 0] }, []);
    expect(s2.b).toEqual([10, 0, 0]);
    const s3 = applyClick(s2, { kind: 'face', point: [1, 1, 1] }, []);
    expect(s3).toEqual({ diameter: null, a: [1, 1, 1], b: null });
  });
  it('a circular edge gives an immediate diameter and anchors A at the centre', () => {
    const s = applyClick(EMPTY_MEASURE, { kind: 'edge', point: [11, 5, 0], polyline: 0 }, [circleEdge]);
    expect(s.diameter?.value).toBeCloseTo(12, 9);
    expect(vdist(s.diameter!.a, s.diameter!.b)).toBeCloseTo(12, 9);
    expect(s.a).toEqual([5, 5, 0]);
    const s2 = applyClick(s, { kind: 'face', point: [5, 25, 0] }, [circleEdge]);
    expect(vdist(s2.a!, s2.b!)).toBeCloseTo(20, 9);
    expect(s2.diameter).not.toBeNull();
  });
  it('a non-circular edge is just a point', () => {
    const s = applyClick(EMPTY_MEASURE, { kind: 'edge', point: [1, 2, 3], polyline: 0 }, [{ ...circleEdge, circle: null }]);
    expect(s.diameter).toBeNull();
  });
});
