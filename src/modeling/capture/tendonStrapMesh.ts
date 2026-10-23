// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/capture/tendonStrapMesh.ts
//
// `arm.tendon(..., { visualStyle: 'strap' })` — a flat braided strap swept
// along the routed tendon centerline. The route is smoothed with uniform
// Catmull-Rom splines (passes through every control point), then a thin
// rectangular section (width x thickness) is swept along it. Faces are
// flat-shaded (per-face vertices) with outward normals; UVs run
// u = arc length / period, v = 0..1 across the width, so a braid texture
// tiles along the strap. World-frame output, same convention as the other
// tendon meshes.

import type { Vec3 } from '../../shared/intent/types';
import type { FaceGeometry } from '../../shared/worker/workerTypes';

/** Catmull-Rom subdivisions per span. */
export const STRAP_SUBDIVISIONS = 6;

export interface StrapInput {
  /** World-frame centerline control points (from, vias..., to). */
  readonly points: readonly Vec3[];
  /** World-frame width direction at each control point (need not be unit). */
  readonly widthDirs: readonly Vec3[];
  readonly widthMm: number;
  readonly thicknessMm: number;
  readonly periodMm: number;
}

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const len = (a: Vec3): number => Math.hypot(a[0], a[1], a[2]);
function unit(a: Vec3): Vec3 | undefined {
  const l = len(a);
  return l < 1e-9 ? undefined : mul(a, 1 / l);
}

function catmull(p0: Vec3, p1: Vec3, p2: Vec3, p3: Vec3, t: number): Vec3 {
  const t2 = t * t, t3 = t2 * t;
  const out: number[] = [0, 0, 0];
  for (let i = 0; i < 3; i++) {
    out[i] = 0.5 * (2 * p1[i] + (-p0[i] + p2[i]) * t
      + (2 * p0[i] - 5 * p1[i] + 4 * p2[i] - p3[i]) * t2
      + (-p0[i] + 3 * p1[i] - 3 * p2[i] + p3[i]) * t3);
  }
  return [out[0], out[1], out[2]];
}

/** Smooth `pts` (and a per-point attribute `attr`, linearly interpolated)
 *  with `STRAP_SUBDIVISIONS` samples per span; endpoints preserved. */
export function catmullRomSubdivide(
  pts: readonly Vec3[],
  attr: readonly Vec3[],
  steps = STRAP_SUBDIVISIONS,
): { points: Vec3[]; attr: Vec3[] } {
  const n = pts.length;
  if (n < 3) return { points: [...pts], attr: [...attr] };
  const at = (i: number): Vec3 => {
    if (i < 0) return sub(mul(pts[0], 2), pts[1]);
    if (i >= n) return sub(mul(pts[n - 1], 2), pts[n - 2]);
    return pts[i];
  };
  const points: Vec3[] = [];
  const attrs: Vec3[] = [];
  for (let i = 0; i < n - 1; i++) {
    for (let k = 0; k < steps; k++) {
      const t = k / steps;
      points.push(catmull(at(i - 1), at(i), at(i + 1), at(i + 2), t));
      attrs.push(add(mul(attr[i], 1 - t), mul(attr[i + 1], t)));
    }
  }
  points.push(pts[n - 1]);
  attrs.push(attr[n - 1]);
  return { points, attr: attrs };
}

/** Per-point frame: unit tangent, width dir (⊥ tangent), thickness = T × w. */
function sweepFrames(points: readonly Vec3[], widths: readonly Vec3[]): { w: Vec3; n: Vec3 }[] {
  const frames: { w: Vec3; n: Vec3 }[] = [];
  let prevT: Vec3 | undefined;
  let prevW: Vec3 | undefined;
  for (let k = 0; k < points.length; k++) {
    const dPrev = k > 0 ? unit(sub(points[k], points[k - 1])) : undefined;
    const dNext = k < points.length - 1 ? unit(sub(points[k + 1], points[k])) : undefined;
    const tSum = dPrev !== undefined && dNext !== undefined ? add(dPrev, dNext) : (dPrev ?? dNext ?? prevT ?? [1, 0, 0]);
    const T = unit(tSum) ?? dPrev ?? dNext ?? prevT ?? ([1, 0, 0] as Vec3);
    const want = unit(widths[k]) ?? prevW ?? ([0, 1, 0] as Vec3);
    let w = unit(sub(want, mul(T, dot(want, T))));
    if (w === undefined) {
      // Width axis parallel to the tangent: carry the previous width, else any perpendicular.
      const base = prevW ?? (Math.abs(T[2]) < 0.9 ? ([0, 0, 1] as Vec3) : ([1, 0, 0] as Vec3));
      w = unit(sub(base, mul(T, dot(base, T)))) ?? ([0, 1, 0] as Vec3);
    }
    frames.push({ w, n: cross(T, w) });
    prevT = T;
    prevW = w;
  }
  return frames;
}

/** Build the strap ribbon; null for a degenerate route or size. */
export function buildStrapMesh(input: StrapInput): FaceGeometry | null {
  const { widthMm, thicknessMm, periodMm } = input;
  if (input.points.length < 2 || widthMm <= 0 || thicknessMm <= 0 || periodMm <= 0) return null;
  const smooth = catmullRomSubdivide(input.points, input.widthDirs);
  // Drop coincident samples so tangents stay defined.
  const pts: Vec3[] = [];
  const wds: Vec3[] = [];
  smooth.points.forEach((p, i) => {
    if (pts.length === 0 || len(sub(p, pts[pts.length - 1])) > 1e-6) {
      pts.push(p);
      wds.push(smooth.attr[i]);
    }
  });
  if (pts.length < 2) return null;
  const frames = sweepFrames(pts, wds);
  const arc: number[] = [0];
  for (let k = 1; k < pts.length; k++) arc.push(arc[k - 1] + len(sub(pts[k], pts[k - 1])));

  const hw = widthMm / 2, ht = thicknessMm / 2;
  const N = pts.length;
  const vertCount = 8 * N + 8;
  const vertices = new Float32Array(vertCount * 3);
  const normals = new Float32Array(vertCount * 3);
  const uv = new Float32Array(vertCount * 2);
  const put = (vi: number, p: Vec3, nrm: Vec3, u: number, v: number): void => {
    vertices.set(p, vi * 3);
    normals.set(nrm, vi * 3);
    uv[vi * 2] = u;
    uv[vi * 2 + 1] = v;
  };
  const corner = (k: number, sw: number, sn: number): Vec3 =>
    add(pts[k], add(mul(frames[k].w, sw * hw), mul(frames[k].n, sn * ht)));
  // Faces in loop order top, right, bottom, left: [start corner, end corner,
  // outward normal selector, v at start, v at end]. Corners are (±w, ±n).
  const faces: { a: [number, number]; b: [number, number]; nrm: (f: { w: Vec3; n: Vec3 }) => Vec3; va: number; vb: number }[] = [
    { a: [-1, 1], b: [1, 1], nrm: (f) => f.n, va: 0, vb: 1 },
    { a: [1, 1], b: [1, -1], nrm: (f) => f.w, va: 1, vb: 1 },
    { a: [1, -1], b: [-1, -1], nrm: (f) => mul(f.n, -1), va: 1, vb: 0 },
    { a: [-1, -1], b: [-1, 1], nrm: (f) => mul(f.w, -1), va: 0, vb: 0 },
  ];
  const indices = new Uint32Array((N - 1) * 4 * 6 + 12);
  let ii = 0;
  for (let k = 0; k < N; k++) {
    const u = arc[k] / periodMm;
    faces.forEach((fc, fi) => {
      const base = k * 8 + fi * 2;
      const nrm = fc.nrm(frames[k]);
      put(base, corner(k, fc.a[0], fc.a[1]), nrm, u, fc.va);
      put(base + 1, corner(k, fc.b[0], fc.b[1]), nrm, u, fc.vb);
    });
  }
  for (let k = 0; k < N - 1; k++) {
    for (let fi = 0; fi < 4; fi++) {
      const a0 = k * 8 + fi * 2, a1 = a0 + 1, b0 = (k + 1) * 8 + fi * 2, b1 = b0 + 1;
      indices.set([a0, b0, b1, a0, b1, a1], ii);
      ii += 6;
    }
  }
  // End caps (start: -T, end: +T), 4 corners each.
  const cap = (k: number, first: number, outward: number): void => {
    const T = cross(frames[k].w, frames[k].n); // w × n = T
    const nrm = mul(T, outward);
    const u = arc[k] / periodMm;
    const cs: [number, number, number][] = [[-1, 1, 0], [1, 1, 1], [1, -1, 1], [-1, -1, 0]];
    cs.forEach(([sw, sn, v], j) => put(first + j, corner(k, sw, sn), nrm, u, v));
    if (outward < 0) indices.set([first, first + 1, first + 2, first, first + 2, first + 3], ii);
    else indices.set([first, first + 2, first + 1, first, first + 3, first + 2], ii);
    ii += 6;
  };
  cap(0, 8 * N, -1);
  cap(N - 1, 8 * N + 4, 1);
  return { vertices, indices, normals, uv, faceId: 0 };
}
