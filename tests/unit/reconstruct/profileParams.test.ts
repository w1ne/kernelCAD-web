// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// tests/unit/reconstruct/profileParams.test.ts

import { describe, expect, it } from 'vitest';
import { CoordinateBook, paramProfile, rectilinearCorners, shift, type AddParam } from '../../../src/agent/reconstruct/profileParams';
import type { ProfilePrim } from '../../../src/agent/reconstruct/profileFit';
import type { V2 } from '../../../src/agent/reconstruct/geom';

const DEG = Math.PI / 180;

function polyline(pts: V2[]): ProfilePrim[] {
  return pts.map((a, i) => ({ kind: 'line' as const, a, b: pts[(i + 1) % pts.length] }));
}

function recorder(): { add: AddParam; names: Array<[string, number]> } {
  const names: Array<[string, number]> = [];
  return {
    names,
    add: (name, value) => {
      names.push([name, value]);
      return name;
    },
  };
}

describe('rectilinear profile params', () => {
  it('reads corners of a rectangle with one tangent round, and rejects slanted or non-tangent outlines', () => {
    const prims: ProfilePrim[] = [
      { kind: 'line', a: [0, 0], b: [37, 0] },
      { kind: 'arc', a: [37, 0], b: [40, 3], c: [37, 3], r: 3, ccw: true },
      { kind: 'line', a: [40, 3], b: [40, 20] },
      { kind: 'line', a: [40, 20], b: [0, 20] },
      { kind: 'line', a: [0, 20], b: [0, 0] },
    ];
    const corners = rectilinearCorners(prims, 1 * DEG, 1e-3)!;
    expect(corners.map((c) => [c.x, c.y, c.r])).toEqual([
      [0, 0, 0],
      [40, 0, 3],
      [40, 20, 0],
      [0, 20, 0],
    ]);
    expect(corners[1]).toMatchObject({ inDir: [1, 0], outDir: [0, 1] });

    expect(rectilinearCorners(polyline([[0, 0], [40, 0], [38, 20], [0, 20]]), 1 * DEG, 1e-3)).toBeUndefined();
    const offCentre = prims.map((p) => (p.kind === 'arc' ? { ...p, c: [36, 4] as V2 } : p));
    expect(rectilinearCorners(offCentre, 1 * DEG, 1e-3)).toBeUndefined();
  });

  it('names the base extents length/width and derives a flush step from them', () => {
    const book = new CoordinateBook(1e-6);
    const base = recorder();
    const exact = (_axis: 'x' | 'y', v: number) => v;
    const p1 = paramProfile(1, rectilinearCorners(polyline([[0, 0], [80, 0], [80, 50], [0, 50]]), DEG, 1e-3)!, book, base.add, exact, () => undefined);
    expect(p1.kind).toBe('rectangle');
    expect(base.names).toEqual([['length', 80], ['width', 50]]);
    expect(p1.corners.map((c) => `${c.x}, ${c.y}`)).toEqual(['0, 0', 'length, 0', 'length, width', '0, width']);

    const step = recorder();
    const p2 = paramProfile(2, rectilinearCorners(polyline([[50, 0], [80, 0], [80, 50], [50, 50]]), DEG, 1e-3)!, book, step.add, exact, () => undefined);
    expect(step.names).toEqual([['block2Length', 30]]);
    expect(p2.corners[0]).toMatchObject({ x: 'length.subtract(block2Length)', y: '0' });

    const boss = recorder();
    const p3 = paramProfile(3, rectilinearCorners(polyline([[10, 10], [20, 10], [20, 30], [10, 30]]), DEG, 1e-3)!, book, boss.add, exact, () => undefined);
    expect(boss.names).toEqual([['block3X', 10], ['block3Length', 10], ['block3Y', 10], ['block3Width', 20]]);
    expect(p3.corners[2]).toMatchObject({ x: 'block3X.add(block3Length)', y: 'block3Y.add(block3Width)' });
  });

  it('gives an L outline its extents plus one param per inner corner coordinate', () => {
    const book = new CoordinateBook(1e-6);
    const rec = recorder();
    const corners = rectilinearCorners(polyline([[0, 0], [60, 0], [60, 6], [6, 6], [6, 45], [0, 45]]), DEG, 1e-3)!;
    const p = paramProfile(1, corners, book, rec.add, (_a, v) => v, () => undefined);
    expect(p.kind).toBe('rectilinear');
    expect(rec.names).toEqual([['length', 60], ['profileX1', 6], ['width', 45], ['profileY1', 6]]);
    expect(p.corners.map((c) => `${c.x}, ${c.y}`)).toEqual(['0, 0', 'length, 0', 'length, profileY1', 'profileX1, profileY1', 'profileX1, width', '0, width']);
  });

  it('offsets param expressions and number literals by a radius param', () => {
    expect(shift('0', 'r', 1)).toBe('r');
    expect(shift('0', 'r', -1)).toBe('r.negate()');
    expect(shift('length', 'r', -1)).toBe('length.subtract(r)');
    expect(shift('12.5', 'r', 1)).toBe('r.add(12.5)');
    expect(shift('-4', 'r', -1)).toBe('r.negate().add(-4)');
    expect(shift('width', 'r', 0)).toBe('width');
  });
});
