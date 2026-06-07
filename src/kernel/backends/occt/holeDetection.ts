// src/kernel/backends/occt/holeDetection.ts
//
// W4 inspection — cylindrical-hole detection core on BREP solids.
//
// Walks every face of a solid via TopExp_Explorer, keeps the CONCAVE
// cylindrical faces (outward normal points toward the axis — hole walls,
// not bosses), groups co-axial faces into single bores (boolean cuts
// routinely seam-split a bore into multiple faces), rejects partial
// cylinders (fillet-like channels) by length-weighted angular coverage,
// and classifies each bore as blind or through by probing on-axis points
// just beyond each end with a tiny-sphere boolean intersect.
//
// Caveats (acceptable for W4):
//   - Thread geometry is never modeled in vendor STEP — a "tapped" hole
//     reports the modeled pilot/minor diameter, not the nominal thread.
//   - The deep-probe heuristic (0.45·d past the end, catching conical
//     drill-tip bottoms) can mark a through hole `blind` when its exit
//     opens into a pocket with another wall < 0.45·d beyond.

import { getOC } from 'replicad';
import { OcctBackend } from './occtBackend';

export interface CylindricalHole {
  /** Hole-mouth center for blind holes; t_min end for through holes. */
  axisOrigin: [number, number, number];
  /** Unit vector pointing into the hole (mouth → bottom for blind). */
  axisDirection: [number, number, number];
  diameterMm: number;
  depthMm: number;
  kind: 'blind' | 'through';
  /** Number of BREP faces merged into this hole (seam splits). */
  faceCount: number;
  /** Set when both axial ends probe closed (internal duct). */
  bothEndsClosed?: boolean;
}

/** Radius (mm) of the probe sphere used for the point-in-solid test.
 *  `BRepClass3d_SolidClassifier` is not exposed by the wasm bindings we
 *  ship, so "point inside material" is approximated by a tiny-sphere
 *  boolean intersection (same primitive the joint-mesh-continuity gate
 *  uses). Small enough not to graze nearby walls; large enough to avoid
 *  OCCT boolean degeneracy on a point-like primitive. */
export const PROBE_SPHERE_RADIUS_MM = 0.05;

/** Two faces belong to the same bore only if their radii agree within this. */
const RADIUS_TOL_MM = 0.01;
/** Axis-parallelism tolerance: |dirA·dirB| must exceed 1 − this. */
const AXIS_PARALLEL_TOL = 1e-6;
/** Max distance (mm) from a face's axis point to the group's axis line. */
const AXIS_DIST_TOL_MM = 0.01;
/** Co-axial face intervals union across gaps up to this (mm). */
const INTERVAL_GAP_MM = 0.05;
/** Length-weighted angular coverage (rad) required to call a bore a hole.
 *  A seam-split full bore sums to 2π; a quarter-round fillet channel to
 *  ~π/2. 5.8 rad ≈ 332° leaves slack for boolean sliver faces. */
export const MIN_ANGULAR_COVERAGE_RAD = 5.8;
/** Near end-probe offset (mm) — catches flat caps just past the bore end. */
const NEAR_PROBE_OFFSET_MM = 0.2;
/** Deep end-probe offset as a fraction of hole diameter — catches conical
 *  drill-tip bottoms (118° tip extends ≈ 0.29·d past the cylindrical wall). */
const DEEP_PROBE_DIAMETER_FACTOR = 0.45;
/** Bores shorter than this (mm) are degenerate boolean artifacts. */
const MIN_BORE_LENGTH_MM = 1e-6;

export type Vec3 = [number, number, number];

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const norm = (a: Vec3): number => Math.hypot(a[0], a[1], a[2]);
const normalize = (a: Vec3): Vec3 => {
  const n = norm(a);
  return n === 0 ? a : scale(a, 1 / n);
};

/** Distance from point `p` to the infinite line through `origin` along
 *  unit vector `dir`. */
function distanceToLine(p: Vec3, origin: Vec3, dir: Vec3): number {
  const d = sub(p, origin);
  return norm(cross(d, dir));
}

/**
 * Tiny-sphere point-in-solid probe: `true` when the on-axis point at
 * `point` sits inside (or on) the solid's material. Boolean intersect of
 * a 0.05 mm sphere with the body — non-empty result ⇒ inside.
 *
 * Exported for reuse by later W4 layers; kept here (kernel layer) rather
 * than importing the modeling-layer joint-continuity helper.
 */
export function probePointInsideMaterial(
  backend: OcctBackend,
  point: readonly [number, number, number],
): boolean {
  const probe = OcctBackend.sphere(PROBE_SPHERE_RADIUS_MM).translate(
    point[0],
    point[1],
    point[2],
  );
  try {
    // Clone is a cheap handle copy: replicad booleans do NOT consume their
    // operands. The clone is defensive wrapper isolation — the probe boolean
    // runs on a throwaway wrapper so the caller's backend is never an operand
    // of an OCCT operation (same pattern as measureGapToBody in
    // jointMeshContinuity.ts).
    const inter = backend.clone().intersect(probe);
    return !inter.isEmpty();
  } catch {
    // OCCT boolean can throw on degenerate inputs; treat as "outside".
    return false;
  }
}

/** One concave cylindrical face, in the face's OWN cylinder frame.
 *  Exported for direct unit tests of the pure grouping/merge pipeline. */
export interface ConcaveCylFace {
  /** Point on the cylinder axis. */
  loc: Vec3;
  /** Unit axis direction (sign as OCCT reports it for this face). */
  dir: Vec3;
  radiusMm: number;
  /** Angular UV extent (rad). */
  du: number;
  /** Axial UV bounds (mm along `dir` from `loc`). */
  v1: number;
  v2: number;
}

/** A face's axial interval mapped onto a group's canonical axis. */
export interface FaceInterval {
  t0: number;
  t1: number;
  du: number;
}

export interface AxisGroup {
  loc0: Vec3;
  dir0: Vec3;
  radiusMm: number;
  faces: FaceInterval[];
}

/** A merged co-axial bore extent, before end-probe classification.
 *  Exported for direct unit tests of the pure grouping/merge pipeline. */
export interface BoreExtent {
  /** Canonical axis frame (first face's loc/dir in the group). */
  loc0: Vec3;
  dir0: Vec3;
  radiusMm: number;
  /** Axial bounds (mm along `dir0` from `loc0`). */
  tMin: number;
  tMax: number;
  /** Number of BREP faces merged into this bore (seam splits). */
  faceCount: number;
}

/**
 * Pure geometric core of hole detection: group concave cylindrical face
 * descriptors by axis line + radius, union their axial intervals across
 * small gaps, and keep only clusters whose length-weighted angular
 * coverage clears `MIN_ANGULAR_COVERAGE_RAD` (a seam-split full bore sums
 * to 2π; a fillet channel to ~π/2). No OCCT involvement — testable on
 * plain descriptor data.
 */
export function resolveBoreExtents(faces: ConcaveCylFace[]): BoreExtent[] {
  const bores: BoreExtent[] = [];
  for (const group of groupCoaxialFaces(faces)) {
    for (const cluster of mergeIntervals(group.faces)) {
      const depth = cluster.t1 - cluster.t0;
      if (depth < MIN_BORE_LENGTH_MM) continue;

      // Length-weighted angular coverage over the merged extent. A full
      // bore (even seam-split) sums to 2π; a fillet channel to ~π/2.
      let weighted = 0;
      for (const f of cluster.faces) weighted += f.du * (f.t1 - f.t0);
      if (weighted / depth < MIN_ANGULAR_COVERAGE_RAD) continue;

      bores.push({
        loc0: group.loc0,
        dir0: group.dir0,
        radiusMm: group.radiusMm,
        tMin: cluster.t0,
        tMax: cluster.t1,
        faceCount: cluster.faces.length,
      });
    }
  }
  return bores;
}

/**
 * Detect cylindrical holes (blind and through bores) on a BREP solid.
 *
 * Returns one entry per merged co-axial bore. Convex cylinders (bosses)
 * and partial concave cylinders (fillet-like channels) are excluded.
 */
export function detectCylindricalHoles(backend: OcctBackend): CylindricalHole[] {
  const faces = collectConcaveCylindricalFaces(backend);
  const holes: CylindricalHole[] = [];

  for (const bore of resolveBoreExtents(faces)) {
    const { loc0, dir0, radiusMm, tMin, tMax, faceCount } = bore;
    const depth = tMax - tMin;
    const diameter = 2 * radiusMm;
    const endLow = add(loc0, scale(dir0, tMin));
    const endHigh = add(loc0, scale(dir0, tMax));
    const lowClosed = isEndClosed(backend, endLow, scale(dir0, -1), diameter);
    const highClosed = isEndClosed(backend, endHigh, dir0, diameter);

    let kind: 'blind' | 'through';
    let origin: Vec3;
    let direction: Vec3;
    let bothEndsClosed = false;
    if (!lowClosed && !highClosed) {
      kind = 'through';
      origin = endLow;
      direction = dir0;
    } else if (lowClosed && !highClosed) {
      // Mouth at the high end; bottom at the low end.
      kind = 'blind';
      origin = endHigh;
      direction = scale(dir0, -1);
    } else if (highClosed && !lowClosed) {
      kind = 'blind';
      origin = endLow;
      direction = dir0;
    } else {
      // Both ends closed — internal duct. Report as blind but flag it
      // rather than silently misreporting; mouth choice is arbitrary.
      kind = 'blind';
      origin = endLow;
      direction = dir0;
      bothEndsClosed = true;
    }

    const hole: CylindricalHole = {
      axisOrigin: origin,
      axisDirection: direction,
      diameterMm: diameter,
      depthMm: depth,
      kind,
      faceCount,
    };
    if (bothEndsClosed) hole.bothEndsClosed = true;
    holes.push(hole);
  }

  return holes;
}

/**
 * An axial end is "closed" (material beyond it) when either the near probe
 * (end + 0.2 mm — flat caps) or the deep probe (end + 0.45·d — past a
 * conical drill-tip void) sits inside the solid. `outward` is the unit
 * vector pointing out of the bore at this end.
 */
function isEndClosed(
  backend: OcctBackend,
  end: Vec3,
  outward: Vec3,
  diameterMm: number,
): boolean {
  const near = add(end, scale(outward, NEAR_PROBE_OFFSET_MM));
  if (probePointInsideMaterial(backend, near)) return true;
  const deep = add(end, scale(outward, DEEP_PROBE_DIAMETER_FACTOR * diameterMm));
  return probePointInsideMaterial(backend, deep);
}

/**
 * Enumerate all faces; keep cylindrical faces whose solid-outward normal
 * points TOWARD the axis (hole walls). Robust against surface handedness:
 * the natural normal `d1u × d1v` is flipped by face orientation, then
 * compared against the radial vector at the evaluation point — never
 * shortcut to "orientation is REVERSED".
 */
function collectConcaveCylindricalFaces(backend: OcctBackend): ConcaveCylFace[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const oc = getOC() as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wrapped = (backend.getReplicadShape() as any).wrapped;
  const out: ConcaveCylFace[] = [];

  const explorer = new oc.TopExp_Explorer_2(
    wrapped,
    oc.TopAbs_ShapeEnum.TopAbs_FACE,
    oc.TopAbs_ShapeEnum.TopAbs_SHAPE,
  );
  try {
    while (explorer.More()) {
      const raw = explorer.Current();
      const face = oc.TopoDS.Face_1(raw);
      const adaptor = new oc.BRepAdaptor_Surface_2(face, true);
      try {
        const type = adaptor.GetType();
        if (type.value === oc.GeomAbs_SurfaceType.GeomAbs_Cylinder.value) {
          const cyl = adaptor.Cylinder();
          const ax1 = cyl.Axis();
          const locP = ax1.Location();
          const dirD = ax1.Direction();
          const loc: Vec3 = [locP.X(), locP.Y(), locP.Z()];
          const dir = normalize([dirD.X(), dirD.Y(), dirD.Z()]);
          const radiusMm = cyl.Radius();
          const u1 = adaptor.FirstUParameter();
          const u2 = adaptor.LastUParameter();
          const v1 = adaptor.FirstVParameter();
          const v2 = adaptor.LastVParameter();

          // Concavity test at mid-UV. Natural normal n = d1u × d1v; face
          // orientation REVERSED flips it to the solid's outward normal.
          const p = new oc.gp_Pnt_1();
          const d1u = new oc.gp_Vec_1();
          const d1v = new oc.gp_Vec_1();
          adaptor.D1((u1 + u2) / 2, (v1 + v2) / 2, p, d1u, d1v);
          let n = cross(
            [d1u.X(), d1u.Y(), d1u.Z()],
            [d1v.X(), d1v.Y(), d1v.Z()],
          );
          const orientation = face.Orientation_1();
          if (orientation.value === oc.TopAbs_Orientation.TopAbs_REVERSED.value) {
            n = scale(n, -1);
          }
          const point: Vec3 = [p.X(), p.Y(), p.Z()];
          p.delete();
          d1u.delete();
          d1v.delete();
          cyl.delete();
          ax1.delete();
          locP.delete();
          dirD.delete();

          // Radial vector from the axis to the evaluated point. The face
          // is a hole wall iff the outward normal opposes it.
          const tAxial = dot(sub(point, loc), dir);
          const axisPoint = add(loc, scale(dir, tAxial));
          const w = sub(point, axisPoint);
          if (dot(n, w) < 0) {
            out.push({ loc, dir, radiusMm, du: u2 - u1, v1, v2 });
          }
        }
      } finally {
        adaptor.delete();
      }
      explorer.Next();
    }
  } finally {
    explorer.delete();
  }
  return out;
}

/**
 * Group faces sharing one axis line and radius. Each face's axial extent
 * is canonicalized onto the group's (loc0, dir0) frame — a co-axial face
 * may carry a flipped dir, so both v endpoints are mapped through the
 * face's OWN loc/dir first, then projected onto dir0.
 *
 * Exported for direct unit tests (pure — no OCCT involvement).
 */
export function groupCoaxialFaces(faces: ConcaveCylFace[]): AxisGroup[] {
  const groups: AxisGroup[] = [];
  for (const f of faces) {
    let group: AxisGroup | undefined;
    for (const g of groups) {
      if (Math.abs(f.radiusMm - g.radiusMm) >= RADIUS_TOL_MM) continue;
      if (Math.abs(dot(f.dir, g.dir0)) <= 1 - AXIS_PARALLEL_TOL) continue;
      if (distanceToLine(f.loc, g.loc0, g.dir0) >= AXIS_DIST_TOL_MM) continue;
      group = g;
      break;
    }
    if (group === undefined) {
      group = { loc0: f.loc, dir0: f.dir, radiusMm: f.radiusMm, faces: [] };
      groups.push(group);
    }
    const e1 = add(f.loc, scale(f.dir, f.v1));
    const e2 = add(f.loc, scale(f.dir, f.v2));
    const tA = dot(sub(e1, group.loc0), group.dir0);
    const tB = dot(sub(e2, group.loc0), group.dir0);
    group.faces.push({ t0: Math.min(tA, tB), t1: Math.max(tA, tB), du: f.du });
  }
  return groups;
}

export interface MergedCluster {
  t0: number;
  t1: number;
  faces: FaceInterval[];
}

/**
 * Union the faces' t-intervals, allowing `INTERVAL_GAP_MM` gaps. Disjoint
 * clusters are separate bores (two co-axial holes with material between
 * them must not merge into one).
 *
 * Exported for direct unit tests (pure — no OCCT involvement).
 */
export function mergeIntervals(faces: FaceInterval[]): MergedCluster[] {
  if (faces.length === 0) return [];
  const sorted = [...faces].sort((a, b) => a.t0 - b.t0);
  const clusters: MergedCluster[] = [];
  let current: MergedCluster = { t0: sorted[0].t0, t1: sorted[0].t1, faces: [sorted[0]] };
  for (let i = 1; i < sorted.length; i++) {
    const f = sorted[i];
    if (f.t0 <= current.t1 + INTERVAL_GAP_MM) {
      current.t1 = Math.max(current.t1, f.t1);
      current.faces.push(f);
    } else {
      clusters.push(current);
      current = { t0: f.t0, t1: f.t1, faces: [f] };
    }
  }
  clusters.push(current);
  return clusters;
}
