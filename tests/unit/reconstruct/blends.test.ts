// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// tests/unit/reconstruct/blends.test.ts
//
// Edge-blend measurement against a sharp edge, on synthetic surface samples
// whose answer is known in closed form, and the edge-query emulation that
// turns blend groups into kernel selectors.

import { describe, expect, it } from 'vitest';
import {
  detectEdgeBlends,
  edgeMatchesQuery,
  groupBlends,
  selectorsForGroup,
  type SharpEdge,
} from '../../../src/agent/reconstruct/blends';
import type { V3 } from '../../../src/agent/reconstruct/geom';

/** The top-front edge of a 60 × 20 × 10 block: along X at y = 0, z = 10. */
function topFrontEdge(): SharpEdge {
  const samples = Array.from({ length: 9 }, (_, k) => ({ p: [(60 * k) / 8, 0, 10] as V3, nA: [0, 0, 1] as V3, nB: [0, -1, 0] as V3 }));
  return { curveType: 'LINE', start: [0, 0, 10], end: [60, 0, 10], kernelConvex: true, kernelDihedralDeg: 90, samples, convex: true };
}

/** Surface samples: the blend cross-section `profile(x, φ)` swept along X,
 *  plus flat top and front face points that must carry no weight. */
function blendSamples(profile: (x: number, phi: number) => [number, number]): { pts: Float64Array; w: Float64Array } {
  const out: number[] = [];
  for (let i = 0; i <= 60; i++) {
    const x = i;
    for (let j = 0; j <= 12; j++) {
      const [y, z] = profile(x, ((Math.PI / 2) * j) / 12);
      out.push(x, y, z);
    }
    for (let y = 3; y <= 20; y += 2) out.push(x, y, 10); // top face
    for (let z = 0; z <= 7; z += 2) out.push(x, 0, z); // front face
  }
  return { pts: Float64Array.from(out), w: new Float64Array(out.length / 3).fill(1) };
}

describe('detectEdgeBlends', () => {
  it('measures a constant 2 mm round on a convex 90° edge', () => {
    const r = 2;
    // Arc centre (y, z) = (r, 10 − r); φ = 0 on the top face, 90° on the front.
    const { pts, w } = blendSamples((_, phi) => [r - r * Math.sin(phi), 10 - r + r * Math.cos(phi)]);
    const det = detectEdgeBlends(pts, w, [topFrontEdge()], 0.01, 10);
    expect(det.rejected).toEqual([]);
    expect(det.blends).toHaveLength(1);
    expect(det.blends[0].measuredRadius).toBeCloseTo(2, 6);
    expect(groupBlends(det.blends, 0.01)).toEqual([expect.objectContaining({ radius: 2, edges: [0] })]);
  });

  it('rejects a chamfer: its points do not agree on one radius', () => {
    const { pts, w } = blendSamples((_, phi) => {
      const t = phi / (Math.PI / 2);
      return [2 - 2 * t, 10 - 2 * t];
    });
    const det = detectEdgeBlends(pts, w, [topFrontEdge()], 0.01, 10);
    expect(det.blends).toEqual([]);
    expect(det.rejected[0].reason).toMatch(/radius varies/);
  });

  it('rejects a blend whose radius grows along the edge', () => {
    const { pts, w } = blendSamples((x, phi) => {
      const r = 1 + (3 * x) / 60;
      return [r - r * Math.sin(phi), 10 - r + r * Math.cos(phi)];
    });
    const det = detectEdgeBlends(pts, w, [topFrontEdge()], 0.01, 10);
    expect(det.blends).toEqual([]);
    expect(det.rejected).toHaveLength(1);
  });
});

describe('edge selectors', () => {
  /** The 12 edges of an axis-aligned 80 × 50 × 8 box. */
  function boxEdges(): SharpEdge[] {
    const [X, Y, Z] = [80, 50, 8];
    const segs: Array<[V3, V3]> = [];
    for (const z of [0, Z]) {
      segs.push([[0, 0, z], [X, 0, z]], [[X, 0, z], [X, Y, z]], [[X, Y, z], [0, Y, z]], [[0, Y, z], [0, 0, z]]);
    }
    for (const [x, y] of [[0, 0], [X, 0], [X, Y], [0, Y]]) segs.push([[x, y, 0], [x, y, Z]]);
    return segs.map(([a, b]) => ({
      curveType: 'LINE',
      start: a,
      end: b,
      kernelConvex: true,
      kernelDihedralDeg: 90,
      samples: [{ p: a, nA: [0, 0, 1], nB: [0, -1, 0] }, { p: b, nA: [0, 0, 1], nB: [0, -1, 0] }],
    }));
  }

  it('mirrors the kernel query semantics on chord midpoints and directions', () => {
    const edges = boxEdges();
    expect(edges.filter((e) => edgeMatchesQuery(e, { parallel: [0, 0, 1] }))).toHaveLength(4);
    expect(edges.filter((e) => edgeMatchesQuery(e, { atZ: 8, tolerance: 0.01 }))).toHaveLength(4);
  });

  it('picks the shortest query that selects exactly a group, else one box per edge', () => {
    const edges = boxEdges();
    expect(selectorsForGroup(edges, edges.map((_, i) => i))).toEqual([undefined]);
    expect(selectorsForGroup(edges, [8, 9, 10, 11])).toEqual([{ parallel: [0, 0, 1] }]);
    expect(selectorsForGroup(edges, [4, 5, 6, 7])).toEqual([{ atZ: 8, tolerance: 0.01 }]);
    const single = selectorsForGroup(edges, [4])!;
    expect(single).toHaveLength(1);
    expect(edges.filter((e) => edgeMatchesQuery(e, single[0]!))).toEqual([edges[4]]);
    const scattered = selectorsForGroup(edges, [0, 6, 9])!;
    const picked = new Set(scattered.flatMap((q) => edges.map((e, i) => (edgeMatchesQuery(e, q!) ? i : -1)).filter((i) => i >= 0)));
    expect([...picked].sort((a, b) => a - b)).toEqual([0, 6, 9]);
  });
});
