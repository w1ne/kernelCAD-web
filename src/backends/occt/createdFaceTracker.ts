// src/backends/occt/createdFaceTracker.ts
//
// Slice-1 created-face classifier for hole / holes / cutout.
//
// Classifies each NEW face (one not present as the output of any input face's
// modification per the boolean's faceHistory) into one of the six slice-1
// ref names. The lowerer uses this to attach `labelName` entries on the
// result OcctBackend's HistoryMap so downstream `face: 'wall'` (etc.)
// resolves through the existing label path.
//
// IMPORTANT — frozen at creation: the tracker classifies faces only at the
// hole/cutout result. Subsequent ops (fillet, transform, further booleans)
// propagate the lineage through mergeBooleanHistory / propagateTransformHistory
// and inherit the labelName for free. We do NOT re-classify after later ops.
//
// Slice-2 generalizes this into a registration interface; slice-1 is the seed.

import type { Face } from 'replicad';
import type { Vec3 } from '../../intent/types';

export type CreatedRefName =
  | 'wall'
  | 'floor'
  | 'wall-back'
  | 'counterbore-wall'
  | 'counterbore-floor'
  | 'countersink-cone';

export type CreatedFeatureKind = 'hole' | 'holes' | 'cutout';

/** Geometric description of one bore (single hole, or one of the N in a holes
 *  batch, or the prism of a cutout). The classifier reads this to decide
 *  which result face is which ref. */
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

/** Cutout-specific frame: the prism's projection onto the entry face plus the
 *  prism's axis + depth. Profile bbox is used to discriminate side walls
 *  from the floor. */
export interface CutoutFrame {
  entryPoint: Vec3;            // anchor (face centroid)
  axisIntoBody: Vec3;          // unit vector
  effectiveDepth: number;
  through: boolean;
  /** Approximate profile bbox in face-local 2D for sanity-checking side
   *  faces. (Slice-1 uses world-space distance from axis as the discriminator,
   *  which works for the simple eval-corpus tasks.) */
  profileBoundingBoxRadius: number;
}

const RADIUS_TOL = 1e-3;     // mm — face radius vs bore radius match
const DISTANCE_TOL = 1e-3;   // mm — point-on-plane distance
const PARALLEL_DOT_MIN = 0.999; // cos(2.5°) — vector parallelism

interface CenteredFace {
  surfaceType: string;
  center: Vec3;
}

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

/** Distance from `pt` to the line through `linePt` along unit `lineDir`. */
function distanceToLine(pt: Vec3, linePt: Vec3, lineDir: Vec3): number {
  const d = sub(pt, linePt);
  const along = dot(d, lineDir);
  const perp: Vec3 = [d[0] - along * lineDir[0], d[1] - along * lineDir[1], d[2] - along * lineDir[2]];
  return Math.hypot(perp[0], perp[1], perp[2]);
}

/** Signed distance from `pt` along the bore axis from the entry point.
 *  Positive = into the body. */
function distanceAlongAxis(pt: Vec3, entryPoint: Vec3, axisIntoBody: Vec3): number {
  return dot(sub(pt, entryPoint), axisIntoBody);
}

function readCenteredFace(face: Face): CenteredFace {
  const c = face.center;
  // Replicad's `geomType` returns "CYLINDRE" for cylindrical faces (French
  // spelling, inherited from OCCT's older nomenclature).
  return { surfaceType: face.geomType as string, center: [c.x, c.y, c.z] as Vec3 };
}

/** Probe the face's surface radius (perpendicular distance to the bore axis
 *  from a point KNOWN to lie on the face). For a cylindrical face coaxial
 *  with the bore, this equals the cylinder's radius. We use a boundary
 *  vertex (the start point of the first edge) because the face centroid for
 *  a full cylinder lies on the axis (returning 0, not the radius).
 *
 *  Falls back to centroid for faces with no edges (defensive). */
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

/** Read a face's normal at its centroid; returns null if unavailable. */
function faceNormal(face: Face): Vec3 | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fn = (face as any).normalAt;
  if (typeof fn !== 'function') return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const n = (face as any).normalAt() as { x?: number; y?: number; z?: number } | undefined;
  if (!n || typeof n.x !== 'number') return null;
  return normalize([n.x, n.y, n.z ?? 0]);
}

// ---------------------------------------------------------------------------
// Hole classification
// ---------------------------------------------------------------------------

/** Classify a single new face produced by a `hole`/`holes` boolean cut.
 *  Returns null if the face does not correspond to any created ref (e.g.
 *  it's a planar annular leftover that should retain its original lineage). */
export function classifyHoleFace(face: Face, bore: BoreFrame): CreatedRefName | null {
  const f = readCenteredFace(face);
  const axis = normalize(bore.axisIntoBody);
  const boreRadius = bore.diameter / 2;
  const cbRadius = bore.counterbore ? bore.counterbore.diameter / 2 : null;
  const csRadius = bore.countersink ? bore.countersink.diameter / 2 : null;

  // Cylindrical face — possible: wall, wall-back, counterbore-wall.
  if (f.surfaceType === 'CYLINDRE') {
    // Check if the cylinder's axis is parallel to the bore axis. We cannot
    // read the axis directly from a replicad Face; instead we test that the
    // face center lies near the bore axis (within a small tolerance).
    const r = radiusFromBoreAxis(face, bore);
    // A cylindrical bore wall has its center ON the bore axis (because the
    // 'center' point of a cylindrical face is the midpoint of its parametric
    // domain — for an axis-parallel cylinder this lies on the axis).
    // If the cylinder is not coaxial with the bore, distanceToLine(center)
    // will not match any bore radius.
    if (Math.abs(r - boreRadius) < RADIUS_TOL) {
      // Bore wall. Distinguish 'wall' vs 'wall-back' by where the face center
      // sits along the bore axis: at or beyond the back face → 'wall-back'.
      if (bore.through) {
        const along = distanceAlongAxis(f.center, bore.entryPoint, axis);
        // 'wall-back': face center is past the entry-side cb / csk region
        // but near the exit. We classify as 'wall-back' if the face center
        // is past (entryDepth + 0.75*effectiveDepth). For non-through bores
        // there is no wall-back.
        if (along > bore.effectiveDepth * 0.75) return 'wall-back';
      }
      return 'wall';
    }
    if (cbRadius !== null && Math.abs(r - cbRadius) < RADIUS_TOL) {
      return 'counterbore-wall';
    }
    return null;
  }

  // Conical face — countersink-cone.
  if (f.surfaceType === 'CONE' && csRadius !== null) {
    // The csk apex sits along the bore axis. distanceToLine for the cone's
    // center should be < csk radius.
    const r = radiusFromBoreAxis(face, bore);
    if (r < csRadius + RADIUS_TOL) return 'countersink-cone';
    return null;
  }

  // Planar face — possible: floor, counterbore-floor.
  if (f.surfaceType === 'PLANE') {
    // Confirm the face is perpendicular to the bore axis (its normal is
    // parallel/anti-parallel to the bore axis). Planar side faces of the
    // body are NOT classified.
    const n = faceNormal(face);
    if (n === null || Math.abs(dot(n, axis)) < PARALLEL_DOT_MIN) return null;

    // For a perpendicular planar face, what matters is its position along
    // the bore axis (from entry → into body) AND its lateral extent (read
    // from a boundary vertex's perpendicular distance from the axis).
    const along = distanceAlongAxis(f.center, bore.entryPoint, axis);
    const lateralExtent = radiusFromBoreAxis(face, bore);
    const PLANAR_AXIAL_TOL = 0.05; // mm — looser than DISTANCE_TOL because of OVERSHOOT in the lowerer

    // counterbore-floor: planar annular face at depth ≈ counterbore.depth,
    // outer extent ≈ cbRadius.
    if (bore.counterbore && cbRadius !== null) {
      if (Math.abs(along - bore.counterbore.depth) < PLANAR_AXIAL_TOL &&
          lateralExtent < cbRadius + RADIUS_TOL && lateralExtent > boreRadius - RADIUS_TOL) {
        return 'counterbore-floor';
      }
    }

    // floor: planar disk at depth ≈ effectiveDepth, lateralExtent ≈ boreRadius (blind only).
    if (!bore.through &&
        Math.abs(along - bore.effectiveDepth) < PLANAR_AXIAL_TOL &&
        lateralExtent < boreRadius + RADIUS_TOL) {
      return 'floor';
    }
    return null;
  }

  return null;
}

// ---------------------------------------------------------------------------
// Cutout classification
// ---------------------------------------------------------------------------

/** Classify a single new face produced by a `cutout` boolean cut. */
export function classifyCutoutFace(face: Face, frame: CutoutFrame): CreatedRefName | null {
  const f = readCenteredFace(face);
  const axis = normalize(frame.axisIntoBody);

  // Side walls — extruded, parallel to the cutout axis. Both planar and
  // cylindrical (for arc-bounded segments) qualify. Discriminator: the face
  // center is NOT near the entry plane and NOT near the floor plane along
  // the bore axis; OR for prismatic side faces, the face normal is
  // perpendicular to the cutout axis.
  if (f.surfaceType === 'PLANE' || f.surfaceType === 'CYLINDRE') {
    const along = distanceAlongAxis(f.center, frame.entryPoint, axis);

    // floor: planar face perpendicular to axis at floor depth (blind only).
    if (
      f.surfaceType === 'PLANE' &&
      !frame.through &&
      Math.abs(along - frame.effectiveDepth) < DISTANCE_TOL
    ) {
      return 'floor';
    }

    // wall-back: planar face perpendicular to axis at the back-face plane
    // (through only). This corresponds to the residual sliver of the back
    // face that became a new face after the boolean. For the simple
    // through-cutout case there is usually no such face — the back face is
    // an annular leftover that retains its original lineage.
    // Slice-1 emits this only when the through case produces a planar
    // perpendicular face beyond the body's bbox.
    if (
      f.surfaceType === 'PLANE' &&
      frame.through &&
      along > frame.effectiveDepth * 0.95
    ) {
      return 'wall-back';
    }

    // wall: any prismatic side face that lies between the entry plane and
    // the floor/back plane along the axis.
    if (along > DISTANCE_TOL && along < frame.effectiveDepth - DISTANCE_TOL) {
      return 'wall';
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Vector helpers exposed for the lowerer
// ---------------------------------------------------------------------------

export const Vec = { normalize, dot, sub, distanceToLine, distanceAlongAxis, PARALLEL_DOT_MIN };
