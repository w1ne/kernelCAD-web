// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/properties/meshMassProperties.ts
//
// Mass properties of a CLOSED, outward-wound triangle mesh, exact for the
// polyhedron: each triangle spans a signed tetrahedron with a reference
// point, whose first and second moments have closed forms (Tonon 2004).
// Same units and conventions as computeMassProperties (OCCT path): mm in,
// kg / kg*m^2 out, inertia about the centre of mass.

import type { Vec3 } from '../../shared/intent/types';
import type { GyrationAxis, MassProperties } from './massProperties';

const MM3_TO_M3 = 1e-9;
const INERTIA_SCALE_PER_DENSITY = 1e-15;

interface Moments { v: number; m1: [number, number, number]; m2: number[] }

/** Volume, first moments and second moments (xx, yy, zz, xy, xz, yz) about `o`. */
function moments(P: ArrayLike<number>, I: ArrayLike<number>, o: Vec3): Moments {
  let v = 0;
  const m1: [number, number, number] = [0, 0, 0];
  const m2 = [0, 0, 0, 0, 0, 0];
  const pairs: [number, number, number][] = [[0, 0, 0], [1, 1, 1], [2, 2, 2], [0, 1, 3], [0, 2, 4], [1, 2, 5]];
  for (let t = 0; t < I.length; t += 3) {
    const a = [P[3 * I[t]] - o[0], P[3 * I[t] + 1] - o[1], P[3 * I[t] + 2] - o[2]];
    const b = [P[3 * I[t + 1]] - o[0], P[3 * I[t + 1] + 1] - o[1], P[3 * I[t + 1] + 2] - o[2]];
    const c = [P[3 * I[t + 2]] - o[0], P[3 * I[t + 2] + 1] - o[1], P[3 * I[t + 2] + 2] - o[2]];
    const d = (a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6;
    v += d;
    for (let k = 0; k < 3; k++) m1[k] += d * (a[k] + b[k] + c[k]) / 4;
    for (const [i, j, slot] of pairs) {
      const s = 2 * (a[i] * a[j] + b[i] * b[j] + c[i] * c[j])
        + a[i] * b[j] + a[j] * b[i] + a[i] * c[j] + a[j] * c[i] + b[i] * c[j] + b[j] * c[i];
      m2[slot] += d * s / 20;
    }
  }
  return { v, m1, m2 };
}

/** Cyclic Jacobi eigen-decomposition of a symmetric 3x3 matrix. */
function eigenSym3(m: number[][]): { values: [number, number, number]; vectors: [Vec3, Vec3, Vec3] } {
  const a = m.map((r) => r.slice());
  const v = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  for (let sweep = 0; sweep < 50; sweep++) {
    const off = Math.abs(a[0][1]) + Math.abs(a[0][2]) + Math.abs(a[1][2]);
    if (off < 1e-30) break;
    for (const [p, q] of [[0, 1], [0, 2], [1, 2]]) {
      if (Math.abs(a[p][q]) < 1e-300) continue;
      const theta = (a[q][q] - a[p][p]) / (2 * a[p][q]);
      const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
      const c = 1 / Math.sqrt(t * t + 1), s = t * c;
      for (let k = 0; k < 3; k++) {
        const akp = a[k][p], akq = a[k][q];
        a[k][p] = c * akp - s * akq; a[k][q] = s * akp + c * akq;
      }
      for (let k = 0; k < 3; k++) {
        const apk = a[p][k], aqk = a[q][k];
        a[p][k] = c * apk - s * aqk; a[q][k] = s * apk + c * aqk;
      }
      for (let k = 0; k < 3; k++) {
        const vkp = v[k][p], vkq = v[k][q];
        v[k][p] = c * vkp - s * vkq; v[k][q] = s * vkp + c * vkq;
      }
    }
  }
  const col = (j: number): Vec3 => [v[0][j], v[1][j], v[2][j]];
  return { values: [a[0][0], a[1][1], a[2][2]], vectors: [col(0), col(1), col(2)] };
}

export function meshMassProperties(
  positions: ArrayLike<number>,
  indices: ArrayLike<number>,
  density = 1000,
  gyrationAxis?: GyrationAxis,
): MassProperties {
  // Reference point at the vertex centroid keeps the sums well conditioned.
  const o: Vec3 = [0, 0, 0];
  const nv = positions.length / 3;
  for (let i = 0; i < positions.length; i += 3) { o[0] += positions[i] / nv; o[1] += positions[i + 1] / nv; o[2] += positions[i + 2] / nv; }
  const { v, m1, m2 } = moments(positions, indices, o);
  const c = v !== 0 ? [m1[0] / v, m1[1] / v, m1[2] / v] : [0, 0, 0];
  // Central second moments.
  const sxx = m2[0] - v * c[0] * c[0], syy = m2[1] - v * c[1] * c[1], szz = m2[2] - v * c[2] * c[2];
  const sxy = m2[3] - v * c[0] * c[1], sxz = m2[4] - v * c[0] * c[2], syz = m2[5] - v * c[1] * c[2];
  const k = density * INERTIA_SCALE_PER_DENSITY;
  const ixx = (syy + szz) * k, iyy = (sxx + szz) * k, izz = (sxx + syy) * k;
  const ixy = -sxy * k, ixz = -sxz * k, iyz = -syz * k;
  const M = [[ixx, ixy, ixz], [ixy, iyy, iyz], [ixz, iyz, izz]];
  const eig = eigenSym3(M);
  const scale = Math.max(Math.abs(eig.values[0]), Math.abs(eig.values[1]), Math.abs(eig.values[2]), 1e-300);
  const close = (p: number, q: number): boolean => Math.abs(p - q) < 1e-6 * scale;
  const [e0, e1, e2] = eig.values;
  const out: MassProperties = {
    mass: v * MM3_TO_M3 * density,
    com: [c[0] + o[0], c[1] + o[1], c[2] + o[2]],
    inertia6: [ixx, ixy, ixz, iyy, iyz, izz],
    inertiaMatrix: [[ixx, ixy, ixz], [ixy, iyy, iyz], [ixz, iyz, izz]],
    principalMoments: eig.values,
    principalAxes: eig.vectors,
    hasSymmetryAxis: close(e0, e1) || close(e1, e2) || close(e0, e2),
    hasSymmetryPoint: close(e0, e1) && close(e1, e2),
  };
  if (gyrationAxis) out.radiusOfGyration = gyrationRadius(out, gyrationAxis);
  return out;
}

function gyrationRadius(p: MassProperties, axis: GyrationAxis): number {
  const len = Math.hypot(...axis.direction) || 1;
  const u = axis.direction.map((x) => x / len);
  const I = p.inertiaMatrix;
  let iAxis = 0;
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) iAxis += u[i] * I[i][j] * u[j];
  // Parallel-axis shift from the centroid to the given axis.
  const d = [p.com[0] - axis.origin[0], p.com[1] - axis.origin[1], p.com[2] - axis.origin[2]];
  const along = d[0] * u[0] + d[1] * u[1] + d[2] * u[2];
  const perp2 = d[0] * d[0] + d[1] * d[1] + d[2] * d[2] - along * along;
  const iTotal = iAxis + p.mass * perp2 * 1e-6;
  return p.mass > 0 ? Math.sqrt(iTotal / p.mass) * 1e3 : 0;
}
