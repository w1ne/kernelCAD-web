// src/backends/occt/holeClassifier.ts
//
// Slice-2 hole-feature face classifier. Used only by holeLowerer.ts.
// Replaces the slice-1 shared `createdFaceTracker.ts` (deleted) — moving
// hole logic next to its lowerer per spec §C.1 (no central classifier
// switch). Behaviorally identical to slice-1's classifyHoleFace.

import type { Face } from 'replicad';
import type { Vec3 } from '../../../intent/types';

export type HoleRefName =
  | 'wall'
  | 'floor'
  | 'wall-back'
  | 'counterbore-wall'
  | 'counterbore-floor'
  | 'countersink-cone';

export interface BoreFrame {
  /** World-space entry point (face centroid + face-local (u, v) offset). */
  entryPoint: Vec3;
  /** Unit vector pointing INTO the body (i.e. negative entry-face normal). */
  axisIntoBody: Vec3;
  /** Main bore diameter (mm). */
  diameter: number;
  /** Distance entry → floor (blind) OR entry → back face (through / upToFace). */
  effectiveDepth: number;
  /** True iff the bore goes 'through' or has an upToFace set. */
  through: boolean;
  /** Optional counterbore. */
  counterbore?: { diameter: number; depth: number };
  /** Optional countersink. */
  countersink?: { diameter: number; angleDeg: number };
}

const RADIUS_TOL = 1e-3;
const PARALLEL_DOT_MIN = 0.999;

function normalize(v: Vec3): Vec3 {
  const len = Math.hypot(v[0], v[1], v[2]);
  if (len < 1e-9) return [0, 0, 1];
  return [v[0] / len, v[1] / len, v[2] / len];
}

function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function distanceToLine(pt: Vec3, linePt: Vec3, lineDir: Vec3): number {
  const d = sub(pt, linePt);
  const along = dot(d, lineDir);
  const perp: Vec3 = [d[0] - along * lineDir[0], d[1] - along * lineDir[1], d[2] - along * lineDir[2]];
  return Math.hypot(perp[0], perp[1], perp[2]);
}

function distanceAlongAxis(pt: Vec3, entryPoint: Vec3, axisIntoBody: Vec3): number {
  return dot(sub(pt, entryPoint), axisIntoBody);
}

/** Probe the face's surface radius using a boundary edge's startPoint
 *  (the face centroid lies ON the axis for a full cylinder). Falls back
 *  to centroid for faces with no edges (defensive). */
function radiusFromBoreAxis(face: Face, bore: BoreFrame): number {
  const axis = normalize(bore.axisIntoBody);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const edges = (face as any).edges as Array<{ startPoint?: { x: number; y: number; z: number } }> | undefined;
  if (edges && edges.length > 0 && edges[0].startPoint) {
    const sp = edges[0].startPoint;
    return distanceToLine([sp.x, sp.y, sp.z], bore.entryPoint, axis);
  }
  const c = face.center;
  return distanceToLine([c.x, c.y, c.z], bore.entryPoint, axis);
}

function faceNormal(face: Face): Vec3 | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fn = (face as any).normalAt;
  if (typeof fn !== 'function') return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const n = (face as any).normalAt() as { x?: number; y?: number; z?: number } | undefined;
  if (!n || typeof n.x !== 'number' || typeof n.y !== 'number') return null;
  return normalize([n.x, n.y, n.z ?? 0]);
}

/** Classify a single new face produced by a hole/holes boolean cut. Returns
 *  null if the face does not correspond to any created ref (e.g., a planar
 *  annular leftover that should retain its original lineage). */
export function classifyHoleFace(face: Face, bore: BoreFrame): HoleRefName | null {
  const surfaceType = face.geomType as string;
  const c = face.center;
  const center: Vec3 = [c.x, c.y, c.z];
  const axis = normalize(bore.axisIntoBody);
  const boreRadius = bore.diameter / 2;
  const cbRadius = bore.counterbore ? bore.counterbore.diameter / 2 : null;
  const csRadius = bore.countersink ? bore.countersink.diameter / 2 : null;

  if (surfaceType === 'CYLINDRE') {
    const r = radiusFromBoreAxis(face, bore);
    if (Math.abs(r - boreRadius) < RADIUS_TOL) {
      if (bore.through) {
        const along = distanceAlongAxis(center, bore.entryPoint, axis);
        if (along > bore.effectiveDepth * 0.75) return 'wall-back';
      }
      return 'wall';
    }
    if (cbRadius !== null && Math.abs(r - cbRadius) < RADIUS_TOL) {
      return 'counterbore-wall';
    }
    return null;
  }

  if (surfaceType === 'CONE' && csRadius !== null) {
    const r = radiusFromBoreAxis(face, bore);
    if (r < csRadius + RADIUS_TOL) return 'countersink-cone';
    return null;
  }

  if (surfaceType === 'PLANE') {
    const n = faceNormal(face);
    if (n === null || Math.abs(dot(n, axis)) < PARALLEL_DOT_MIN) return null;

    const along = distanceAlongAxis(center, bore.entryPoint, axis);
    const lateralExtent = radiusFromBoreAxis(face, bore);
    const PLANAR_AXIAL_TOL = 0.05;

    if (bore.counterbore && cbRadius !== null) {
      if (Math.abs(along - bore.counterbore.depth) < PLANAR_AXIAL_TOL &&
          lateralExtent < cbRadius + RADIUS_TOL && lateralExtent > boreRadius - RADIUS_TOL) {
        return 'counterbore-floor';
      }
    }

    if (!bore.through &&
        Math.abs(along - bore.effectiveDepth) < PLANAR_AXIAL_TOL &&
        lateralExtent < boreRadius + RADIUS_TOL) {
      return 'floor';
    }
    return null;
  }

  return null;
}
