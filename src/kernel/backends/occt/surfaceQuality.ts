// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Surface-quality sampling for inspect({ of: 'continuity' | 'curvature' }).
//
// replicad-opencascadejs does not bind BRepLProp / GeomLProp. Equivalent:
// BRepAdaptor_Surface.D1/D2 → first/second fundamental forms (Gaussian +
// mean curvature), BRepAdaptor_Curve for edge samples, replicad
// Face.uvCoordinates / Face.normalAt for the G0/G1 probes, and
// BRepLib.ContinuityOfFaces as a stored-regularity cross-check.

import { getOC } from 'replicad';
import type { Edge, Face } from 'replicad';
import { OcctBackend } from './occtBackend';
import { isSameEdge } from './edgeQueries';
import type { Vec3 } from '../../../shared/intent/types';

export type ContinuityClass = 'G0' | 'G1' | 'G2' | 'broken';

/** Position gap (mm) above which G0 is broken. 1e-3 mm = 1 µm. */
export const G0_TOL_MM = 1e-3;
/** Normal-angle (deg) above which G1 is broken. Box corners are 90°. */
export const G1_TOL_DEG = 1;
/** Relative |ΔH| / max(|H|, 1e-6) above which G2 is broken. */
export const G2_REL_TOL = 0.05;
/** Absolute mean-curvature gap (1/mm) that also breaks G2. */
export const G2_ABS_TOL = 5e-3;

const EDGE_SAMPLES = 9;
const UV_GRID = 7;

export interface ContinuitySample {
  t: number;
  point: Vec3;
  positionGapMm: number;
  normalAngleDeg: number;
  curvatureDiff: number;
  gaussianA: number;
  gaussianB: number;
  meanA: number;
  meanB: number;
}

export interface SharedEdgeContinuity {
  edgeIndex: number;
  edgeHash: string;
  faceHashes: [string, string];
  class: ContinuityClass;
  maxPositionGapMm: number;
  maxNormalAngleDeg: number;
  maxCurvatureDiff: number;
  worstSample: ContinuitySample;
  sampleCount: number;
  /** OCCT stored regularity when EncodeRegularity/ContinuityOfFaces answers. */
  occtContinuity?: ContinuityClass;
}

export interface FaceCurvatureStats {
  faceIndex: number;
  faceHash: string;
  surfaceType: string;
  gaussian: { min: number; max: number; mean: number };
  mean: { min: number; max: number; mean: number };
  inflections: number;
  spikes: Array<{ point: Vec3; gaussian: number; mean: number }>;
  sampleCount: number;
}

export interface SurfaceProps {
  point: Vec3;
  normal: Vec3;
  gaussian: number;
  mean: number;
}

function hashOf(shape: { HashCode: (n: number) => number }): string {
  return shape.HashCode(2147483647).toString(16);
}

function wrappedOf(entity: unknown): unknown {
  const rec = entity as { wrapped?: unknown; _wrapped?: unknown };
  return rec.wrapped ?? rec._wrapped ?? entity;
}

function vec3(x: number, y: number, z: number): Vec3 {
  return [x, y, z];
}

function hypot3(a: Vec3): number {
  return Math.hypot(a[0], a[1], a[2]);
}

function sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

function normalize(a: Vec3): Vec3 {
  const n = hypot3(a);
  return n > 0 ? [a[0] / n, a[1] / n, a[2] / n] : [0, 0, 0];
}

function angleDeg(a: Vec3, b: Vec3): number {
  const na = hypot3(a);
  const nb = hypot3(b);
  if (na < 1e-15 || nb < 1e-15) return 0;
  const c = Math.max(-1, Math.min(1, dot(a, b) / (na * nb)));
  return (Math.acos(c) * 180) / Math.PI;
}

function curvatureDiff(a: SurfaceProps, b: SurfaceProps): number {
  const dH = Math.abs(a.mean - b.mean);
  const dK = Math.abs(a.gaussian - b.gaussian);
  const scaleH = Math.max(Math.abs(a.mean), Math.abs(b.mean), 1e-6);
  const scaleK = Math.max(Math.abs(a.gaussian), Math.abs(b.gaussian), 1e-6);
  return Math.max(dH, dH / scaleH, dK, dK / scaleK);
}

function classify(maxG0: number, maxG1: number, maxG2: number): ContinuityClass {
  if (maxG0 > G0_TOL_MM) return 'broken';
  if (maxG1 > G1_TOL_DEG) return 'G0';
  if (maxG2 > G2_REL_TOL) return 'G1';
  return 'G2';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- replicad-opencascadejs has no exported OC type
function occtClassFromShape(value: { value?: number } | number | undefined, oc: any): ContinuityClass | undefined {
  if (value === undefined) return undefined;
  const v = typeof value === 'number' ? value : value.value;
  const G = oc.GeomAbs_Shape;
  if (v === G.GeomAbs_G2.value || v === G.GeomAbs_C2.value || v === G.GeomAbs_C3.value || v === G.GeomAbs_CN.value) {
    return 'G2';
  }
  if (v === G.GeomAbs_G1.value || v === G.GeomAbs_C1.value) return 'G1';
  if (v === G.GeomAbs_C0.value) return 'G0';
  return undefined;
}

/**
 * Evaluate Gaussian (K) and mean (H) curvature at (u, v) on a face via the
 * first and second fundamental forms of BRepAdaptor_Surface.D2. H is signed
 * so that it agrees with the face's outward normal (replicad Face.normalAt).
 */
export function evalSurfaceProps(face: Face, u: number, v: number): SurfaceProps | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const oc = getOC() as any;
  const raw = wrappedOf(face);
  const adaptor = new oc.BRepAdaptor_Surface_2(raw, true);
  const p = new oc.gp_Pnt_1();
  const d1u = new oc.gp_Vec_1();
  const d1v = new oc.gp_Vec_1();
  const d2u = new oc.gp_Vec_1();
  const d2v = new oc.gp_Vec_1();
  const d2uv = new oc.gp_Vec_1();
  try {
    adaptor.D2(u, v, p, d1u, d1v, d2u, d2v, d2uv);
    const Su: Vec3 = [d1u.X(), d1u.Y(), d1u.Z()];
    const Sv: Vec3 = [d1v.X(), d1v.Y(), d1v.Z()];
    const Suu: Vec3 = [d2u.X(), d2u.Y(), d2u.Z()];
    const Svv: Vec3 = [d2v.X(), d2v.Y(), d2v.Z()];
    const Suv: Vec3 = [d2uv.X(), d2uv.Y(), d2uv.Z()];
    const nRaw = cross(Su, Sv);
    const nLen = hypot3(nRaw);
    if (nLen < 1e-15) return null;
    let n = [nRaw[0] / nLen, nRaw[1] / nLen, nRaw[2] / nLen] as Vec3;
    const E = dot(Su, Su);
    const F = dot(Su, Sv);
    const G = dot(Sv, Sv);
    const denom = E * G - F * F;
    if (Math.abs(denom) < 1e-18) return null;
    const L = dot(Suu, n);
    const M = dot(Suv, n);
    const N = dot(Svv, n);
    const gaussian = (L * N - M * M) / denom;
    let mean = (E * N + G * L - 2 * F * M) / (2 * denom);
    const point = vec3(p.X(), p.Y(), p.Z());
    try {
      const nFace = face.normalAt({ x: point[0], y: point[1], z: point[2] } as Parameters<Face['normalAt']>[0]);
      const nf: Vec3 = [nFace.x, nFace.y, nFace.z];
      if (dot(n, nf) < 0) {
        n = [-n[0], -n[1], -n[2]];
        mean = -mean;
      }
    } catch {
      // seam / pole — keep the parametric normal
    }
    return { point, normal: n, gaussian, mean };
  } catch {
    return null;
  } finally {
    p.delete();
    d1u.delete();
    d1v.delete();
    d2u.delete();
    d2v.delete();
    d2uv.delete();
    adaptor.delete();
  }
}

function pcurveUv(edge: Edge, face: Face, t01: number): [number, number] | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const oc = getOC() as any;
  try {
    const c2d = new oc.BRepAdaptor_Curve2d_2(wrappedOf(edge), wrappedOf(face)) as {
      FirstParameter: () => number;
      LastParameter: () => number;
      Value: (u: number) => { X: () => number; Y: () => number; delete?: () => void };
      delete?: () => void;
    };
    try {
      const u0 = c2d.FirstParameter();
      const u1 = c2d.LastParameter();
      const p2d = c2d.Value(u0 + t01 * (u1 - u0));
      const uv: [number, number] = [p2d.X(), p2d.Y()];
      p2d.delete?.();
      return uv;
    } finally {
      c2d.delete?.();
    }
  } catch {
    return null;
  }
}

function propsAtPoint(face: Face, point: Vec3): SurfaceProps | null {
  let uv: [number, number];
  try {
    uv = face.uvCoordinates({ x: point[0], y: point[1], z: point[2] } as Parameters<Face['uvCoordinates']>[0]);
  } catch {
    return null;
  }
  return evalSurfaceProps(face, uv[0], uv[1]);
}

function edgePoint(edge: Edge, t: number): Vec3 | null {
  try {
    const p = edge.pointAt(t);
    return vec3(p.x, p.y, p.z);
  } catch {
    return null;
  }
}

function faceHash(face: Face): string {
  return hashOf(wrappedOf(face) as { HashCode: (n: number) => number });
}

function edgeHash(edge: Edge): string {
  return hashOf(wrappedOf(edge) as { HashCode: (n: number) => number });
}

function adjacentFaces(shape: { faces: Face[] }, edge: Edge): Face[] {
  const adjacent: Face[] = [];
  for (const face of shape.faces) {
    const faceEdges = (face as unknown as { edges?: Edge[] }).edges ?? [];
    if (faceEdges.some(we => isSameEdge(we, edge))) {
      adjacent.push(face);
      if (adjacent.length === 2) break;
    }
  }
  return adjacent;
}

function storedOcctClass(edge: Edge, a: Face, b: Face): ContinuityClass | undefined {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const oc = getOC() as any;
  try {
    const e = wrappedOf(edge);
    const f1 = wrappedOf(a);
    const f2 = wrappedOf(b);
    const angTol = (1 * Math.PI) / 180;
    const raw = oc.BRepLib.ContinuityOfFaces(e, f1, f2, angTol);
    return occtClassFromShape(raw, oc);
  } catch {
    try {
      const e = wrappedOf(edge);
      const f1 = wrappedOf(a);
      const f2 = wrappedOf(b);
      if (!oc.BRep_Tool.HasContinuity_1(e, f1, f2)) return undefined;
      return occtClassFromShape(oc.BRep_Tool.Continuity_1(e, f1, f2), oc);
    } catch {
      return undefined;
    }
  }
}

/** Shared (manifold) edges of a solid, sampled for G0/G1/G2. Boundary edges skipped. */
export function inspectContinuity(
  body: OcctBackend,
  edgeFilter?: (edge: Edge, index: number) => boolean,
): SharedEdgeContinuity[] {
  const shape = body.getReplicadShape() as unknown as { faces: Face[]; edges: Edge[] };
  const edges: Edge[] = shape.edges;
  const out: SharedEdgeContinuity[] = [];

  for (let i = 0; i < edges.length; i++) {
    const edge = edges[i];
    if (edgeFilter && !edgeFilter(edge, i)) continue;
    const faces = adjacentFaces(shape, edge);
    if (faces.length < 2) continue;
    const [fa, fb] = faces;

    const samples: ContinuitySample[] = [];
    for (let s = 1; s <= EDGE_SAMPLES; s++) {
      const t = s / (EDGE_SAMPLES + 1);
      const p = edgePoint(edge, t);
      const uvA = pcurveUv(edge, fa, t);
      const uvB = pcurveUv(edge, fb, t);
      const a = uvA ? evalSurfaceProps(fa, uvA[0], uvA[1]) : (p ? propsAtPoint(fa, p) : null);
      const b = uvB ? evalSurfaceProps(fb, uvB[0], uvB[1]) : (p ? propsAtPoint(fb, p) : null);
      if (!a || !b) continue;
      const point = p ?? a.point;
      const gapA = hypot3(sub(a.point, point));
      const gapB = hypot3(sub(b.point, point));
      const gapAB = hypot3(sub(a.point, b.point));
      const positionGapMm = Math.max(gapA, gapB, gapAB);
      const normalAngleDeg = Math.min(angleDeg(a.normal, b.normal), angleDeg(a.normal, [-b.normal[0], -b.normal[1], -b.normal[2]]));
      const dH = curvatureDiff(a, b);
      samples.push({
        t,
        point,
        positionGapMm,
        normalAngleDeg,
        curvatureDiff: dH,
        gaussianA: a.gaussian,
        gaussianB: b.gaussian,
        meanA: a.mean,
        meanB: b.mean,
      });
    }
    if (samples.length === 0) continue;

    let worst = samples[0];
    let maxG0 = 0;
    let maxG1 = 0;
    let maxG2 = 0;
    for (const sm of samples) {
      if (sm.positionGapMm > maxG0) maxG0 = sm.positionGapMm;
      if (sm.normalAngleDeg > maxG1) maxG1 = sm.normalAngleDeg;
      if (sm.curvatureDiff > maxG2) maxG2 = sm.curvatureDiff;
      const score = sm.positionGapMm / G0_TOL_MM + sm.normalAngleDeg / G1_TOL_DEG + sm.curvatureDiff;
      const worstScore = worst.positionGapMm / G0_TOL_MM + worst.normalAngleDeg / G1_TOL_DEG + worst.curvatureDiff;
      if (score > worstScore) worst = sm;
    }

    const sampledClass = classify(maxG0, maxG1, maxG2);
    const occtContinuity = storedOcctClass(edge, fa, fb);

    out.push({
      edgeIndex: i,
      edgeHash: edgeHash(edge),
      faceHashes: [faceHash(fa), faceHash(fb)],
      class: sampledClass,
      maxPositionGapMm: maxG0,
      maxNormalAngleDeg: maxG1,
      maxCurvatureDiff: maxG2,
      worstSample: worst,
      sampleCount: samples.length,
      ...(occtContinuity !== undefined ? { occtContinuity } : {}),
    });
  }
  return out;
}

function faceSurfaceType(face: Face): string {
  return (face as unknown as { geomType?: string }).geomType ?? 'UNKNOWN';
}

function uvBounds(face: Face): { u1: number; u2: number; v1: number; v2: number } | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const oc = getOC() as any;
  const adaptor = new oc.BRepAdaptor_Surface_2(wrappedOf(face), true);
  try {
    return {
      u1: adaptor.FirstUParameter(),
      u2: adaptor.LastUParameter(),
      v1: adaptor.FirstVParameter(),
      v2: adaptor.LastVParameter(),
    };
  } catch {
    return null;
  } finally {
    adaptor.delete();
  }
}

/** Per-face Gaussian / mean curvature stats from a UV grid. */
export function inspectCurvature(
  body: OcctBackend,
  faceFilter?: (face: Face, index: number) => boolean,
  spikeFactor = 6,
): FaceCurvatureStats[] {
  const shape = body.getReplicadShape() as unknown as { faces: Face[] };
  const faces: Face[] = shape.faces;
  const out: FaceCurvatureStats[] = [];

  for (let i = 0; i < faces.length; i++) {
    const face = faces[i];
    if (faceFilter && !faceFilter(face, i)) continue;
    const bounds = uvBounds(face);
    if (!bounds) continue;
    const { u1, u2, v1, v2 } = bounds;
    const du = (u2 - u1) / (UV_GRID + 1);
    const dv = (v2 - v1) / (UV_GRID + 1);
    const props: SurfaceProps[] = [];
    const grid: Array<Array<SurfaceProps | null>> = [];
    for (let iu = 1; iu <= UV_GRID; iu++) {
      const row: Array<SurfaceProps | null> = [];
      for (let iv = 1; iv <= UV_GRID; iv++) {
        const p = evalSurfaceProps(face, u1 + iu * du, v1 + iv * dv);
        row.push(p);
        if (p) props.push(p);
      }
      grid.push(row);
    }
    if (props.length === 0) continue;

    let gMin = Infinity, gMax = -Infinity, gSum = 0;
    let mMin = Infinity, mMax = -Infinity, mSum = 0;
    for (const p of props) {
      if (p.gaussian < gMin) gMin = p.gaussian;
      if (p.gaussian > gMax) gMax = p.gaussian;
      gSum += p.gaussian;
      if (p.mean < mMin) mMin = p.mean;
      if (p.mean > mMax) mMax = p.mean;
      mSum += p.mean;
    }
    const gMean = gSum / props.length;
    const mMean = mSum / props.length;
    let gVar = 0;
    for (const p of props) gVar += (p.gaussian - gMean) ** 2;
    const gStd = Math.sqrt(gVar / props.length);
    const spikeTol = Math.max(1e-4, spikeFactor * gStd);

    const spikes: FaceCurvatureStats['spikes'] = [];
    for (const p of props) {
      if (Math.abs(p.gaussian - gMean) > spikeTol && Math.abs(p.gaussian - gMean) > 1e-3) {
        spikes.push({ point: p.point, gaussian: p.gaussian, mean: p.mean });
      }
    }

    let inflections = 0;
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        const here = grid[r][c];
        if (!here) continue;
        if (c + 1 < grid[r].length) {
          const next = grid[r][c + 1];
          if (next && here.gaussian * next.gaussian < 0) inflections++;
        }
        if (r + 1 < grid.length) {
          const next = grid[r + 1][c];
          if (next && here.gaussian * next.gaussian < 0) inflections++;
        }
      }
    }

    out.push({
      faceIndex: i,
      faceHash: faceHash(face),
      surfaceType: faceSurfaceType(face),
      gaussian: { min: gMin, max: gMax, mean: gMean },
      mean: { min: mMin, max: mMax, mean: mMean },
      inflections,
      spikes,
      sampleCount: props.length,
    });
  }
  return out;
}

export function vertexCurvatureColor(k: number, kMin: number, kMax: number): [number, number, number] {
  const span = kMax - kMin;
  const t = span > 1e-12 ? (k - kMin) / span : 0.5;
  return curvatureRamp(Math.max(0, Math.min(1, t)));
}

/** Blue → cyan → green → yellow → red, same stops as the FEA heatmap. */
export function curvatureRamp(t: number): [number, number, number] {
  const stops: Array<[number, number, number]> = [
    [0x3b, 0x4c, 0xc0],
    [0x59, 0x77, 0xe3],
    [0x82, 0xa6, 0xfb],
    [0xb9, 0xd0, 0xf9],
    [0xf7, 0xb8, 0x9c],
    [0xee, 0x84, 0x68],
    [0xd6, 0x52, 0x44],
    [0xb4, 0x04, 0x26],
  ];
  const x = Math.max(0, Math.min(1, t)) * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(x));
  const f = x - i;
  const a = stops[i];
  const b = stops[i + 1];
  return [
    Math.round(a[0] + (b[0] - a[0]) * f),
    Math.round(a[1] + (b[1] - a[1]) * f),
    Math.round(a[2] + (b[2] - a[2]) * f),
  ];
}

export function continuityClassColor(cls: ContinuityClass): string {
  switch (cls) {
    case 'G2': return '#2ecc71';
    case 'G1': return '#f1c40f';
    case 'G0': return '#e67e22';
    case 'broken': return '#e74c3c';
  }
}

/** Iso-view direction (camera in the +X −Y +Z octant) for baked zebra. */
export const ZEBRA_VIEW: Vec3 = normalize([1, -1, 1]);
/** Screen-right for that iso camera (view × world-up). */
export const ZEBRA_STRIPE_DIR: Vec3 = normalize(cross(ZEBRA_VIEW, [0, 0, 1]));

export function zebraStripe(normal: Vec3, view: Vec3 = ZEBRA_VIEW, stripe: Vec3 = ZEBRA_STRIPE_DIR, freq = 12): number {
  const n = normalize(normal);
  const v = normalize(view);
  const nv = dot(n, v);
  const rx = 2 * nv * n[0] - v[0];
  const ry = 2 * nv * n[1] - v[1];
  const rz = 2 * nv * n[2] - v[2];
  return Math.sin(freq * (rx * stripe[0] + ry * stripe[1] + rz * stripe[2]));
}
