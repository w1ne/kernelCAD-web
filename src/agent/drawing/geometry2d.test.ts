// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect } from 'vitest';
import {
  asFullCircle,
  outerBoundary,
  polylineSegments,
  recoverArcs,
  signedArea,
  silhouetteIoU,
  type P2,
  type Seg2,
} from './geometry2d';

const circlePts = (cx: number, cy: number, r: number, n = 40, sweep = 2 * Math.PI): P2[] =>
  Array.from({ length: n + 1 }, (_, i) => [cx + r * Math.cos((i / n) * sweep), cy + r * Math.sin((i / n) * sweep)] as P2);

describe('outerBoundary', () => {
  it('walks the silhouette of an L past a T-junction and ignores a disconnected hole', () => {
    const L: P2[] = [[0, 0], [60, 0], [60, 6], [6, 6], [6, 50], [0, 50], [0, 0]];
    // The bottom edge as ONE long segment, with an internal line ending on it (a T-junction).
    const segs: Seg2[] = [
      ...polylineSegments(L),
      { a: [30, 0], b: [30, 6] },
      ...polylineSegments(circlePts(40, 3, 1)),
    ];
    const loop = outerBoundary(segs, 1e-3);
    expect(loop).toHaveLength(6);
    expect(Math.abs(signedArea(loop))).toBeCloseTo(60 * 6 + 6 * 44, 6);
  });
});

describe('asFullCircle', () => {
  it('fits a closed chord polygon and rejects an open arc', () => {
    const fit = asFullCircle(circlePts(10, -4, 3.25));
    expect(fit?.r).toBeCloseTo(3.25, 2);
    expect(fit?.cx).toBeCloseTo(10, 6);
    expect(asFullCircle(circlePts(0, 0, 5, 20, Math.PI))).toBeNull();
  });
});

describe('recoverArcs', () => {
  it('re-expresses the chords of rounded corners as quarter arcs', () => {
    const r = 5;
    const corner = (cx: number, cy: number, a0: number): P2[] =>
      Array.from({ length: 9 }, (_, i) => [cx + r * Math.cos(a0 + (i / 8) * (Math.PI / 2)), cy + r * Math.sin(a0 + (i / 8) * (Math.PI / 2))] as P2);
    const loop: P2[] = [
      ...corner(35, 5, -Math.PI / 2),
      ...corner(35, 15, 0),
      ...corner(5, 15, Math.PI / 2),
      ...corner(5, 5, Math.PI),
    ];
    const elements = recoverArcs(loop, 0.01);
    const arcs = elements.filter(e => e.bulge !== 0);
    expect(arcs).toHaveLength(4);
    for (const a of arcs) expect(a.bulge).toBeCloseTo(Math.tan(Math.PI / 8), 3);
    expect(elements.filter(e => e.bulge === 0)).toHaveLength(4);
  });
});

describe('silhouetteIoU', () => {
  it('is 1 for identical loops and 1/3 for squares overlapping by half', () => {
    const sq = (x: number): P2[] => [[x, 0], [x + 10, 0], [x + 10, 10], [x, 10]];
    expect(silhouetteIoU({ outer: sq(0) }, { outer: sq(0) })).toBeCloseTo(1, 6);
    expect(silhouetteIoU({ outer: sq(0) }, { outer: sq(5) })).toBeCloseTo(1 / 3, 1);
  });
});
