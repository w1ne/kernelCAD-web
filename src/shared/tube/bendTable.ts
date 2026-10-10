// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { add, cross, dot, scale, sub, unit, type TubePath, type V3 } from './tubePath';

export interface LraRow { l: number; r: number; a: number }
export interface BendTable { lra: LraRow[]; lastStraight: number; xyz: V3[]; bendRadius: number; cutLength: number }

const DEG = 180 / Math.PI;
const HALF_TURN_EPS_DEG = 1e-9;

/** Rodrigues rotation of `v` about unit `axis` by `deg`. */
function rotate(v: V3, axis: V3, deg: number): V3 {
  const t = deg / DEG;
  const c = Math.cos(t);
  const s = Math.sin(t);
  return add(add(scale(v, c), scale(cross(axis, v), s)), scale(axis, dot(axis, v) * (1 - c)));
}

/** Signed rotation from the previous bend plane to this one about the leg
 *  between them, in (-180, 180]. A half turn is reported as +180 whichever
 *  side of it the rounding lands on. */
function planeRotationDeg(prevNormal: V3, normal: V3, leg: V3): number {
  const r = Math.atan2(dot(cross(prevNormal, normal), leg), dot(prevNormal, normal)) * DEG;
  if (r <= -180 + HALF_TURN_EPS_DEG) return 180;
  return r === 0 ? 0 : r;
}

function lraRows(path: TubePath): LraRow[] {
  return path.bends.map((b, k) => {
    const prev = path.bends[k - 1];
    const leg = unit(sub(path.points[b.corner], path.points[b.corner - 1]));
    // straights[] is indexed by leg; collinear corners are already dropped, so
    // the leg before bend k is leg `b.corner - 1`.
    return {
      l: path.straights[b.corner - 1],
      r: prev === undefined ? 0 : planeRotationDeg(prev.normal, b.normal, leg),
      a: b.angleDeg,
    };
  });
}

export function xyzFromLra(table: Pick<BendTable, 'lra' | 'lastStraight' | 'bendRadius'>): V3[] {
  const tan = (a: number): number => table.bendRadius * Math.tan(a / DEG / 2);
  let pos: V3 = [0, 0, 0];
  let dir: V3 = [1, 0, 0];
  let normal: V3 = [0, 0, 1];
  let carry = 0;
  const pts: V3[] = [pos];
  for (const row of table.lra) {
    normal = rotate(normal, dir, row.r);
    pos = add(pos, scale(dir, carry + row.l + tan(row.a)));
    pts.push(pos);
    dir = rotate(dir, normal, row.a);
    carry = tan(row.a);
  }
  pts.push(add(pos, scale(dir, carry + table.lastStraight)));
  return pts;
}

export function bendTableFromPath(path: TubePath): BendTable {
  const lra = lraRows(path);
  const lastStraight = path.straights[path.straights.length - 1];
  return {
    lra,
    lastStraight,
    xyz: xyzFromLra({ lra, lastStraight, bendRadius: path.bendRadius }),
    bendRadius: path.bendRadius,
    cutLength: path.cutLength,
  };
}

/** Three decimals; a value that rounds to zero prints without a sign. */
const f = (n: number): string => {
  const s = n.toFixed(3);
  return s === '-0.000' ? '0.000' : s;
};

export function formatBendTableCsv(name: string, od: number, wall: number, table: BendTable): string {
  const head = [
    `name,${name}`, `od_mm,${od}`, `wall_mm,${wall}`,
    `bend_radius_mm,${table.bendRadius}`, `cut_length_mm,${f(table.cutLength)}`,
  ];
  const xyz = table.xyz.map((p, i) => `${i + 1},${f(p[0])},${f(p[1])},${f(p[2])}`);
  const lra = table.lra.map((row, i) => `${i + 1},${f(row.l)},${f(row.r)},${f(row.a)}`);
  return [
    ...head, '', 'point,x_mm,y_mm,z_mm', ...xyz, '', 'bend,l_mm,r_deg,a_deg', ...lra,
    `last_straight_mm,${f(table.lastStraight)}`, '',
  ].join('\n');
}
