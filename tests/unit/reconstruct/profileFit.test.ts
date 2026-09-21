// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Characterisation for the guided loop fit in profileFit.ts. `fitGuidedLoop`
// is private and reached through `fitLoop` with a `LoopGuide`; these pin the
// fixed line/circle runs it takes from the guide and the fall-through when no
// label resolves to a region geometry, before the function is split.

import { describe, expect, it } from 'vitest';
import { fitLoop, type LoopGuide } from '../../../src/agent/reconstruct/profileFit';

interface Fixture {
  pts: Float64Array;
  labels: number[];
}

function squareLoop(): Fixture {
  const pts: number[] = [];
  const labels: number[] = [];
  for (let x = 0; x <= 40; x += 5) pts.push(x, 0);
  for (let y = 5; y <= 30; y += 5) pts.push(40, y);
  for (let x = 35; x >= 0; x -= 5) pts.push(x, 30);
  for (let y = 25; y >= 5; y -= 5) pts.push(0, y);
  const n = pts.length / 2;
  for (let i = 0; i < n; i++) labels.push(i < 8 ? 1 : i < 14 ? 2 : i < 22 ? 3 : 4);
  return { pts: Float64Array.from(pts), labels };
}

function squareGuide(): LoopGuide {
  return {
    labels: squareLoop().labels,
    geometry: (label: number) => {
      if (label === 1) return { kind: 'line', px: 0, py: 0, dx: 1, dy: 0 };
      if (label === 2) return { kind: 'line', px: 40, py: 0, dx: 0, dy: 1 };
      if (label === 3) return { kind: 'line', px: 0, py: 30, dx: -1, dy: 0 };
      if (label === 4) return { kind: 'line', px: 0, py: 0, dx: 0, dy: -1 };
      return undefined;
    },
  };
}

function circleLoop(): Fixture {
  const pts: number[] = [];
  const labels: number[] = [];
  for (let i = 0; i < 24; i++) {
    const a = (i * 15 * Math.PI) / 180;
    pts.push(10 * Math.cos(a), 10 * Math.sin(a));
    labels.push(i < 18 ? 1 : 0);
  }
  return { pts: Float64Array.from(pts), labels };
}

function circleGuide(): LoopGuide {
  return {
    labels: circleLoop().labels,
    geometry: (label: number) => (label === 1 ? { kind: 'circle', cx: 0, cy: 0, r: 10 } : undefined),
  };
}

describe('fitGuidedLoop characterisation', () => {
  it('takes labelled line runs from the guide as fixed segments', () => {
    const out = fitLoop(squareLoop().pts, 0.02, squareGuide());
    expect(out.kind).toBe('path');
    if (out.kind !== 'path') return;
    expect(out.segments).toEqual([
      { geom: { kind: 'line', px: 20, py: 0, dx: 1, dy: 0 }, first: 0, last: 8, fixed: true },
      { geom: { kind: 'line', px: 40, py: 15, dx: 0, dy: 1 }, first: 8, last: 14, fixed: true },
      { geom: { kind: 'line', px: 20, py: 30, dx: -1, dy: 0 }, first: 14, last: 22, fixed: true },
      { geom: { kind: 'line', px: 0, py: 15, dx: 0, dy: -1 }, first: 22, last: 28, fixed: true },
    ]);
  });

  it('takes a labelled circle run as one fixed arc with the measured sweep', () => {
    const out = fitLoop(circleLoop().pts, 0.02, circleGuide());
    expect(out.kind).toBe('path');
    if (out.kind !== 'path') return;
    expect(out.segments[0]).toEqual({
      geom: { kind: 'arc', cx: 0, cy: 0, r: 10, ccw: true },
      first: 0,
      last: 18,
      fixed: true,
    });
    // The unlabelled run is fitted from its points, not taken from the guide.
    expect(out.segments[1].fixed).toBeUndefined();
  });

  it('falls through to the unguided fit when no label resolves to geometry', () => {
    const { pts, labels } = squareLoop();
    const allZero: LoopGuide = { labels: labels.map(() => 7), geometry: () => undefined };
    expect(fitLoop(pts, 0.02, allZero)).toEqual(fitLoop(pts, 0.02));
  });
});
