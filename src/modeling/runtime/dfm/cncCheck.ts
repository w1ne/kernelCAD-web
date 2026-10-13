// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/runtime/dfm/cncCheck.ts
//
// CNC milling manufacturability checks for one part (dfm_review):
//
//   - Undercuts: surface a 3-axis mill cannot reach from any allowed tool
//     approach direction. A triangle is reachable from approach axis `a`
//     (the tool points along -a, coming from +a) when it does not face away
//     from the tool (n·a ≥ -ε) and a ray from just above it along +a leaves
//     the part without hitting material. The stock face resting on the
//     fixture (lowest plane, facing straight down) is not an undercut.
//   - Internal corner radius vs tool: an end mill of radius R cannot cut an
//     internal corner tighter than R. Flags (a) sharp concave edges running
//     parallel to an approach axis (radius 0) and (b) concave partial
//     cylinders (pocket-corner fillets) parallel to an approach axis whose
//     radius is below the tool radius. Full bores are drilled, not milled,
//     and are not flagged.
//
// Pure mesh geometry plus the cheap OCCT concave-cylinder scan shared with
// hole detection; no boolean probes. All locations are part-local.

import type { OcctBackend } from '../../../kernel/backends/occt/occtBackend';
import {
  collectConcaveCylinderClusters,
  MIN_ANGULAR_COVERAGE_RAD,
} from '../../../kernel/backends/occt/holeDetection';
import { TriangleBvh, type DfmMesh } from './meshBvh';

export type Vec3 = [number, number, number];

export interface CncSettings {
  /** End-mill diameter, mm. */
  toolDiameterMm: number;
  /** Unit tool APPROACH directions (the tool comes from +a toward the part). */
  approachAxes: Vec3[];
  /** Unreachable area above which the undercut check fails, mm². */
  maxUndercutAreaMm2: number;
}

export interface CncSharpCorner {
  /** Part-local midpoint of the sharp concave edge cluster. */
  location: Vec3;
  lengthMm: number;
  /** Approach axis the edge runs parallel to. */
  axis: Vec3;
}

export interface CncTightFillet {
  location: Vec3;
  radiusMm: number;
  axis: Vec3;
}

export interface CncPartReport {
  settings: CncSettings;
  undercut: {
    areaMm2: number;
    /** Up to 5 part-local sample points on unreachable surface, largest triangle first. */
    samples: Vec3[];
  };
  sharpInternalCorners: CncSharpCorner[];
  tightFillets: CncTightFillet[];
}

const NORMAL_EPS = 1e-3;
const PARALLEL_COS = 0.98;
const SHARP_DIHEDRAL_DEG = 60;
const WELD = 1e-4;
const MAX_REPORTED = 10;

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const len = (a: Vec3): number => Math.hypot(a[0], a[1], a[2]);

/** Parse an axis token ('+z', '-x', ...) into a unit vector. */
export function axisVector(token: string): Vec3 | undefined {
  const m = /^([+-])([xyz])$/.exec(token.trim().toLowerCase());
  if (m === null) return undefined;
  const v: Vec3 = [0, 0, 0];
  v['xyz'.indexOf(m[2])] = m[1] === '-' ? -1 : 1;
  return v;
}

interface Tri {
  v: [Vec3, Vec3, Vec3];
  n: Vec3; // unit outward normal
  c: Vec3;
  area: number;
}

function trianglesOf(mesh: DfmMesh): Tri[] {
  const P = (i: number): Vec3 => [mesh.vertices[3 * i], mesh.vertices[3 * i + 1], mesh.vertices[3 * i + 2]];
  const tris: Tri[] = [];
  let signedVol = 0;
  for (let t = 0; t + 2 < mesh.triangles.length; t += 3) {
    const a = P(mesh.triangles[t]);
    const b = P(mesh.triangles[t + 1]);
    const c = P(mesh.triangles[t + 2]);
    const cr = cross(sub(b, a), sub(c, a));
    const l = len(cr);
    signedVol += dot(a, cross(b, c)) / 6;
    if (l < 1e-12) {
      tris.push({ v: [a, b, c], n: [0, 0, 0], c: a, area: 0 });
      continue;
    }
    tris.push({
      v: [a, b, c],
      n: [cr[0] / l, cr[1] / l, cr[2] / l],
      c: [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3, (a[2] + b[2] + c[2]) / 3],
      area: l / 2,
    });
  }
  // Inward-wound mesh: flip every normal so they point out of the solid.
  if (signedVol < 0) for (const t of tris) t.n = [-t.n[0], -t.n[1], -t.n[2]];
  return tris;
}

/** Undercut area: surface no allowed approach axis can reach. */
export function findUndercuts(
  mesh: DfmMesh,
  axes: readonly Vec3[],
  bvh: TriangleBvh = new TriangleBvh(mesh),
): CncPartReport['undercut'] {
  const tris = trianglesOf(mesh);
  // Per axis: the lowest projection (fixture plane).
  const minProj = axes.map(a => {
    let m = Infinity;
    for (const t of tris) for (const v of t.v) m = Math.min(m, dot(v, a));
    return m;
  });
  const unreachable: Tri[] = [];
  let area = 0;
  tris.forEach((t, i) => {
    if (t.area === 0) return;
    const reachable = axes.some((a, k) => {
      const na = dot(t.n, a);
      // Fixture face: flat on the lowest plane, facing straight down.
      if (na < -PARALLEL_COS && t.v.every(v => dot(v, a) - minProj[k] < 1e-3)) return true;
      if (na < -NORMAL_EPS) return false;
      const origin: Vec3 = [t.c[0] + 1e-3 * t.n[0], t.c[1] + 1e-3 * t.n[1], t.c[2] + 1e-3 * t.n[2]];
      return bvh.raycast(origin, a, { tMin: 1e-6, skipTri: i }) === null;
    });
    if (!reachable) {
      unreachable.push(t);
      area += t.area;
    }
  });
  unreachable.sort((x, y) => y.area - x.area);
  return { areaMm2: area, samples: unreachable.slice(0, 5).map(t => t.c) };
}

/** Sharp concave edges parallel to an approach axis (internal corners of radius 0). */
export function findSharpInternalCorners(mesh: DfmMesh, axes: readonly Vec3[]): CncSharpCorner[] {
  const tris = trianglesOf(mesh);
  const key = (p: Vec3): string => p.map(x => Math.round(x / WELD)).join(',');
  const edges = new Map<string, { a: Vec3; b: Vec3; tris: number[] }>();
  tris.forEach((t, i) => {
    if (t.area === 0) return;
    for (let k = 0; k < 3; k++) {
      const a = t.v[k];
      const b = t.v[(k + 1) % 3];
      const ka = key(a);
      const kb = key(b);
      const ek = ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`;
      const e = edges.get(ek) ?? { a, b, tris: [] };
      e.tris.push(i);
      edges.set(ek, e);
    }
  });
  const cosSharp = Math.cos((SHARP_DIHEDRAL_DEG * Math.PI) / 180);
  const found: CncSharpCorner[] = [];
  for (const e of edges.values()) {
    if (e.tris.length !== 2) continue;
    const d = sub(e.b, e.a);
    const l = len(d);
    if (l < 1e-6) continue;
    const axis = axes.find(a => Math.abs(dot(d, a)) / l > PARALLEL_COS);
    if (axis === undefined) continue;
    const [t1, t2] = [tris[e.tris[0]], tris[e.tris[1]]];
    if (dot(t1.n, t2.n) > cosSharp) continue; // smooth or tessellated curve
    // Concave: each triangle's centroid sits on the outward side of the other's plane.
    if (dot(t2.n, sub(t1.c, e.a)) <= 1e-6) continue;
    found.push({
      location: [(e.a[0] + e.b[0]) / 2, (e.a[1] + e.b[1]) / 2, (e.a[2] + e.b[2]) / 2],
      lengthMm: l,
      axis,
    });
  }
  return mergeCorners(found);
}

/** Merge collinear edge segments (tessellation splits) into one corner each. */
function mergeCorners(cs: CncSharpCorner[]): CncSharpCorner[] {
  const out: CncSharpCorner[] = [];
  for (const c of cs) {
    // Same corner line ⇔ offset from an existing corner is parallel to the axis.
    const hit = out.find(o => {
      if (o.axis !== c.axis) return false;
      const off = sub(c.location, o.location);
      const along = dot(off, o.axis);
      return len([off[0] - along * o.axis[0], off[1] - along * o.axis[1], off[2] - along * o.axis[2]]) < 1e-3;
    });
    if (hit !== undefined) hit.lengthMm += c.lengthMm;
    else out.push({ ...c, location: [...c.location] as Vec3 });
  }
  return out.sort((a, b) => b.lengthMm - a.lengthMm);
}

/** Concave partial cylinders parallel to an approach axis with radius < tool radius. */
export function findTightFillets(shape: OcctBackend, axes: readonly Vec3[], toolRadiusMm: number): CncTightFillet[] {
  const out: CncTightFillet[] = [];
  for (const c of collectConcaveCylinderClusters(shape)) {
    if (c.coverageRad >= MIN_ANGULAR_COVERAGE_RAD) continue; // full bore: drilled
    if (c.radiusMm >= toolRadiusMm - 1e-6) continue;
    const axis = axes.find(a => Math.abs(dot(c.dir0, a)) > PARALLEL_COS);
    if (axis === undefined) continue;
    const mid = (c.tMin + c.tMax) / 2;
    out.push({
      location: [c.loc0[0] + mid * c.dir0[0], c.loc0[1] + mid * c.dir0[1], c.loc0[2] + mid * c.dir0[2]],
      radiusMm: c.radiusMm,
      axis,
    });
  }
  return out.sort((a, b) => a.radiusMm - b.radiusMm);
}

export function checkCncMachinability(
  shape: OcctBackend,
  mesh: DfmMesh,
  settings: CncSettings,
  bvh?: TriangleBvh,
): CncPartReport {
  return {
    settings,
    undercut: findUndercuts(mesh, settings.approachAxes, bvh),
    sharpInternalCorners: findSharpInternalCorners(mesh, settings.approachAxes).slice(0, MAX_REPORTED),
    tightFillets: findTightFillets(shape, settings.approachAxes, settings.toolDiameterMm / 2).slice(0, MAX_REPORTED),
  };
}
