// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { buildTubePath, isTubePathError, type TubePath, type V3 } from '../../../src/shared/tube/tubePath';
import { bendTableFromPath, formatBendTableCsv, xyzFromLra } from '../../../src/shared/tube/bendTable';

function ok(points: V3[], r: number): TubePath {
  const p = buildTubePath(points, r);
  if (isTubePathError(p)) throw new Error(p.kind);
  return p;
}
const dist = (a: V3, b: V3): number => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
/** Rigid-motion invariant: every pairwise corner distance. */
function distances(pts: V3[]): number[] {
  const out: number[] = [];
  for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) out.push(dist(pts[i], pts[j]));
  return out;
}

describe('bendTableFromPath', () => {
  it('planar S-bend rotates the second bend by 180°', () => {
    const t = bendTableFromPath(ok([[0, 0, 0], [100, 0, 0], [100, 100, 0], [200, 100, 0]], 25));
    expect(t.lra).toEqual([
      { l: expect.closeTo(75, 9), r: 0, a: expect.closeTo(90, 9) },
      { l: expect.closeTo(50, 9), r: expect.closeTo(180, 6), a: expect.closeTo(90, 9) },
    ]);
    expect(t.lastStraight).toBeCloseTo(75, 9);
  });

  it('planar U-bend has zero rotation', () => {
    const t = bendTableFromPath(ok([[0, 0, 0], [100, 0, 0], [100, 100, 0], [0, 100, 0]], 25));
    expect(t.lra[1].r).toBeCloseTo(0, 6);
  });

  it('LRA rebuilds the same shape for an out-of-plane three-bend tube', () => {
    const path = ok([[0, 0, 0], [120, 0, 0], [120, 90, 30], [40, 90, 110], [40, 200, 110]], 22);
    const table = bendTableFromPath(path);
    const rebuilt = xyzFromLra(table);
    const want = distances(path.points);
    const got = distances(rebuilt);
    got.forEach((d, i) => expect(d).toBeCloseTo(want[i], 6));
    // chirality: a mirror image has the same distances, so check a signed volume too
    const triple = (p: V3[]): number => {
      const a = [p[1][0] - p[0][0], p[1][1] - p[0][1], p[1][2] - p[0][2]];
      const b = [p[2][0] - p[1][0], p[2][1] - p[1][1], p[2][2] - p[1][2]];
      const c = [p[3][0] - p[2][0], p[3][1] - p[2][1], p[3][2] - p[2][2]];
      return a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0]);
    };
    expect(Math.sign(triple(rebuilt))).toBe(Math.sign(triple(path.points)));
  });

  it('writes one CSV with a header block, XYZ rows and LRA rows', () => {
    const csv = formatBendTableCsv('hyd-pressure', 9.525, 0.89, bendTableFromPath(ok([[0, 0, 0], [100, 0, 0], [100, 80, 0]], 20)));
    const lines = csv.trim().split('\n');
    expect(lines[0]).toBe('name,hyd-pressure');
    expect(lines).toContain('od_mm,9.525');
    expect(lines).toContain('bend_radius_mm,20');
    expect(lines).toContain('point,x_mm,y_mm,z_mm');
    expect(lines).toContain('bend,l_mm,r_deg,a_deg');
    expect(lines).toContain('1,80.000,0.000,90.000');
  });

  it('tube-local XYZ starts at the origin, runs along +X and bends first in the XY plane', () => {
    const t = bendTableFromPath(ok([[10, 20, 30], [10, 20, 130], [10, 100, 130], [70, 100, 130]], 20));
    // The world legs +Z, +Y, +X map to local +X, +Y, -Z (a rotation, not a mirror).
    const want: V3[] = [[0, 0, 0], [100, 0, 0], [100, 80, 0], [100, 80, -60]];
    expect(t.xyz).toHaveLength(4);
    t.xyz.forEach((p, i) => p.forEach((v, k) => expect(v).toBeCloseTo(want[i][k], 9)));
    expect(t.lra[1].r).toBeCloseTo(-90, 6);
  });

  it('a straight tube has no bends and two XYZ points', () => {
    const t = bendTableFromPath(ok([[0, 0, 0], [0, 0, 50]], 20));
    expect(t.lra).toEqual([]);
    expect(t.lastStraight).toBe(50);
    expect(t.xyz).toEqual([[0, 0, 0], [50, 0, 0]]);
  });

  it('never prints a negative zero', () => {
    const k = 170 / Math.SQRT2;
    const flat = ok([[3, -7, 11], [153, -7, 11], [153, 123, 11], [153 + k, 123 + k, 11], [13 + k, 123 + k, 11]], 20);
    expect(formatBendTableCsv('t', 10, 1, bendTableFromPath(flat))).not.toContain('-0.000');
  });

  it('reports a half-turn rotation as +180, never -180', () => {
    const h = Math.sqrt(5);
    const leg = (len: number): V3 => [len / h, 0, (2 * len) / h];
    const a: V3 = [150, 0, 0];
    const b: V3 = [a[0] + leg(130)[0], 0, leg(130)[2]];
    const c: V3 = [b[0], 170, b[2]];
    const d: V3 = [c[0] + leg(140)[0], 170, c[2] + leg(140)[2]];
    const t = bendTableFromPath(ok([[0, 0, 0], a, b, c, d], 20));
    expect(t.lra[1].r).toBeCloseTo(-90, 6);
    expect(t.lra[2].r).toBeCloseTo(180, 6);
  });
});
