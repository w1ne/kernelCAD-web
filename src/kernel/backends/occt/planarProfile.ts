// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/occt/planarProfile.ts
//
// 2D cut profiles for DXF export, derived from a 3D part.
//
// Two derivations:
//   - flat part:  a prismatic solid (plate, panel, extruded profile) whose
//                 faces are all either caps parallel to one plane or side
//                 walls perpendicular to it, with the caps on exactly two
//                 levels (constant thickness). The profile is the boundary
//                 of the cap, in the cap's own 2D frame, in any orientation.
//   - section:    the cross-section of any part with an axis-aligned plane
//                 (`{ axis: 'z', at }`), in world coordinates (plans, floor
//                 plans, profiles).
//
// Loops are `ProjectedSegment` chains from sketchFromShape.ts: straight edges
// stay exact and circular edges stay exact bulge arcs, so the DXF writer can
// emit true arcs and circles. Only curves with no exact arc form (B-splines,
// ellipses) are flattened under the caller's chord tolerance.

import { measureArea, type Face } from 'replicad';
import type { OcctBackend } from './occtBackend';
import {
  makePlaneFrame,
  cardinalFrame,
  segLength,
  type PlaneFrame,
  type ProjectedSegment,
  type Pt2,
  type Vec3,
} from './sketchFromShape';
import { faceLoops, sectionLoops } from './sketchFromShapeOps';

export type SectionAxis = 'x' | 'y' | 'z';

export interface SectionSpec {
  axis: SectionAxis;
  /** Plane position along `axis`, in mm. */
  at: number;
}

export interface PlanarProfile {
  /** Closed loops. For a flat part, outer boundaries come before holes. */
  loops: ProjectedSegment[][];
  /** Plate thickness along the profile normal (mm); 0 for a section or a
   *  bare planar face. */
  thickness: number;
  /** World-space normal of the profile plane. */
  normal: Vec3;
}

export type PlanarProfileResult =
  | { ok: true; profile: PlanarProfile }
  | { ok: false; reason: string };

/** Direction tests use |cos| against these bounds. */
const PARALLEL_COS = 1 - 1e-7;
const PERPENDICULAR_COS = 1e-6;
/** Two cap faces closer than this along the normal share a level (mm). */
const LEVEL_TOL = 1e-4;
/** Tolerance for chaining projected edge endpoints (mm). */
const CHAIN_TOL = 1e-4;
/** Coordinates closer than this to zero are written as exactly zero. */
const SNAP = 5e-7;

const dot3 = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

function unit(v: { x: number; y: number; z: number }): Vec3 | null {
  const l = Math.hypot(v.x, v.y, v.z);
  return l > 1e-12 ? [v.x / l, v.y / l, v.z / l] : null;
}

function faceNormal(face: Face): Vec3 | null {
  try {
    return unit(face.normalAt());
  } catch {
    return null;
  }
}

/** True when every sampled normal of a curved face is perpendicular to `n`:
 *  the face is a wall swept along `n` (hole, slot end, rounded corner). */
function isCurvedSideFace(face: Face, n: Vec3): boolean {
  for (const u of [0.1, 0.5, 0.9]) {
    for (const v of [0.1, 0.5, 0.9]) {
      let nv: Vec3 | null;
      try {
        nv = unit(face.normalAt(face.pointOnSurface(u, v)));
      } catch {
        return false;
      }
      if (!nv || Math.abs(dot3(nv, n)) > PERPENDICULAR_COS) return false;
    }
  }
  return true;
}

interface PlanarFaceInfo {
  face: Face;
  normal: Vec3;
  /** Signed position of the face plane along its own normal. */
  center: Vec3;
  area: number;
}

/** Candidate profile normals: one per distinct planar-face direction, most
 *  cap area first. Equal areas prefer Z, then Y, then X, so a cube or a
 *  square block reads as seen from above. */
function candidateNormals(planar: PlanarFaceInfo[]): Vec3[] {
  const groups: Array<{ n: Vec3; area: number }> = [];
  for (const f of planar) {
    const g = groups.find((x) => Math.abs(dot3(x.n, f.normal)) > PARALLEL_COS);
    if (g) g.area += f.area;
    else groups.push({ n: f.normal, area: f.area });
  }
  const axisRank = (n: Vec3): number =>
    Math.abs(n[2]) > PARALLEL_COS ? 0 : Math.abs(n[1]) > PARALLEL_COS ? 1 : Math.abs(n[0]) > PARALLEL_COS ? 2 : 3;
  groups.sort((a, b) => {
    const rel = (b.area - a.area) / Math.max(a.area, b.area, 1e-12);
    if (Math.abs(rel) > 1e-6) return b.area - a.area;
    return axisRank(a.n) - axisRank(b.n);
  });
  return groups.map((g) => g.n);
}

/**
 * 2D frame for a flat part seen along `n`. Axis-aligned plates keep the
 * familiar view: from +Z (X right, Y up), from the front (X right, Z up) or
 * from +X (Y right, Z up). A plate in any other orientation is viewed along
 * its normal with the in-plane X axis on its longest straight edge, so a
 * rotated rectangle comes out axis-aligned with its true sizes.
 */
function flatFrame(n: Vec3, capFaces: Face[]): PlaneFrame {
  const o: Vec3 = [0, 0, 0];
  if (Math.abs(n[2]) > PARALLEL_COS) return { origin: o, normal: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0] };
  if (Math.abs(n[1]) > PARALLEL_COS) return { origin: o, normal: [0, -1, 0], u: [1, 0, 0], v: [0, 0, 1] };
  if (Math.abs(n[0]) > PARALLEL_COS) return { origin: o, normal: [1, 0, 0], u: [0, 1, 0], v: [0, 0, 1] };
  let best: Vec3 | undefined;
  let bestLen = 0;
  for (const f of capFaces) {
    for (const e of f.edges) {
      if (e.geomType !== 'LINE') continue;
      const d: Vec3 = [e.endPoint.x - e.startPoint.x, e.endPoint.y - e.startPoint.y, e.endPoint.z - e.startPoint.z];
      const len = Math.hypot(d[0], d[1], d[2]);
      if (len > bestLen + 1e-9) {
        bestLen = len;
        best = d;
      }
    }
  }
  // Orient the normal so its largest component is positive: the same plate
  // gives the same view whichever cap OCCT lists first.
  const k = [0, 1, 2].reduce((a, b) => (Math.abs(n[b]) > Math.abs(n[a]) ? b : a), 0);
  const nn: Vec3 = n[k] < 0 ? [-n[0], -n[1], -n[2]] : n;
  return makePlaneFrame(o, nn, best);
}

/** Exact 2D bounding box of closed loops, including arc bulges. */
export function loopsBoundingBox(loops: readonly (readonly ProjectedSegment[])[]): { min: Pt2; max: Pt2 } {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const add = (x: number, y: number): void => {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  };
  for (const loop of loops) {
    for (const s of loop) {
      add(s.x0, s.y0);
      add(s.x1, s.y1);
      const b = s.bulge ?? 0;
      if (Math.abs(b) < 1e-12) continue;
      // Arc from p0 to p1 with included angle θ = 4·atan(b) (CCW positive).
      const chord = segLength(s);
      const theta = 4 * Math.atan(b);
      const r = chord / (2 * Math.sin(Math.abs(theta) / 2));
      const mx = (s.x0 + s.x1) / 2;
      const my = (s.y0 + s.y1) / 2;
      // Signed distance from the chord midpoint to the centre, along the
      // chord's left normal: positive for a CCW minor arc.
      const h = (chord / 2) / Math.tan(theta / 2);
      const nx = -(s.y1 - s.y0) / chord;
      const ny = (s.x1 - s.x0) / chord;
      const cx = mx + nx * h;
      const cy = my + ny * h;
      const a0 = Math.atan2(s.y0 - cy, s.x0 - cx);
      for (const q of [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2]) {
        // Angle travelled from the start to the quadrant point along the arc.
        let d = theta > 0 ? q - a0 : a0 - q;
        d = ((d % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        if (d < Math.abs(theta)) add(cx + r * Math.cos(q), cy + r * Math.sin(q));
      }
    }
  }
  if (!Number.isFinite(minX)) return { min: [0, 0], max: [0, 0] };
  return { min: [minX, minY], max: [maxX, maxY] };
}

/** Translate loops by (dx, dy), snapping round-off near zero to zero. */
export function translateLoops(loops: ProjectedSegment[][], dx: number, dy: number): ProjectedSegment[][] {
  const snap = (x: number): number => (Math.abs(x) < SNAP ? 0 : x);
  return loops.map((loop) =>
    loop.map((s) => ({
      x0: snap(s.x0 + dx), y0: snap(s.y0 + dy),
      x1: snap(s.x1 + dx), y1: snap(s.y1 + dy),
      ...(s.bulge !== undefined ? { bulge: s.bulge } : {}),
    })),
  );
}

function describeNormal(n: Vec3): string {
  return `[${n.map((c) => (Math.abs(c) < 1e-9 ? 0 : Number(c.toFixed(4)))).join(', ')}]`;
}

/**
 * Cut profile of a flat part: a prismatic solid (or a bare planar face)
 * whose faces are caps parallel to one plane or walls perpendicular to it,
 * with the caps on exactly two levels. The profile is returned in the cap's
 * 2D frame, moved so its bounding box starts at (0, 0).
 *
 * Returns `{ ok: false, reason }` for anything else: a pocket or step (a third
 * cap level), a chamfer, countersink or top fillet (a face neither parallel
 * nor perpendicular), a sphere (no planar face).
 */
export function extractFlatProfile(
  backend: OcctBackend,
  opts: { curveTolerance?: number } = {},
): PlanarProfileResult {
  const faces = backend.getReplicadShape().faces as Face[];
  if (faces.length === 0) return { ok: false, reason: 'the shape has no faces' };

  const planar: PlanarFaceInfo[] = [];
  const curved: Face[] = [];
  for (const face of faces) {
    if (face.geomType === 'PLANE') {
      const normal = faceNormal(face);
      if (!normal) return { ok: false, reason: 'a planar face has no defined normal' };
      const c = face.center;
      planar.push({ face, normal, center: [c.x, c.y, c.z], area: measureArea(face) });
    } else {
      curved.push(face);
    }
  }
  if (planar.length === 0) return { ok: false, reason: 'the part has no planar face' };

  let firstReason = '';
  for (const n of candidateNormals(planar)) {
    const levels: number[] = [];
    const caps: Array<{ info: PlanarFaceInfo; level: number }> = [];
    let offender: string | undefined;
    for (const f of planar) {
      const c = Math.abs(dot3(f.normal, n));
      if (c > PARALLEL_COS) {
        const level = dot3(f.center, n);
        caps.push({ info: f, level });
        if (!levels.some((l) => Math.abs(l - level) <= LEVEL_TOL)) levels.push(level);
      } else if (c > PERPENDICULAR_COS) {
        offender = `a planar face (normal ${describeNormal(f.normal)}) is neither parallel nor perpendicular to the plate`;
        break;
      }
    }
    if (offender === undefined) {
      const bad = curved.find((f) => !isCurvedSideFace(f, n));
      if (bad) offender = `a ${bad.geomType.toLowerCase().replace('cylindre', 'cylinder')} face is not a straight wall across the plate`;
    }
    if (offender === undefined && levels.length > 2) {
      offender = `the faces parallel to the plate lie on ${levels.length} levels (a pocket, step or boss), not a constant thickness`;
    }
    if (offender === undefined && levels.length === 1 && (curved.length > 0 || caps.length < planar.length)) {
      offender = 'the part has walls but only one cap level';
    }
    if (offender !== undefined) {
      if (!firstReason) firstReason = `seen along ${describeNormal(n)}: ${offender}`;
      continue;
    }

    const top = Math.max(...levels);
    const bottom = Math.min(...levels);
    const topFaces = caps.filter((c) => Math.abs(c.level - top) <= LEVEL_TOL).map((c) => c.info);
    const thickness = top - bottom;
    if (thickness > 0) {
      const capArea = topFaces.reduce((a, f) => a + f.area, 0);
      const vol = backend.volume();
      if (Math.abs(vol - capArea * thickness) > 1e-3 * Math.max(vol, 1e-9)) {
        if (!firstReason) {
          firstReason = `seen along ${describeNormal(n)}: volume ${vol.toFixed(3)} mm³ differs from cap area × thickness`;
        }
        continue;
      }
    }

    const frame = flatFrame(n, topFaces.map((f) => f.face));
    const outers: ProjectedSegment[][] = [];
    const holes: ProjectedSegment[][] = [];
    for (const f of topFaces) {
      const b = faceLoops(f.face as never, frame, {
        curveTolerance: opts.curveTolerance,
        chainTolerance: CHAIN_TOL,
      });
      if (b.openChains.length > 0) {
        const o = b.openChains[0];
        return {
          ok: false,
          reason: `the cap boundary does not close (gap between [${o.start.map((x) => x.toFixed(4)).join(', ')}] and [${o.end.map((x) => x.toFixed(4)).join(', ')}])`,
        };
      }
      if (b.outer.length > 0) outers.push(b.outer);
      holes.push(...b.holes);
    }
    const loops = [...outers, ...holes];
    const bb = loopsBoundingBox(loops);
    return {
      ok: true,
      profile: {
        loops: translateLoops(loops, -bb.min[0], -bb.min[1]),
        thickness,
        normal: frame.normal,
      },
    };
  }
  return { ok: false, reason: firstReason || 'no plate direction fits the part' };
}

/**
 * Cross-section of `backend` with the plane `axis = at`, as closed loops in
 * world coordinates: `z` → (X, Y), `y` → (X, Z), `x` → (Y, Z). Works on any
 * solid. Returns `{ ok: false }` when the plane misses the part.
 */
export function extractSectionProfile(
  backend: OcctBackend,
  section: SectionSpec,
  opts: { curveTolerance?: number } = {},
): PlanarProfileResult {
  const plane = section.axis === 'z' ? 'xy' : section.axis === 'y' ? 'xz' : 'yz';
  const frame = cardinalFrame(plane, section.at);
  const extracted = sectionLoops(backend, frame, {
    curveTolerance: opts.curveTolerance,
    chainTolerance: CHAIN_TOL,
  });
  if (extracted.segmentLoops.length === 0) {
    const bb = backend.boundingBox();
    const i = section.axis === 'x' ? 0 : section.axis === 'y' ? 1 : 2;
    return {
      ok: false,
      reason: `the plane ${section.axis} = ${section.at} does not cut the part (it spans ${section.axis} ${bb.min[i].toFixed(3)} to ${bb.max[i].toFixed(3)})`,
    };
  }
  return {
    ok: true,
    profile: {
      loops: translateLoops(extracted.segmentLoops, 0, 0),
      thickness: 0,
      normal: frame.normal,
    },
  };
}
