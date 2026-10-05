// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { fitCircle, formatDeltas, formatDiameter, formatLength, vdist } from './measureMath';

function ring(n: number, r: number, c: [number, number, number], jitter = 0): number[] {
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    const rr = r + (i % 2 ? jitter : -jitter);
    out.push(c[0] + rr * Math.cos(t), c[1] + rr * Math.sin(t), c[2]);
  }
  return out;
}

describe('formatting', () => {
  it('uses millimetres with one decimal', () => {
    expect(formatLength(123.449)).toBe('123.4 mm');
    expect(formatLength(5)).toBe('5.0 mm');
    expect(formatDiameter(12)).toBe('Ø 12.0 mm');
  });
  it('prints absolute axis deltas', () => {
    expect(formatDeltas([0, 0, 0], [-10, 20, 120])).toBe('ΔX 10.0 ΔY 20.0 ΔZ 120.0');
    expect(formatDeltas([1, 1, 1], [1, 1, 1])).toBe('ΔX 0.0 ΔY 0.0 ΔZ 0.0');
  });
});

describe('fitCircle', () => {
  it('recovers centre, radius and normal', () => {
    const fit = fitCircle(ring(32, 6, [10, -4, 3]));
    expect(fit).not.toBeNull();
    expect(fit!.radius).toBeCloseTo(6, 5);
    expect(vdist(fit!.center, [10, -4, 3])).toBeLessThan(1e-4);
    expect(Math.abs(fit!.normal[2])).toBeCloseTo(1, 5);
  });
  it('accepts tiny noise (within 1% RMS) and rejects 5%', () => {
    expect(fitCircle(ring(40, 10, [0, 0, 0], 0.05))).not.toBeNull();
    expect(fitCircle(ring(40, 10, [0, 0, 0], 0.5))).toBeNull();
  });
  it('rejects a square outline even though its corners are concyclic', () => {
    const sq: number[] = [];
    for (let i = 0; i < 16; i++) {
      const s = i / 4;
      const side = Math.floor(s);
      const f = s - side;
      const pts = [[f, 0], [1, f], [1 - f, 1], [0, 1 - f]][side];
      sq.push(pts[0] * 10, pts[1] * 10, 0);
    }
    expect(fitCircle(sq)).toBeNull();
  });
  it('rejects too few points and collinear points', () => {
    expect(fitCircle(ring(6, 5, [0, 0, 0]))).toBeNull();
    expect(fitCircle(Array.from({ length: 40 }, (_, i) => (i % 3 === 0 ? i : 0)))).toBeNull();
  });
});
