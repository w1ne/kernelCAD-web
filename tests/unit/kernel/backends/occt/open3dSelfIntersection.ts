// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// tests/unit/kernel/backends/occt/open3dSelfIntersection.ts
//
// TypeScript port of open3d 0.19 `TriangleMesh::GetSelfIntersectingTriangles`
// (cpp/open3d/geometry/TriangleMesh.cpp, IntersectionTest::TriangleTriangle3d
// and 3rdparty/tomasakeninemoeller/opttritri.h). Same arithmetic: per-pair
// mean/sigma normalisation, then Moller's no-division test with its 1e-6
// coplanarity epsilon, skipping pairs that share a vertex index.
//
// It reproduces open3d's verdicts, including its false positives on
// near-coplanar triangles and caps. That is the point: `is_watertight()`
// (used by STL benchmark scorers and point-cloud pipelines) fails a mesh on
// any reported pair, so export meshes must not trip it. Validated against
// open3d 0.19 on the cqe task meshes (identical pair counts: 1, 2, 5, 469,
// 72, 118).
const EPS = 1e-6;
type V3 = [number, number, number];
function coplanar(N: V3, V0: V3, V1: V3, V2: V3, U0: V3, U1: V3, U2: V3): number {
  const A = [Math.abs(N[0]), Math.abs(N[1]), Math.abs(N[2])];
  let i0: number, i1: number;
  if (A[0] > A[1]) { if (A[0] > A[2]) { i0 = 1; i1 = 2; } else { i0 = 0; i1 = 1; } }
  else { if (A[2] > A[1]) { i0 = 0; i1 = 1; } else { i0 = 0; i1 = 2; } }
  const edgeEdge = (P0: V3, Ax: number, Ay: number, Q0: V3, Q1: V3): boolean => {
    const Bx = Q0[i0] - Q1[i0], By = Q0[i1] - Q1[i1], Cx = P0[i0] - Q0[i0], Cy = P0[i1] - Q0[i1];
    const f = Ay * Bx - Ax * By, d = By * Cx - Bx * Cy;
    if ((f > 0 && d >= 0 && d <= f) || (f < 0 && d <= 0 && d >= f)) {
      const e = Ax * Cy - Ay * Cx;
      if (f > 0) { if (e >= 0 && e <= f) return true; } else if (e <= 0 && e >= f) return true;
    }
    return false;
  };
  const edgeTri = (P0: V3, P1: V3): boolean => {
    const Ax = P1[i0] - P0[i0], Ay = P1[i1] - P0[i1];
    return edgeEdge(P0, Ax, Ay, U0, U1) || edgeEdge(P0, Ax, Ay, U1, U2) || edgeEdge(P0, Ax, Ay, U2, U0);
  };
  if (edgeTri(V0, V1) || edgeTri(V1, V2) || edgeTri(V2, V0)) return 1;
  const pointIn = (P: V3, Q0: V3, Q1: V3, Q2: V3): boolean => {
    let a = Q1[i1] - Q0[i1], b = -(Q1[i0] - Q0[i0]), c = -a * Q0[i0] - b * Q0[i1];
    const d0 = a * P[i0] + b * P[i1] + c;
    a = Q2[i1] - Q1[i1]; b = -(Q2[i0] - Q1[i0]); c = -a * Q1[i0] - b * Q1[i1];
    const d1 = a * P[i0] + b * P[i1] + c;
    a = Q0[i1] - Q2[i1]; b = -(Q0[i0] - Q2[i0]); c = -a * Q2[i0] - b * Q2[i1];
    const d2 = a * P[i0] + b * P[i1] + c;
    return d0 * d1 > 0 && d0 * d2 > 0;
  };
  if (pointIn(V0, U0, U1, U2) || pointIn(U0, V0, V1, V2)) return 1;
  return 0;
}
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a: V3, b: V3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
function noDiv(V0: V3, V1: V3, V2: V3, U0: V3, U1: V3, U2: V3): number {
  const N1 = cross(sub(V1, V0), sub(V2, V0)); const d1 = -dot(N1, V0);
  let du0 = dot(N1, U0) + d1, du1 = dot(N1, U1) + d1, du2 = dot(N1, U2) + d1;
  if (Math.abs(du0) < EPS) du0 = 0; if (Math.abs(du1) < EPS) du1 = 0; if (Math.abs(du2) < EPS) du2 = 0;
  const du0du1 = du0 * du1, du0du2 = du0 * du2;
  if (du0du1 > 0 && du0du2 > 0) return 0;
  const N2 = cross(sub(U1, U0), sub(U2, U0)); const d2 = -dot(N2, U0);
  let dv0 = dot(N2, V0) + d2, dv1 = dot(N2, V1) + d2, dv2 = dot(N2, V2) + d2;
  if (Math.abs(dv0) < EPS) dv0 = 0; if (Math.abs(dv1) < EPS) dv1 = 0; if (Math.abs(dv2) < EPS) dv2 = 0;
  const dv0dv1 = dv0 * dv1, dv0dv2 = dv0 * dv2;
  if (dv0dv1 > 0 && dv0dv2 > 0) return 0;
  const D = cross(N1, N2);
  let max = Math.abs(D[0]), index = 0; const bb = Math.abs(D[1]), cc = Math.abs(D[2]);
  if (bb > max) { max = bb; index = 1; } if (cc > max) { max = cc; index = 2; }
  const interval = (VV0: number, VV1: number, VV2: number, D0: number, D1: number, D2: number, D0D1: number, D0D2: number): [number, number, number, number, number] | null => {
    if (D0D1 > 0) return [VV2, (VV0 - VV2) * D2, (VV1 - VV2) * D2, D2 - D0, D2 - D1];
    if (D0D2 > 0) return [VV1, (VV0 - VV1) * D1, (VV2 - VV1) * D1, D1 - D0, D1 - D2];
    if (D1 * D2 > 0 || D0 !== 0) return [VV0, (VV1 - VV0) * D0, (VV2 - VV0) * D0, D0 - D1, D0 - D2];
    if (D1 !== 0) return [VV1, (VV0 - VV1) * D1, (VV2 - VV1) * D1, D1 - D0, D1 - D2];
    if (D2 !== 0) return [VV2, (VV0 - VV2) * D2, (VV1 - VV2) * D2, D2 - D0, D2 - D1];
    return null;
  };
  const r1 = interval(V0[index], V1[index], V2[index], dv0, dv1, dv2, dv0dv1, dv0dv2);
  if (r1 === null) return coplanar(N1, V0, V1, V2, U0, U1, U2);
  const r2 = interval(U0[index], U1[index], U2[index], du0, du1, du2, du0du1, du0du2);
  if (r2 === null) return coplanar(N1, V0, V1, V2, U0, U1, U2);
  const [a, b, c, x0, x1] = r1; const [d, e, f, y0, y1] = r2;
  const xx = x0 * x1, yy = y0 * y1, xxyy = xx * yy;
  let tmp = a * xxyy; let s0 = tmp + b * x1 * yy, s1 = tmp + c * x0 * yy;
  tmp = d * xxyy; let t0 = tmp + e * xx * y1, t1 = tmp + f * xx * y0;
  if (s0 > s1) [s0, s1] = [s1, s0]; if (t0 > t1) [t0, t1] = [t1, t0];
  if (s1 < t0 || t1 < s0) return 0;
  return 1;
}
function triTri(p0: V3, p1: V3, p2: V3, q0: V3, q1: V3, q2: V3): boolean {
  const mu: V3 = [0, 0, 0]; const pts = [p0, p1, p2, q0, q1, q2];
  for (const p of pts) for (let k = 0; k < 3; k++) mu[k] += p[k];
  for (let k = 0; k < 3; k++) mu[k] /= 6;
  const sg: V3 = [0, 0, 0];
  for (const p of pts) for (let k = 0; k < 3; k++) sg[k] += (p[k] - mu[k]) ** 2;
  for (let k = 0; k < 3; k++) sg[k] = Math.sqrt(sg[k] / 5) + 1e-12;
  const n = (p: V3): V3 => [(p[0] - mu[0]) / sg[0], (p[1] - mu[1]) / sg[1], (p[2] - mu[2]) / sg[2]];
  return noDiv(n(p0), n(p1), n(p2), n(q0), n(q1), n(q2)) !== 0;
}
/** Pairs open3d would report. A uniform grid over triangle AABBs replaces the O(n^2) loop; same pair set. */
export function open3dSelfIntersectingPairs(vertices: ArrayLike<number>, triangles: ArrayLike<number>): Array<[number, number]> {
  const nt = triangles.length / 3;
  const P = (i: number): V3 => [vertices[3 * i], vertices[3 * i + 1], vertices[3 * i + 2]];
  const lo = new Float64Array(nt * 3), hi = new Float64Array(nt * 3);
  const gmin: V3 = [Infinity, Infinity, Infinity], gmax: V3 = [-Infinity, -Infinity, -Infinity];
  for (let t = 0; t < nt; t++) for (let k = 0; k < 3; k++) {
    const a = vertices[3 * triangles[3 * t] + k], b = vertices[3 * triangles[3 * t + 1] + k], c = vertices[3 * triangles[3 * t + 2] + k];
    lo[3 * t + k] = Math.min(a, b, c); hi[3 * t + k] = Math.max(a, b, c);
    gmin[k] = Math.min(gmin[k], lo[3 * t + k]); gmax[k] = Math.max(gmax[k], hi[3 * t + k]);
  }
  const res = Math.max(1, Math.round(Math.cbrt(nt)));
  const cell = [0, 1, 2].map(k => (gmax[k] - gmin[k]) / res || 1);
  const ci = (v: number, k: number) => Math.min(res - 1, Math.max(0, Math.floor((v - gmin[k]) / cell[k])));
  const grid = new Map<number, number[]>();
  for (let t = 0; t < nt; t++) {
    for (let x = ci(lo[3 * t], 0); x <= ci(hi[3 * t], 0); x++) for (let y = ci(lo[3 * t + 1], 1); y <= ci(hi[3 * t + 1], 1); y++) for (let z = ci(lo[3 * t + 2], 2); z <= ci(hi[3 * t + 2], 2); z++) {
      const key = (x * res + y) * res + z; let l = grid.get(key); if (!l) grid.set(key, l = []); l.push(t);
    }
  }
  const out: Array<[number, number]> = [];
  for (const [key, list] of grid) {
    const cz = key % res, cy = Math.floor(key / res) % res, cx = Math.floor(key / (res * res));
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
      const a = Math.min(list[i], list[j]), b = Math.max(list[i], list[j]);
      let overlap = true;
      for (let k = 0; k < 3; k++) if (hi[3 * a + k] < lo[3 * b + k] || hi[3 * b + k] < lo[3 * a + k]) { overlap = false; break; }
      if (!overlap) continue;
      // Visit each pair once: in the cell holding the low corner of the AABB overlap.
      if (ci(Math.max(lo[3 * a], lo[3 * b]), 0) !== cx || ci(Math.max(lo[3 * a + 1], lo[3 * b + 1]), 1) !== cy || ci(Math.max(lo[3 * a + 2], lo[3 * b + 2]), 2) !== cz) continue;
      const ta = [triangles[3 * a], triangles[3 * a + 1], triangles[3 * a + 2]], tb = [triangles[3 * b], triangles[3 * b + 1], triangles[3 * b + 2]];
      if (ta.some(v => tb.includes(v))) continue;
      if (triTri(P(ta[0]), P(ta[1]), P(ta[2]), P(tb[0]), P(tb[1]), P(tb[2]))) out.push([a, b]);
    }
  }
  return out;
}
