// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/runtime/dfm/mouldingCheck.ts
//
// Injection-moulding check for one part (dfmSpec({ process: 'moulding' })).
// Every finding is measured on the part's own geometry, in the part-local
// frame, from the kernel's per-face triangulation (faceTaggedMeshOf) and the
// export-grade mesh the other DFM gates already share:
//
//   - Surface normals: planar faces use the facet normal (exact). Where a
//     curved face's facet could decide a finding, the exact surface normal at
//     the triangle centroid (oriented to agree with the outward facet) is
//     used instead: near-limit draft triangles, so a 1° cone does not read as
//     0.99° from its chord facets, and triangles the facet test calls
//     undercut, so a near-vertical B-spline blend patch whose facets tilt a
//     few degrees is not misread as facing the wrong mould half.
//   - Draft: per BREP face whose normal is not parallel to the pull axis d,
//     the smallest |90° − angle(n, d)| over its triangles.
//   - Undercut: the mould is two halves separating along ±d with the parting
//     surface free, so a face releases into the half it faces. A triangle is
//     an undercut when a ray from just outside it along that release
//     direction hits the part (side walls, |n·d| ≈ 0, must be blocked both
//     ways). Same ray idiom as the CNC undercut check, per BREP face. The ray
//     starts MIN_UNDERCUT_DEPTH_MM out from the face perpendicular to the
//     pull axis, so only overhangs at least that deep count.
//   - Thin wall: `checkMinWall` (the minWall gate's sampler) at minWallMm,
//     with the FDM knife-edge filter so a chamfer tip is not a wall.
//   - Thick section: the largest inscribed sphere. Voxelize the solid, run
//     the exact distance transform (voxelGrid.edt2) to find the deepest
//     voxels, then re-measure the best candidates with the exact
//     point-to-mesh distance (TriangleBvh.closestPoint) and climb away from
//     the nearest surface. The reported diameter is a LOWER bound on the true
//     inscribed diameter (every value is a real distance from an interior
//     point), so a flag is never a voxel artefact; a section thicker than the
//     limit by less than about one voxel can be missed.
//   - Sharp internal corner: (a) concave creases between two BREP faces that
//     are real corners rather than a curved face's tessellation meeting a
//     tangent neighbour (radius 0), and (b) concave partial cylinders (fillet
//     blends) with radius below minRadiusMm. Full bores are holes, not
//     corners. Concave fillets that are not cylinders (torus/spline blends)
//     are not radius-checked — the report says so in `limitations`.
//
// Anything that cannot be measured is listed in `unmeasured` and surfaces as
// a warn `dfm.moulding.unmeasured` diagnostic instead of passing silently.

import type { CompilerDiagnostic, DiagnosticCode } from '../../../shared/diagnostics/diagnostic';
import { DIAGNOSTIC_REGISTRY } from '../../../shared/diagnostics/registry';
import type { DfmMouldingMetadata } from '../../../shared/intent/dfmSpecRecord';
import { meshShapeForExport, type OcctBackend } from '../../../kernel/backends/occt/occtBackend';
import { FaceNormalEvaluator, isPlanarFace, replicadFacesOf } from '../../../kernel/backends/occt/faceNormalEvaluator';
import {
  collectConcaveCylinderClusters,
  MIN_ANGULAR_COVERAGE_RAD,
} from '../../../kernel/backends/occt/holeDetection';
import { TriangleBvh, type DfmMesh } from './meshBvh';
import { checkMinWall, MAX_REPORTED_CLUSTERS, type MinWallResult } from './minWall';
import { edt2, samplePoint, voxelize } from './voxelGrid';
import { FDM_WALL_MAX_WEDGE_DEG, faceTaggedMeshOf } from './fdmCheck';
import { faceFacetSteps, isTangentBlend, meshEdges, trianglesOf, type Tri, type Vec3 } from './cncCheck';

/** Faces this close to perpendicular to the pull axis (normal parallel to
 *  it) are parting / shut-off faces, not draft faces. */
const PARALLEL_TOL_DEG = 0.01;
/** Measured draft below minDraftDeg by more than this fails (float noise). */
const DRAFT_TOL_DEG = 1e-3;
/** Curved-face triangles whose facet draft is below minDraftDeg + 2° are
 *  re-measured with the exact surface normal (chord facets understate a
 *  cone's draft slightly). */
const EXACT_NORMAL_MARGIN_DEG = 2;
/** Once a curved face has failed on this many exactly re-measured triangles,
 *  the rest of its near-limit triangles are not re-measured (the face fails
 *  either way; the reported draft is the smallest exact value found). */
const EXACT_DRAFT_EARLY_EXIT = 8;
/** |n·d| below this is a side wall: it must release one way or the other. */
const SIDE_WALL_COS = Math.sin((0.01 * Math.PI) / 180);
/** Release ray starts this far outside the surface, mm. */
const RAY_OFFSET_MM = 1e-3;
/** Minimum undercut depth, mm: the release ray also starts this far out
 *  perpendicular to the pull axis, so material overhanging the face by less
 *  (blend-surface dimples, tessellation chords — far below toolmaking
 *  tolerance) does not count as locking the part in the mould. */
export const MIN_UNDERCUT_DEPTH_MM = 0.02;
/** Faces with less undercut area than this are tessellation slivers, mm². */
const MIN_UNDERCUT_AREA_MM2 = 1e-3;
/** A concave crease must turn the surface by at least this much to count as
 *  a corner; shallower creases (a 175° seam) are not stress concentrators. */
const MIN_CORNER_TURN_DEG = 10;
/** Voxel size for the thick-section search: a tenth of maxWallMm, clamped. */
const THICK_VOXEL_MIN_MM = 0.1;
const THICK_VOXEL_MAX_MM = 0.5;
const THICK_MAX_VOXELS = 2_000_000;
/** Deepest voxels re-measured with the exact mesh distance. */
const THICK_CANDIDATES = 64;
const MAX_REPORTED = 10;

const dot = (a: readonly number[], b: readonly number[]): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const deg = (rad: number): number => (rad * 180) / Math.PI;
/** Draft angle of a surface with unit normal n against unit pull axis d. */
const draftOf = (n: readonly number[], d: readonly number[]): number =>
  deg(Math.asin(Math.min(1, Math.abs(dot(n, d)))));

export interface MouldingDraftFace {
  faceRef: string;
  /** Smallest measured draft on the face, degrees. */
  draftDeg: number;
  /** Area of the face's non-parting triangles, mm². */
  areaMm2: number;
  /** Part-local centroid of the least-drafted triangle. */
  location: Vec3;
  /** The face has triangles facing both mould halves (it crosses the
   *  parting line and must be split there to be drafted both ways). */
  straddlesParting: boolean;
}

export interface MouldingUndercutFace {
  faceRef: string;
  areaMm2: number;
  /** Part-local centroid of the face's largest blocked triangle. */
  location: Vec3;
}

export interface MouldingThickSection {
  /** Inscribed-sphere diameter, mm (lower bound; see module header). */
  thicknessMm: number;
  /** Part-local inscribed-sphere centre. */
  location: Vec3;
  /** Voxel edge used for the candidate search, mm. */
  voxelMm: number;
}

export interface MouldingSharpCorner {
  kind: 'crease' | 'tight-fillet';
  /** 0 for a crease; the blend radius for a tight fillet, mm. */
  radiusMm: number;
  /** Part-local point on the corner. */
  location: Vec3;
  /** Crease: the two meeting faces. */
  faceRefs?: [string, string];
  /** Crease: summed edge length, mm. */
  lengthMm?: number;
  /** Crease: how far the surface turns at the corner, degrees. */
  turnDeg?: number;
}

export interface MouldingPartReport {
  settings: DfmMouldingMetadata;
  draft: {
    /** BREP faces whose normal is not everywhere parallel to the pull axis. */
    checkedFaces: number;
    /** Every checked face below minDraftDeg, least drafted first. */
    insufficient: MouldingDraftFace[];
    /** Smallest draft over all checked faces (Infinity when none). */
    minDraftDeg: number;
  };
  undercut: {
    areaMm2: number;
    /** Faces with undercut area, largest first. */
    faces: MouldingUndercutFace[];
  };
  /** Min-wall sampling at minWallMm (part-local locations). */
  walls: MinWallResult;
  /** Thickest section, or null when it could not be measured. */
  thickest: MouldingThickSection | null;
  sharpCorners: MouldingSharpCorner[];
  /** Quantities this run could not measure (each also a warn diagnostic). */
  unmeasured: string[];
  /** What the check does not cover, stated so a pass is not over-read. */
  limitations: string[];
  /** 'fail' when any moulding finding for this part is error severity. */
  verdict: 'pass' | 'fail';
}

type ToWorld = (p: Vec3) => readonly [number, number, number];

export interface MouldingCheckOptions {
  settings: DfmMouldingMetadata;
  part: string;
  /** Owner segment for `@kc[<owner>/face/<name>]` refs. */
  refOwner: string;
  /** Export-grade mesh of `shape` (and its BVH) when the caller built them. */
  mesh?: DfmMesh;
  bvh?: TriangleBvh;
  toWorld?: ToWorld;
}

export interface MouldingCheckResult {
  report: MouldingPartReport;
  diagnostics: CompilerDiagnostic[];
}

export const MOULDING_LIMITATIONS: readonly string[] = [
  'Parting surface is assumed free: each face releases into the mould half it faces; no parting line is constructed.',
  'Undercut and draft are sampled per triangle of the kernel tessellation; a blocked patch smaller than one triangle can be missed, and undercuts shallower than 0.02 mm are ignored.',
  'Thick sections: the reported diameter is a lower bound, within about one voxel of the true inscribed diameter.',
  'Only cylindrical concave blends are radius-checked; torus/spline concave blends are not.',
  'Rib-to-wall thickness ratio, boss geometry, gate/weld-line placement and flow length are not checked.',
];

/** Run the injection-moulding check on one part (part-local frame). */
export function checkMouldability(shape: OcctBackend, opts: MouldingCheckOptions): MouldingCheckResult {
  const { settings } = opts;
  const d = settings.pullDirection;
  const mesh = opts.mesh ?? meshShapeForExport(shape.getReplicadShape());
  const bvh = opts.bvh ?? new TriangleBvh(mesh);
  const unmeasured: string[] = [];

  const tagged = faceTaggedMeshOf(shape, opts.refOwner);
  const taggedMesh: DfmMesh = { vertices: Array.from(tagged.vertices), triangles: Array.from(tagged.triangles) };
  const tris = trianglesOf(taggedMesh);
  const faceOfTri = tagged.faceOfTri;
  const faces = replicadFacesOf(shape.getReplicadShape());

  let draft: MouldingPartReport['draft'] = { checkedFaces: 0, insufficient: [], minDraftDeg: Infinity };
  let undercut: MouldingPartReport['undercut'] = { areaMm2: 0, faces: [] };
  let sharpCorners: MouldingSharpCorner[] = [];
  if (tris.length === 0) {
    unmeasured.push('draft, undercut and sharp corners (the kernel returned no face triangulation)');
  } else {
    const normals = new ExactNormals(tris, faceOfTri, faces);
    try {
      draft = measureDraft(tris, normals, faceOfTri, tagged.faceRefs, d, settings.minDraftDeg);
      undercut = findMouldUndercuts(tris, normals, faceOfTri, tagged.faceRefs, new TriangleBvh(taggedMesh), d);
    } finally {
      normals.dispose();
    }
    if (draft.checkedFaces === 0) unmeasured.push('draft (no face with a normal off the pull axis was found)');
    sharpCorners = [
      ...findConcaveCreases(tris, faceOfTri, tagged.faceRefs),
      ...findTightConcaveFillets(shape, settings.minRadiusMm),
    ];
  }

  const walls = checkMinWall(mesh, settings.minWallMm, { bvh, maxWedgeDeg: FDM_WALL_MAX_WEDGE_DEG });
  if (!Number.isFinite(walls.thinnestMm)) unmeasured.push('wall thickness (no inward wall ray hit the far side)');

  const thickest = findThickestSection(mesh, bvh, settings.maxWallMm);
  if (thickest === null) unmeasured.push('thickest section (the voxel grid holds no solid voxel inside the part)');

  const report: MouldingPartReport = {
    settings, draft, undercut, walls, thickest, sharpCorners, unmeasured,
    limitations: [...MOULDING_LIMITATIONS], verdict: 'pass',
  };
  const diagnostics = mouldingDiagnostics(report, opts.part, opts.toWorld ?? (p => p));
  if (diagnostics.some(x => x.severity === 'error')) report.verdict = 'fail';
  return { report, diagnostics };
}

// --- Surface normals ---------------------------------------------------------------

/** Lazily evaluated, memoized outward normals per triangle: exact for
 *  curved faces, the facet normal for planes or where OCCT cannot evaluate.
 *  `dispose()` frees the per-face OCCT evaluators. */
export class ExactNormals {
  private readonly evaluators = new Map<number, FaceNormalEvaluator | null>();
  private readonly memo = new Map<number, Vec3>();
  private readonly tris: readonly Tri[];
  private readonly faceOfTri: ArrayLike<number>;
  private readonly faces: readonly unknown[];

  constructor(
    tris: readonly Tri[],
    faceOfTri: ArrayLike<number>,
    faces: readonly unknown[],
  ) {
    this.tris = tris;
    this.faceOfTri = faceOfTri;
    this.faces = faces;
  }

  /** True when triangle i lies on a non-planar face OCCT can evaluate. */
  isCurved(i: number): boolean {
    return this.evaluator(this.faceOfTri[i]) !== null;
  }

  /** Outward unit normal of triangle i (exact when its face is curved). */
  get(i: number): Vec3 {
    const hit = this.memo.get(i);
    if (hit !== undefined) return hit;
    const t = this.tris[i];
    const n = this.evaluator(this.faceOfTri[i])?.normalAt(t.c);
    const out: Vec3 = n === undefined ? t.n : dot(n, t.n) < 0 ? [-n[0], -n[1], -n[2]] : n;
    this.memo.set(i, out);
    return out;
  }

  dispose(): void {
    for (const e of this.evaluators.values()) e?.delete();
    this.evaluators.clear();
  }

  private evaluator(f: number): FaceNormalEvaluator | null {
    let e = this.evaluators.get(f);
    if (e === undefined) {
      e = null;
      const face = this.faces[f];
      if (face !== undefined && !isPlanarFace(face)) {
        try {
          e = new FaceNormalEvaluator(face);
        } catch {
          e = null; // keep the facet normal for this face
        }
      }
      this.evaluators.set(f, e);
    }
    return e;
  }
}

// --- Draft -----------------------------------------------------------------------

interface FaceDraftAcc {
  /** Smallest draft over triangles whose value is final (planar facets,
   *  steep facets, or exactly re-measured curved triangles). */
  min: number;
  at: Vec3;
  area: number;
  pos: boolean;
  neg: boolean;
  /** Curved-face triangles near the limit, to re-measure exactly. */
  nearLimit: Array<{ i: number; facet: number }>;
}

/** Per BREP face: smallest draft over its non-parting triangles. */
export function measureDraft(
  tris: readonly Tri[],
  normals: ExactNormals,
  faceOfTri: ArrayLike<number>,
  faceRefs: readonly string[],
  d: Vec3,
  minDraftDeg: number,
): MouldingPartReport['draft'] {
  const parallelCos = Math.cos((PARALLEL_TOL_DEG * Math.PI) / 180);
  const failAt = minDraftDeg - DRAFT_TOL_DEG;
  const acc = new Map<number, FaceDraftAcc>();
  tris.forEach((t, i) => {
    if (t.area === 0) return;
    const nd = dot(t.n, d);
    if (Math.abs(nd) >= parallelCos) return; // parting / shut-off surface
    const f = faceOfTri[i];
    const e = acc.get(f) ?? { min: Infinity, at: t.c, area: 0, pos: false, neg: false, nearLimit: [] };
    const a = draftOf(t.n, d);
    if (a < minDraftDeg + EXACT_NORMAL_MARGIN_DEG && normals.isCurved(i)) {
      e.nearLimit.push({ i, facet: a });
    } else {
      if (a < e.min) {
        e.min = a;
        e.at = t.c;
      }
      if (nd > SIDE_WALL_COS) e.pos = true;
      if (nd < -SIDE_WALL_COS) e.neg = true;
    }
    e.area += t.area;
    acc.set(f, e);
  });
  // Exact re-measurement of near-limit curved triangles, least drafted first.
  for (const e of acc.values()) {
    e.nearLimit.sort((x, y) => x.facet - y.facet);
    let failed = 0;
    for (const { i } of e.nearLimit) {
      const n = normals.get(i);
      const a = draftOf(n, d);
      if (a < e.min) {
        e.min = a;
        e.at = tris[i].c;
      }
      const nd = dot(n, d);
      if (nd > SIDE_WALL_COS) e.pos = true;
      if (nd < -SIDE_WALL_COS) e.neg = true;
      if (a < failAt && ++failed >= EXACT_DRAFT_EARLY_EXIT) break;
    }
  }
  const insufficient: MouldingDraftFace[] = [];
  let minAll = Infinity;
  for (const [f, e] of acc) {
    minAll = Math.min(minAll, e.min);
    if (e.min >= failAt) continue;
    insufficient.push({
      faceRef: faceRefs[f] ?? `f${f}`,
      draftDeg: e.min,
      areaMm2: e.area,
      location: [...e.at] as Vec3,
      straddlesParting: e.pos && e.neg,
    });
  }
  insufficient.sort((x, y) => x.draftDeg - y.draftDeg || y.areaMm2 - x.areaMm2);
  return { checkedFaces: acc.size, insufficient, minDraftDeg: minAll };
}

// --- Undercut --------------------------------------------------------------------

/** Does material block triangle `t` (outward normal `n`) from releasing into
 *  the mould half it faces? */
function releaseBlocked(t: Tri, i: number, n: Vec3, bvh: TriangleBvh, d: Vec3): boolean {
  const nd = dot(n, d);
  const minus: Vec3 = [-d[0], -d[1], -d[2]];
  const dirs = nd > SIDE_WALL_COS ? [d] : nd < -SIDE_WALL_COS ? [minus] : [d, minus];
  // Lateral (pull-perpendicular) outward direction of the face, if any.
  const h: Vec3 = [n[0] - nd * d[0], n[1] - nd * d[1], n[2] - nd * d[2]];
  const hl = Math.hypot(h[0], h[1], h[2]);
  const lat = hl > 1e-9 ? MIN_UNDERCUT_DEPTH_MM / hl : 0;
  const origin: Vec3 = [
    t.c[0] + RAY_OFFSET_MM * t.n[0] + lat * h[0],
    t.c[1] + RAY_OFFSET_MM * t.n[1] + lat * h[1],
    t.c[2] + RAY_OFFSET_MM * t.n[2] + lat * h[2],
  ];
  return dirs.every(dir => bvh.raycast(origin, dir, { tMin: 1e-6, skipTri: i }) !== null);
}

/** Faces whose surface cannot release into either mould half along ±d. */
export function findMouldUndercuts(
  tris: readonly Tri[],
  normals: ExactNormals,
  faceOfTri: ArrayLike<number>,
  faceRefs: readonly string[],
  bvh: TriangleBvh,
  d: Vec3,
): MouldingPartReport['undercut'] {
  const perFace = new Map<number, { area: number; at: Vec3; best: number }>();
  tris.forEach((t, i) => {
    if (t.area === 0) return;
    if (!releaseBlocked(t, i, t.n, bvh, d)) return;
    // A curved face's facet can tilt a few degrees off the true surface:
    // confirm with the exact normal before calling it an undercut.
    if (normals.isCurved(i) && !releaseBlocked(t, i, normals.get(i), bvh, d)) return;
    const f = faceOfTri[i];
    const e = perFace.get(f) ?? { area: 0, at: t.c, best: 0 };
    e.area += t.area;
    if (t.area > e.best) {
      e.best = t.area;
      e.at = t.c;
    }
    perFace.set(f, e);
  });
  const faces: MouldingUndercutFace[] = [];
  for (const [f, e] of perFace) {
    if (e.area < MIN_UNDERCUT_AREA_MM2) continue;
    faces.push({ faceRef: faceRefs[f] ?? `f${f}`, areaMm2: e.area, location: [...e.at] as Vec3 });
  }
  faces.sort((x, y) => y.areaMm2 - x.areaMm2);
  return { areaMm2: faces.reduce((sum, x) => sum + x.areaMm2, 0), faces };
}

// --- Thick section ---------------------------------------------------------------

/** Largest inscribed sphere: EDT candidates refined by exact mesh distance. */
export function findThickestSection(mesh: DfmMesh, bvh: TriangleBvh, maxWallMm: number): MouldingThickSection | null {
  const target = Math.min(THICK_VOXEL_MAX_MM, Math.max(THICK_VOXEL_MIN_MM, maxWallMm / 10));
  const grid = voxelize(mesh, bvh, target, THICK_MAX_VOXELS);
  const air = new Uint8Array(grid.solid.length);
  for (let i = 0; i < air.length; i++) air[i] = grid.solid[i] ? 0 : 1;
  const dist = edt2(air, grid);

  // Deepest solid voxels first.
  const cand: Array<{ idx: number; d2: number }> = [];
  for (let idx = 0; idx < dist.length; idx++) {
    if (!grid.solid[idx]) continue;
    const d2 = dist[idx];
    if (cand.length < THICK_CANDIDATES) {
      cand.push({ idx, d2 });
      if (cand.length === THICK_CANDIDATES) cand.sort((a, b) => a.d2 - b.d2);
    } else if (d2 > cand[0].d2) {
      cand[0] = { idx, d2 };
      cand.sort((a, b) => a.d2 - b.d2);
    }
  }
  if (cand.length === 0) return null;

  let best: { r: number; p: Vec3 } | null = null;
  const plane = grid.nx * grid.ny;
  for (const { idx } of cand) {
    const k = Math.floor(idx / plane);
    const j = Math.floor((idx - k * plane) / grid.nx);
    const i = idx - k * plane - j * grid.nx;
    const p = samplePoint(grid, i, j, k);
    if (!bvh.pointInside(p)) continue;
    const r = climbInscribed(bvh, p, grid.voxelMm);
    if (r !== null && (best === null || r.r > best.r)) best = r;
  }
  if (best === null) return null;
  return { thicknessMm: 2 * best.r, location: best.p, voxelMm: grid.voxelMm };
}

/** Move an interior point away from its nearest surface point while that
 *  grows the clearance (medial-axis ascent); returns the best interior point
 *  and its exact distance to the mesh. */
function climbInscribed(bvh: TriangleBvh, start: Vec3, voxelMm: number): { r: number; p: Vec3 } | null {
  const first = bvh.closestPoint(start);
  if (first === null) return null;
  let p = start;
  let r = first.distance;
  let near = first.point;
  let step = voxelMm / 2;
  for (let it = 0; it < 40 && step > voxelMm / 64; it++) {
    const away = sub(p, near);
    const l = Math.hypot(away[0], away[1], away[2]);
    if (l < 1e-12) break;
    const q: Vec3 = [p[0] + (step * away[0]) / l, p[1] + (step * away[1]) / l, p[2] + (step * away[2]) / l];
    const c = bvh.closestPoint(q);
    if (c !== null && c.distance > r && bvh.pointInside(q)) {
      p = q;
      r = c.distance;
      near = c.point;
    } else {
      step /= 2;
    }
  }
  return { r, p };
}

// --- Sharp internal corners ------------------------------------------------------

/** Concave creases between two BREP faces (radius-0 internal corners). */
export function findConcaveCreases(
  tris: readonly Tri[],
  faceOfTri: ArrayLike<number>,
  faceRefs: readonly string[],
): MouldingSharpCorner[] {
  const edges = meshEdges(tris as Tri[]);
  const steps = faceFacetSteps(edges, tris as Tri[], faceOfTri);
  const minTurnCos = Math.cos((MIN_CORNER_TURN_DEG * Math.PI) / 180);
  const byPair = new Map<string, MouldingSharpCorner & { best: number }>();
  for (const e of edges.values()) {
    if (e.tris.length !== 2) continue;
    const [i1, i2] = e.tris;
    const f1 = faceOfTri[i1];
    const f2 = faceOfTri[i2];
    if (f1 === f2) continue; // tessellation inside one face
    const t1 = tris[i1];
    const t2 = tris[i2];
    const nd = dot(t1.n, t2.n);
    if (nd > minTurnCos) continue; // shallow seam
    if (isTangentBlend(nd, steps, f1, f2)) continue; // curved face meeting a tangent neighbour
    // Concave: each triangle sits on the outward side of the other's plane.
    if (dot(t2.n, sub(t1.c, e.a)) <= 1e-6) continue;
    const seg = sub(e.b, e.a);
    const l = Math.hypot(seg[0], seg[1], seg[2]);
    const key = f1 < f2 ? `${f1}|${f2}` : `${f2}|${f1}`;
    const mid: Vec3 = [(e.a[0] + e.b[0]) / 2, (e.a[1] + e.b[1]) / 2, (e.a[2] + e.b[2]) / 2];
    const turn = deg(Math.acos(Math.max(-1, Math.min(1, nd))));
    const c = byPair.get(key);
    if (c === undefined) {
      const [lo, hi] = f1 < f2 ? [f1, f2] : [f2, f1];
      byPair.set(key, {
        kind: 'crease', radiusMm: 0, location: mid, best: l,
        faceRefs: [faceRefs[lo] ?? `f${lo}`, faceRefs[hi] ?? `f${hi}`], lengthMm: l, turnDeg: turn,
      });
      continue;
    }
    c.lengthMm = (c.lengthMm ?? 0) + l;
    c.turnDeg = Math.max(c.turnDeg ?? 0, turn);
    if (l > c.best) {
      c.best = l;
      c.location = mid;
    }
  }
  return [...byPair.values()]
    .map(c => {
      const { kind, radiusMm, location, faceRefs: refs, lengthMm, turnDeg } = c;
      return { kind, radiusMm, location, faceRefs: refs, lengthMm, turnDeg };
    })
    .sort((a, b) => (b.lengthMm ?? 0) - (a.lengthMm ?? 0));
}

/** Concave partial cylinders (fillet blends) tighter than minRadiusMm. */
export function findTightConcaveFillets(shape: OcctBackend, minRadiusMm: number): MouldingSharpCorner[] {
  const out: MouldingSharpCorner[] = [];
  for (const c of collectConcaveCylinderClusters(shape)) {
    if (c.coverageRad >= MIN_ANGULAR_COVERAGE_RAD) continue; // full bore: a hole, not a corner
    if (c.radiusMm >= minRadiusMm - 1e-6) continue;
    const mid = (c.tMin + c.tMax) / 2;
    out.push({
      kind: 'tight-fillet',
      radiusMm: c.radiusMm,
      location: [c.loc0[0] + mid * c.dir0[0], c.loc0[1] + mid * c.dir0[1], c.loc0[2] + mid * c.dir0[2]],
    });
  }
  return out.sort((a, b) => a.radiusMm - b.radiusMm);
}

// --- Diagnostics -----------------------------------------------------------------

function mouldingDiagnostics(report: MouldingPartReport, part: string, toWorld: ToWorld): CompilerDiagnostic[] {
  const out: CompilerDiagnostic[] = [];
  const s = report.settings;
  const pull = `pull ${vec(s.pullDirection)}`;

  for (const u of report.undercut.faces.slice(0, MAX_REPORTED)) {
    out.push(emit(
      'dfm.moulding.undercut',
      `dfm.moulding: part '${part}' face ${u.faceRef} has ${a2(u.areaMm2)} mm² of undercut at ` +
        `${xyz(toWorld(u.location))} — material blocks its release along ±${vec(s.pullDirection)}.`,
    ));
  }
  if (report.undercut.faces.length > MAX_REPORTED) {
    out[out.length - 1].message += ` ${report.undercut.faces.length - MAX_REPORTED} more undercut face(s) not shown.`;
  }

  report.draft.insufficient.slice(0, MAX_REPORTED).forEach((f, i) => {
    const straddle = f.straddlesParting
      ? ' The face spans both mould halves; split it at the parting line before drafting.'
      : '';
    const more = i === 0 && report.draft.insufficient.length > MAX_REPORTED
      ? ` ${report.draft.insufficient.length} faces are under-drafted; worst ${MAX_REPORTED} shown.`
      : '';
    out.push(emit(
      'dfm.moulding.draft-insufficient',
      `dfm.moulding: part '${part}' face ${f.faceRef} has ${a2(f.draftDeg)}° draft (< minDraftDeg ` +
        `${s.minDraftDeg}°, ${pull}) at ${xyz(toWorld(f.location))}; ${a1(f.areaMm2)} mm² of face.${more}`,
      straddle,
    ));
  });

  report.walls.violations.forEach((v, i) => {
    const note = i === 0 && report.walls.truncated
      ? ` More thin clusters exist; first ${MAX_REPORTED_CLUSTERS} shown.`
      : '';
    out.push(emit(
      'dfm.moulding.thin-wall',
      `dfm.moulding: part '${part}' has a ${v.thicknessMm.toFixed(3)} mm wall at ${xyz(toWorld(v.location))} ` +
        `(< minWallMm ${s.minWallMm} mm); cluster of ${v.sampleCount} sample(s).${note}`,
    ));
  });

  const t = report.thickest;
  if (t !== null && t.thicknessMm > s.maxWallMm) {
    out.push(emit(
      'dfm.moulding.thick-wall',
      `dfm.moulding: part '${part}' has a ${t.thicknessMm.toFixed(2)} mm thick section (inscribed sphere ` +
        `centred at ${xyz(toWorld(t.location))}) — above maxWallMm ${s.maxWallMm} mm; expect sink and warp there.`,
    ));
  }

  for (const c of report.sharpCorners.slice(0, MAX_REPORTED)) {
    out.push(emit(
      'dfm.moulding.sharp-corner',
      c.kind === 'crease'
        ? `dfm.moulding: part '${part}' has a sharp internal corner (radius 0, ${a1(c.turnDeg ?? 0)}° turn, ` +
            `${a1(c.lengthMm ?? 0)} mm long) between ${c.faceRefs![0]} and ${c.faceRefs![1]} at ` +
            `${xyz(toWorld(c.location))} (< minRadiusMm ${s.minRadiusMm} mm).`
        : `dfm.moulding: part '${part}' has an internal fillet of radius ${a2(c.radiusMm)} mm at ` +
            `${xyz(toWorld(c.location))} (< minRadiusMm ${s.minRadiusMm} mm).`,
    ));
  }
  if (report.sharpCorners.length > MAX_REPORTED) {
    out[out.length - 1].message += ` ${report.sharpCorners.length - MAX_REPORTED} more sharp corner(s) not shown.`;
  }

  for (const what of report.unmeasured) {
    out.push(emit(
      'dfm.moulding.unmeasured',
      `dfm.moulding: part '${part}': could not measure ${what}; this is unknown, not a pass.`,
    ));
  }
  return out;
}

function emit(code: DiagnosticCode, message: string, advice = ''): CompilerDiagnostic {
  const entry = DIAGNOSTIC_REGISTRY[code];
  return {
    target: 'export-occt',
    code,
    severity: entry.defaultSeverity,
    message,
    hint: `${entry.hintTemplate}${advice}`,
    nextAction: entry.nextAction,
  };
}

function a1(v: number): string {
  return v.toFixed(1);
}

function a2(v: number): string {
  return v.toFixed(2);
}

function xyz(p: readonly number[]): string {
  return `(${p.map(c => (Math.abs(c) < 5e-2 ? 0 : c).toFixed(1)).join(', ')})`;
}

function vec(p: readonly number[]): string {
  return `[${p.map(c => Math.round(c * 1000) / 1000 + 0).join(', ')}]`;
}
