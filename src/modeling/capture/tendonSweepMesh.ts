// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/capture/tendonSweepMesh.ts
//
// `arm.tendon(..., { profile })` sweeps. The routed centerline is smoothed
// with uniform Catmull-Rom splines (passes through every control point);
// a `flat` profile is then swept as a thin rectangular ribbon (width x
// thickness) with flat-shaded faces and outward normals. UVs run
// u = arc length / width, v = 0..1 across the width, so an albedo map tiles
// along the cable. (The `round` profile reuses the existing tube sweep in
// featureMeshing.ts, with `routeArcLengths` for its UVs.) World-frame output,
// same convention as the other tendon meshes.

import type { Vec3 } from '../../shared/intent/types';
import type { FaceGeometry } from '../../shared/worker/workerTypes';

/** Catmull-Rom subdivisions per span. */
export const SWEEP_SUBDIVISIONS = 6;

export interface RibbonInput {
  /** World-frame centerline control points (from, vias..., to). */
  readonly points: readonly Vec3[];
  /** World-frame width direction at each control point (need not be unit). */
  readonly widthDirs: readonly Vec3[];
  readonly widthMm: number;
  readonly thicknessMm: number;
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
 *  with `SWEEP_SUBDIVISIONS` samples per span; endpoints preserved. */
export function catmullRomSubdivide(
  pts: readonly Vec3[],
  attr: readonly Vec3[],
  steps = SWEEP_SUBDIVISIONS,
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

/** Catmull-Rom smoothing of a route plus removal of coincident samples (so
 *  tangents stay defined). `attr` is interpolated alongside the points. */
export function smoothRoute(pts: readonly Vec3[], attr: readonly Vec3[]): { points: Vec3[]; attr: Vec3[] } {
  const smooth = catmullRomSubdivide(pts, attr);
  const points: Vec3[] = [];
  const attrs: Vec3[] = [];
  smooth.points.forEach((p, i) => {
    if (points.length === 0 || len(sub(p, points[points.length - 1])) > 1e-6) {
      points.push(p);
      attrs.push(smooth.attr[i]);
    }
  });
  return { points, attr: attrs };
}

/** Cumulative arc length along a polyline. */
export function routeArcLengths(pts: readonly Vec3[]): number[] {
  const arc = [0];
  for (let k = 1; k < pts.length; k++) arc.push(arc[k - 1] + len(sub(pts[k], pts[k - 1])));
  return arc;
}

/** Unit tangent at sample k: average of the adjacent segment directions. */
function tangentAt(points: readonly Vec3[], k: number, fallback: Vec3): Vec3 {
  const dPrev = k > 0 ? unit(sub(points[k], points[k - 1])) : undefined;
  const dNext = k < points.length - 1 ? unit(sub(points[k + 1], points[k])) : undefined;
  const sum = dPrev !== undefined && dNext !== undefined ? add(dPrev, dNext) : (dPrev ?? dNext ?? fallback);
  return unit(sum) ?? dPrev ?? dNext ?? fallback;
}

/** `want` made perpendicular to `T`; a width axis parallel to the tangent
 *  carries the previous width, else any perpendicular. */
function perpendicularWidth(want: Vec3 | undefined, T: Vec3, prevW: Vec3 | undefined): Vec3 {
  const proj = (v: Vec3): Vec3 | undefined => unit(sub(v, mul(T, dot(v, T))));
  const base = prevW ?? (Math.abs(T[2]) < 0.9 ? ([0, 0, 1] as Vec3) : ([1, 0, 0] as Vec3));
  return (want !== undefined ? proj(want) : undefined) ?? proj(base) ?? ([0, 1, 0] as Vec3);
}

/** Per-point frame: unit tangent, width dir (⊥ tangent), thickness = T × w. */
function sweepFrames(points: readonly Vec3[], widths: readonly Vec3[]): { w: Vec3; n: Vec3 }[] {
  const frames: { w: Vec3; n: Vec3 }[] = [];
  let T: Vec3 = [1, 0, 0];
  let prevW: Vec3 | undefined;
  for (let k = 0; k < points.length; k++) {
    T = tangentAt(points, k, T);
    const w = perpendicularWidth(unit(widths[k]), T, prevW);
    frames.push({ w, n: cross(T, w) });
    prevW = w;
  }
  return frames;
}

/** Build the flat ribbon; null for a degenerate route or size. */
export function buildRibbonMesh(input: RibbonInput): FaceGeometry | null {
  const { widthMm, thicknessMm } = input;
  const periodMm = widthMm; // one texture tile spans one width of cable
  if (input.points.length < 2 || widthMm <= 0 || thicknessMm <= 0) return null;
  const { points: pts, attr: wds } = smoothRoute(input.points, input.widthDirs);
  if (pts.length < 2) return null;
  const frames = sweepFrames(pts, wds);
  const arc = routeArcLengths(pts);

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

/** Per-ring tangents (central differences interior; one-sided at ends). */
export function helixTubeTangents(polyline: readonly Vec3[]): Vec3[] {
  const ringCount = polyline.length;
  const tangents: Vec3[] = new Array(ringCount);
  for (let i = 0; i < ringCount; i++) {
    const prev = polyline[Math.max(0, i - 1)];
    const next = polyline[Math.min(ringCount - 1, i + 1)];
    let tx = next[0] - prev[0];
    let ty = next[1] - prev[1];
    let tz = next[2] - prev[2];
    const len = Math.sqrt(tx * tx + ty * ty + tz * tz) || 1;
    tx /= len; ty /= len; tz /= len;
    tangents[i] = [tx, ty, tz];
  }
  return tangents;
}

/** Write ring vertices/normals for a tube swept along `polyline` using a
 *  parallel-transport frame. */
export function writeHelixTubeRings(
  polyline: readonly Vec3[],
  tangents: readonly Vec3[],
  radialSegments: number,
  tubeR: number,
  vertices: Float32Array,
  normals: Float32Array,
): void {
  const ringCount = polyline.length;
  // Parallel-transport frame: pick an initial up vector ⊥ tangents[0],
  // then rotate it forward at each step to stay perpendicular.
  const seed: Vec3 = Math.abs(tangents[0][2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
  // initial u = normalize(seed × tangent[0])
  let ux = seed[1] * tangents[0][2] - seed[2] * tangents[0][1];
  let uy = seed[2] * tangents[0][0] - seed[0] * tangents[0][2];
  let uz = seed[0] * tangents[0][1] - seed[1] * tangents[0][0];
  const uLen0 = Math.sqrt(ux * ux + uy * uy + uz * uz) || 1;
  ux /= uLen0; uy /= uLen0; uz /= uLen0;
  // v = tangent × u
  let vx = tangents[0][1] * uz - tangents[0][2] * uy;
  let vy = tangents[0][2] * ux - tangents[0][0] * uz;
  let vz = tangents[0][0] * uy - tangents[0][1] * ux;

  for (let i = 0; i < ringCount; i++) {
    const center = polyline[i];
    if (i > 0) {
      // Parallel-transport u, v to stay ⊥ tangent[i]: subtract the
      // component along the new tangent, renormalize, then rebuild v.
      const tDot = ux * tangents[i][0] + uy * tangents[i][1] + uz * tangents[i][2];
      ux -= tangents[i][0] * tDot;
      uy -= tangents[i][1] * tDot;
      uz -= tangents[i][2] * tDot;
      const l = Math.sqrt(ux * ux + uy * uy + uz * uz) || 1;
      ux /= l; uy /= l; uz /= l;
      vx = tangents[i][1] * uz - tangents[i][2] * uy;
      vy = tangents[i][2] * ux - tangents[i][0] * uz;
      vz = tangents[i][0] * uy - tangents[i][1] * ux;
    }
    for (let s = 0; s < radialSegments; s++) {
      const theta = (s / radialSegments) * 2 * Math.PI;
      const cosT = Math.cos(theta);
      const sinT = Math.sin(theta);
      const nx = ux * cosT + vx * sinT;
      const ny = uy * cosT + vy * sinT;
      const nz = uz * cosT + vz * sinT;
      const vi = (i * radialSegments + s) * 3;
      vertices[vi + 0] = center[0] + nx * tubeR;
      vertices[vi + 1] = center[1] + ny * tubeR;
      vertices[vi + 2] = center[2] + nz * tubeR;
      normals[vi + 0] = nx;
      normals[vi + 1] = ny;
      normals[vi + 2] = nz;
    }
  }
}

/** Two triangles per (ring i → ring i+1, radial s → s+1) quad. */
export function buildHelixTubeIndices(ringCount: number, radialSegments: number): Uint32Array {
  const quadCount = (ringCount - 1) * radialSegments;
  const indices = new Uint32Array(quadCount * 6);
  let idx = 0;
  for (let i = 0; i < ringCount - 1; i++) {
    for (let s = 0; s < radialSegments; s++) {
      const sNext = (s + 1) % radialSegments;
      const a = i * radialSegments + s;
      const b = i * radialSegments + sNext;
      const c = (i + 1) * radialSegments + s;
      const d = (i + 1) * radialSegments + sNext;
      indices[idx++] = a;
      indices[idx++] = c;
      indices[idx++] = b;
      indices[idx++] = b;
      indices[idx++] = c;
      indices[idx++] = d;
    }
  }
  return indices;
}

/** Rotate the flat-profile width axis (given in a part frame) by each route
 *  point's owning-part world transform (column-major Mat4). */
export function flatWidthDirs(axis: Vec3, frames: readonly (readonly number[])[]): Vec3[] {
  return frames.map((m) => [
    m[0] * axis[0] + m[4] * axis[1] + m[8] * axis[2],
    m[1] * axis[0] + m[5] * axis[1] + m[9] * axis[2],
    m[2] * axis[0] + m[6] * axis[1] + m[10] * axis[2],
  ] as Vec3);
}

/** Round tube swept through the smoothed route (the coil path's tube sweep),
 *  with UVs u = arc length / circumference, v around the section. */
export function buildRoundSweep(centerline: readonly Vec3[], diameterMm: number, radialSegments = 8): FaceGeometry | null {
  if (diameterMm <= 0) return null;
  const { points: polyline } = smoothRoute(centerline, centerline);
  if (polyline.length < 2) return null;
  const ringCount = polyline.length;
  const vertices = new Float32Array(ringCount * radialSegments * 3);
  const normals = new Float32Array(ringCount * radialSegments * 3);
  writeHelixTubeRings(polyline, helixTubeTangents(polyline), radialSegments, diameterMm / 2, vertices, normals);
  const arc = routeArcLengths(polyline);
  const uv = new Float32Array(ringCount * radialSegments * 2);
  for (let i = 0; i < ringCount; i++) {
    for (let s = 0; s < radialSegments; s++) {
      uv[(i * radialSegments + s) * 2] = arc[i] / (Math.PI * diameterMm);
      uv[(i * radialSegments + s) * 2 + 1] = s / radialSegments;
    }
  }
  return { vertices, indices: buildHelixTubeIndices(ringCount, radialSegments), normals, uv, faceId: 0 };
}
