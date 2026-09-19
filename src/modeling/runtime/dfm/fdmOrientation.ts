// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/runtime/dfm/fdmOrientation.ts
//
// Orientation-dependent half of the FDM printability check, as pure
// geometry over a face-tagged triangle mesh (no OCCT): overhang regions and
// their support verdict, bridges, bed contact, tip risk, bed fit, and the
// six-orientation ranking. The OCCT-facing half (meshing, face refs, holes,
// walls, diagnostics) lives in fdmCheck.ts.
//
// Frame: every analysis runs in a BUILD FRAME (u, v, w) obtained by rotating
// the part so the build direction b becomes +w. For the six axis-aligned
// directions the rotation is the exact `.rotateX/Y(±90|180)` the report
// recommends, so the reported extents are the extents the slicer would see.
//
// Overhang method:
//   1. A triangle is STEEP when its outward normal points more than
//      maxOverhangDeg below horizontal: -n·b > sin(maxOverhangDeg).
//      Triangles resting on the bed plane (facing down, every vertex within
//      BED_TOL_MM of the lowest point) are bed contact, never overhang.
//   2. Steep triangles cluster into regions by shared mesh edges.
//   3. Each region boundary edge is ANCHORED when the surface on its other
//      side descends from it (material printed in earlier layers holds the
//      extrusion's end) or when it lies on the bed; otherwise it is FREE.
//   4. Region verdict, in order:
//      - BRIDGED: some in-plane direction d exists along which every sampled
//        chord through the region ends on anchored edges at BOTH ends. The
//        span is min over directions of the longest such chord; the region
//        prints without support when span <= maxBridgeMm.
//      - FIRST LAYER: anchored, and no vertex of the region rises more than
//        one nozzle diameter (two standard layers) above the bed — a small
//        bottom-edge fillet is laid down in the squished first layers.
//      - SHORT REACH: not bridged, but no sampled point lies further than one
//        nozzle width from an anchored edge (small chamfers and fillets away
//        from the bed) — the extrusion overhangs its support by a line width.
//      - UNSUPPORTED: everything else, including floating regions with no
//        anchored edge at all.
//   Areas are exact for planar regions (triangle areas of a planar face sum
//   to the face area); chords and reach are SAMPLED (triangle centroids and
//   near-vertex points, plus free-edge endpoints for reach), so curved-region
//   spans are tessellation-bounded.

export type Vec3 = [number, number, number];

/** A welded, consistently outward-wound triangle mesh whose triangles carry
 *  the index of the BREP face they came from. */
export interface FaceTaggedMesh {
  vertices: ArrayLike<number>;
  triangles: ArrayLike<number>;
  /** Per triangle: index into `faceRefs`. */
  faceOfTri: ArrayLike<number>;
  /** Per BREP face: an `@kc[...]` ref (or other stable label). */
  faceRefs: readonly string[];
}

export type FdmAxisLabel = '+z' | '-z' | '+x' | '-x' | '+y' | '-y';

/** The rotation that places the part so its build direction points up. */
export interface FdmRotation {
  /** Unit rotation axis through the origin. */
  axis: Vec3;
  /** Right-handed angle about `axis`, degrees (0 = already upright). */
  deg: number;
  /** The Shape call that applies it, e.g. `.rotateX(90)`; '' for identity. */
  apply: string;
}

export interface FdmSettings {
  nozzleMm: number;
  maxOverhangDeg: number;
  maxBridgeMm: number;
  /** Bed extents of the selected printer profile, mm. */
  bedSizeMm: { x: number; y: number; z: number };
}

export type OverhangStatus = 'unsupported' | 'bridged' | 'first-layer' | 'short-reach';

export interface FdmOverhangRegion {
  status: OverhangStatus;
  areaMm2: number;
  /** Steepest triangle in the region, degrees from vertical. */
  maxOverhangDeg: number;
  /** Every triangle within 1° of a flat, downward ceiling. */
  horizontal: boolean;
  /** Longest chord along the best bridging direction (bridged regions and
   *  anchored-both-ends regions only). */
  spanMm?: number;
  /** Furthest sampled point from an anchored edge (non-bridged regions;
   *  Infinity when nothing anchors the region). */
  reachMm?: number;
  /** Part-local axis-aligned bounds of the region. */
  bboxMin: Vec3;
  bboxMax: Vec3;
  /** Face contributing the most area to the region. */
  faceRef?: string;
}

export interface FdmBedContact {
  /** Area of downward faces lying on the bed plane, mm². */
  areaMm2: number;
  /** Convex-hull area of the whole part projected onto the bed, mm². */
  footprintMm2: number;
  /** areaMm2 / footprintMm2 (0 when the footprint is degenerate). */
  ratio: number;
  /** Minimum width of the contact patch's convex hull, mm (0 = no contact). */
  minBaseMm: number;
  /** Part height above the bed, mm. */
  heightMm: number;
  /** heightMm / minBaseMm (Infinity with no contact). */
  tipRatio: number;
}

export interface FdmOrientationResult {
  /** Unit build direction in the part-local frame. */
  buildDirection: Vec3;
  /** Axis token when the direction is axis-aligned. */
  label?: FdmAxisLabel;
  rotation: FdmRotation;
  /** Extents in the printer frame: x/y across the bed, z up. */
  sizeMm: { x: number; y: number; z: number };
  fitsBed: boolean;
  /** Total area of unsupported regions (including over-long bridges). */
  unsupportedAreaMm2: number;
  /** Every steep region, largest first. */
  overhangs: FdmOverhangRegion[];
  bedContact: FdmBedContact;
  bedContactLow: boolean;
  tipRisk: boolean;
}

/** Bed-contact ratio below which adhesion is flagged. */
export const BED_CONTACT_MIN_RATIO = 0.1;
/** Height / minimum contact width above which the part may tip or wobble. */
export const TIP_RATIO_MAX = 8;
/** Vertices this close to the lowest point lie on the bed. */
export const BED_TOL_MM = 0.01;

/** Areas equal for ranking and advice: within max(1 mm², 1 %). Keeps
 *  tessellation noise on curved parts from recommending a rotation that
 *  changes nothing. */
export function sameAreaMm2(a: number, b: number): boolean {
  return Math.abs(a - b) <= Math.max(1, 0.01 * Math.max(a, b));
}

/** Lengths equal for ranking: within max(0.1 mm, 0.5 %). */
function sameLengthMm(a: number, b: number): boolean {
  return Math.abs(a - b) <= Math.max(0.1, 0.005 * Math.max(a, b));
}

const BED_NORMAL_COS = Math.cos((0.5 * Math.PI) / 180);
const HORIZONTAL_COS = Math.cos((1 * Math.PI) / 180);
const AREA_EPS = 1e-12;
const ANGLE_EPS = 1e-9;
const MAX_SAMPLES = 256;
const UNIFORM_DIRECTIONS = 36;
const ANCHOR_DIRECTIONS = 8;

// --- Build frames -----------------------------------------------------------

type Mat3 = [Vec3, Vec3, Vec3];

const AXIS_FRAMES: Record<FdmAxisLabel, { dir: Vec3; rows: Mat3; rotation: FdmRotation }> = {
  '+z': { dir: [0, 0, 1], rows: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], rotation: { axis: [0, 0, 1], deg: 0, apply: '' } },
  '-z': { dir: [0, 0, -1], rows: [[1, 0, 0], [0, -1, 0], [0, 0, -1]], rotation: { axis: [1, 0, 0], deg: 180, apply: '.rotateX(180)' } },
  '+x': { dir: [1, 0, 0], rows: [[0, 0, -1], [0, 1, 0], [1, 0, 0]], rotation: { axis: [0, 1, 0], deg: -90, apply: '.rotateY(-90)' } },
  '-x': { dir: [-1, 0, 0], rows: [[0, 0, 1], [0, 1, 0], [-1, 0, 0]], rotation: { axis: [0, 1, 0], deg: 90, apply: '.rotateY(90)' } },
  '+y': { dir: [0, 1, 0], rows: [[1, 0, 0], [0, 0, -1], [0, 1, 0]], rotation: { axis: [1, 0, 0], deg: 90, apply: '.rotateX(90)' } },
  '-y': { dir: [0, -1, 0], rows: [[1, 0, 0], [0, 0, 1], [0, -1, 0]], rotation: { axis: [1, 0, 0], deg: -90, apply: '.rotateX(-90)' } },
};

/** Canonical orientation order — also the final ranking tie-break. */
export const FDM_AXIS_LABELS: readonly FdmAxisLabel[] = ['+z', '-z', '+x', '-x', '+y', '-y'];

/** Axis token for a unit vector, when it is axis-aligned. */
export function axisLabelOf(dir: Vec3): FdmAxisLabel | undefined {
  for (const label of FDM_AXIS_LABELS) {
    const d = AXIS_FRAMES[label].dir;
    if (Math.abs(dir[0] - d[0]) < 1e-9 && Math.abs(dir[1] - d[1]) < 1e-9 && Math.abs(dir[2] - d[2]) < 1e-9) {
      return label;
    }
  }
  return undefined;
}

/** The rotation matrix (rows = printer-frame axes in part-local coords) and
 *  its authoring form for a build direction. Axis-aligned directions use the
 *  exact cardinal rotations; anything else the minimal Rodrigues rotation. */
export function buildFrameFor(dir: Vec3): { rows: Mat3; rotation: FdmRotation; label?: FdmAxisLabel } {
  const label = axisLabelOf(dir);
  if (label !== undefined) {
    const f = AXIS_FRAMES[label];
    return { rows: f.rows, rotation: f.rotation, label };
  }
  // Rotation about k = b × z by θ = acos(b·z) maps b onto +z.
  const kx = dir[1];
  const ky = -dir[0];
  const s = Math.hypot(kx, ky);
  const c = dir[2];
  const ux = kx / s;
  const uy = ky / s;
  const t = 1 - c;
  const rows: Mat3 = [
    [t * ux * ux + c, t * ux * uy, s * uy],
    [t * ux * uy, t * uy * uy + c, -s * ux],
    [-s * uy, s * ux, c],
  ];
  const deg = (Math.atan2(s, c) * 180) / Math.PI;
  return {
    rows,
    rotation: { axis: [ux, uy, 0], deg, apply: `.rotate([${round6(ux)}, ${round6(uy)}, 0], ${round6(deg)})` },
  };
}

function round6(v: number): number {
  return Math.round(v * 1e6) / 1e6 + 0;
}

// --- Orientation-independent preparation ------------------------------------

export interface PreparedFdmMesh {
  mesh: FaceTaggedMesh;
  triCount: number;
  /** Unit outward normals, 3 per triangle (NaN-free; degenerate → 0). */
  normals: Float64Array;
  areas: Float64Array;
  /** Per triangle, per edge (ab, bc, ca): the neighbouring triangle across
   *  that edge, or -1 for an open / non-manifold edge. */
  neighbors: Int32Array;
}

/** Normals, areas, and edge adjacency — shared by every orientation. */
export function prepareFdmMesh(mesh: FaceTaggedMesh): PreparedFdmMesh {
  const { vertices: V, triangles: T } = mesh;
  const triCount = (T.length / 3) | 0;
  const nVerts = (V.length / 3) | 0;
  const normals = new Float64Array(triCount * 3);
  const areas = new Float64Array(triCount);
  for (let i = 0; i < triCount; i++) {
    const a = T[3 * i] * 3, b = T[3 * i + 1] * 3, c = T[3 * i + 2] * 3;
    const e1x = V[b] - V[a], e1y = V[b + 1] - V[a + 1], e1z = V[b + 2] - V[a + 2];
    const e2x = V[c] - V[a], e2y = V[c + 1] - V[a + 1], e2z = V[c + 2] - V[a + 2];
    const nx = e1y * e2z - e1z * e2y;
    const ny = e1z * e2x - e1x * e2z;
    const nz = e1x * e2y - e1y * e2x;
    const len = Math.hypot(nx, ny, nz);
    areas[i] = len / 2;
    if (len / 2 > AREA_EPS) {
      normals[3 * i] = nx / len;
      normals[3 * i + 1] = ny / len;
      normals[3 * i + 2] = nz / len;
    }
  }
  const edgeTris = new Map<number, number[]>();
  const keyOf = (p: number, q: number): number => (p < q ? p * nVerts + q : q * nVerts + p);
  for (let i = 0; i < triCount; i++) {
    for (let k = 0; k < 3; k++) {
      const key = keyOf(T[3 * i + k], T[3 * i + ((k + 1) % 3)]);
      const list = edgeTris.get(key);
      if (list === undefined) edgeTris.set(key, [i]);
      else list.push(i);
    }
  }
  const neighbors = new Int32Array(triCount * 3).fill(-1);
  for (let i = 0; i < triCount; i++) {
    for (let k = 0; k < 3; k++) {
      const list = edgeTris.get(keyOf(T[3 * i + k], T[3 * i + ((k + 1) % 3)]))!;
      if (list.length === 2) neighbors[3 * i + k] = list[0] === i ? list[1] : list[0];
    }
  }
  return { mesh, triCount, normals, areas, neighbors };
}

// --- Single orientation -------------------------------------------------------

interface Seg {
  ax: number; ay: number; bx: number; by: number;
  anchored: boolean;
}

interface BuildFrameProjection {
  pu: Float64Array;
  pv: Float64Array;
  pw: Float64Array;
  wMin: number;
  sizeMm: { x: number; y: number; z: number };
}

/** Printer-frame coordinates of every vertex, plus the frame extents. */
function projectBuildFrameVertices(
  V: ArrayLike<number>,
  nVerts: number,
  ru: Vec3,
  rv: Vec3,
  rw: Vec3,
): BuildFrameProjection {
  const pu = new Float64Array(nVerts);
  const pv = new Float64Array(nVerts);
  const pw = new Float64Array(nVerts);
  let uMin = Infinity, uMax = -Infinity, vMin = Infinity, vMax = -Infinity, wMin = Infinity, wMax = -Infinity;
  for (let i = 0; i < nVerts; i++) {
    const x = V[3 * i], y = V[3 * i + 1], z = V[3 * i + 2];
    const u = ru[0] * x + ru[1] * y + ru[2] * z;
    const v = rv[0] * x + rv[1] * y + rv[2] * z;
    const w = rw[0] * x + rw[1] * y + rw[2] * z;
    pu[i] = u; pv[i] = v; pw[i] = w;
    if (u < uMin) uMin = u; if (u > uMax) uMax = u;
    if (v < vMin) vMin = v; if (v > vMax) vMax = v;
    if (w < wMin) wMin = w; if (w > wMax) wMax = w;
  }
  if (nVerts === 0) { uMin = uMax = vMin = vMax = wMin = wMax = 0; }
  const sizeMm = { x: uMax - uMin, y: vMax - vMin, z: wMax - wMin };
  return { pu, pv, pw, wMin, sizeMm };
}

interface TriangleClassification {
  isBed: Uint8Array;
  isSteep: Uint8Array;
  contactArea: number;
  contactPts: number[];
}

/** Bed-contact and steep triangles, plus the coordinates of the contact patch. */
function classifyBuildTriangles(
  T: ArrayLike<number>,
  triCount: number,
  areas: Float64Array,
  pu: Float64Array,
  pv: Float64Array,
  downOf: (i: number) => number,
  onBed: (vi: number) => boolean,
  steepSin: number,
): TriangleClassification {
  const isBed = new Uint8Array(triCount);
  const isSteep = new Uint8Array(triCount);
  let contactArea = 0;
  const contactPts: number[] = [];
  for (let i = 0; i < triCount; i++) {
    if (areas[i] <= AREA_EPS) continue;
    const down = downOf(i);
    const a = T[3 * i], b = T[3 * i + 1], c = T[3 * i + 2];
    if (down > BED_NORMAL_COS && onBed(a) && onBed(b) && onBed(c)) {
      isBed[i] = 1;
      contactArea += areas[i];
      contactPts.push(pu[a], pv[a], pu[b], pv[b], pu[c], pv[c]);
      continue;
    }
    if (down > steepSin) isSteep[i] = 1;
  }
  return { isBed, isSteep, contactArea, contactPts };
}

/** Footprint, contact hull, and the adhesion/tip ratios for one orientation. */
function measureBedContact(
  pu: Float64Array,
  pv: Float64Array,
  nVerts: number,
  contactArea: number,
  contactPts: number[],
  heightMm: number,
): { bedContact: FdmBedContact; ratio: number; tipRatio: number } {
  const allPts: number[] = new Array(nVerts * 2);
  for (let i = 0; i < nVerts; i++) { allPts[2 * i] = pu[i]; allPts[2 * i + 1] = pv[i]; }
  const footprintMm2 = polygonArea(convexHull(allPts));
  const contactHull = convexHull(contactPts);
  const minBaseMm = contactArea > 0 ? hullMinWidth(contactHull) : 0;
  const ratio = footprintMm2 > AREA_EPS ? contactArea / footprintMm2 : 0;
  const tipRatio = minBaseMm > 0 ? heightMm / minBaseMm : Infinity;
  const bedContact: FdmBedContact = { areaMm2: contactArea, footprintMm2, ratio, minBaseMm, heightMm, tipRatio };
  return { bedContact, ratio, tipRatio };
}

/** Seed-fill steep triangles into edge-connected regions, in discovery order. */
function forEachSteepRegion(
  triCount: number,
  isSteep: Uint8Array,
  neighbors: Int32Array,
  regionOf: Int32Array,
  emit: (tris: number[], id: number) => void,
): void {
  let regionId = 0;
  for (let seed = 0; seed < triCount; seed++) {
    if (!isSteep[seed] || regionOf[seed] !== -1) continue;
    const tris: number[] = [seed];
    regionOf[seed] = regionId;
    for (let q = 0; q < tris.length; q++) {
      const t = tris[q];
      for (let k = 0; k < 3; k++) {
        const n = neighbors[3 * t + k];
        if (n >= 0 && isSteep[n] && regionOf[n] === -1) {
          regionOf[n] = regionId;
          tris.push(n);
        }
      }
    }
    emit(tris, regionId);
    regionId++;
  }
}

/** Analyze one build direction (unit vector, part-local frame). */
export function analyzeBuildDirection(
  prep: PreparedFdmMesh,
  buildDirection: Vec3,
  settings: FdmSettings,
): FdmOrientationResult {
  const { mesh, triCount, normals, areas, neighbors } = prep;
  const V = mesh.vertices;
  const T = mesh.triangles;
  const nVerts = (V.length / 3) | 0;
  const frame = buildFrameFor(buildDirection);
  const [ru, rv, rw] = frame.rows;

  // Printer-frame coordinates of every vertex.
  const { pu, pv, pw, wMin, sizeMm } = projectBuildFrameVertices(V, nVerts, ru, rv, rw);
  const onBed = (vi: number): boolean => pw[vi] - wMin <= BED_TOL_MM;

  // Classify triangles.
  const steepSin = Math.sin((settings.maxOverhangDeg * Math.PI) / 180) + ANGLE_EPS;
  const downOf = (i: number): number =>
    -(normals[3 * i] * rw[0] + normals[3 * i + 1] * rw[1] + normals[3 * i + 2] * rw[2]);
  const { isBed, isSteep, contactArea, contactPts } =
    classifyBuildTriangles(T, triCount, areas, pu, pv, downOf, onBed, steepSin);

  // Bed contact + tip risk.
  const { bedContact, ratio, tipRatio } =
    measureBedContact(pu, pv, nVerts, contactArea, contactPts, sizeMm.z);

  // Overhang regions.
  const regionOf = new Int32Array(triCount).fill(-1);
  const overhangs: FdmOverhangRegion[] = [];
  forEachSteepRegion(triCount, isSteep, neighbors, regionOf, (tris, regionId) => {
    overhangs.push(analyzeRegion(tris, regionId));
  });

  function analyzeRegion(tris: number[], id: number): FdmOverhangRegion {
    let area = 0;
    let maxDown = 0;
    let maxRise = 0;
    let horizontal = true;
    const faceArea = new Map<number, number>();
    const bboxMin: Vec3 = [Infinity, Infinity, Infinity];
    const bboxMax: Vec3 = [-Infinity, -Infinity, -Infinity];
    const segs: Seg[] = [];
    const samples: number[] = [];
    const stride = Math.max(1, Math.ceil((tris.length * 4) / MAX_SAMPLES));
    tris.forEach((t, idx) => {
      area += areas[t];
      const down = downOf(t);
      if (down > maxDown) maxDown = down;
      if (down < HORIZONTAL_COS) horizontal = false;
      const f = mesh.faceOfTri[t];
      faceArea.set(f, (faceArea.get(f) ?? 0) + areas[t]);
      const vi = [T[3 * t], T[3 * t + 1], T[3 * t + 2]];
      for (const v of vi) {
        if (pw[v] - wMin > maxRise) maxRise = pw[v] - wMin;
        for (let d = 0; d < 3; d++) {
          const c = V[3 * v + d];
          if (c < bboxMin[d]) bboxMin[d] = c;
          if (c > bboxMax[d]) bboxMax[d] = c;
        }
      }
      const cu = (pu[vi[0]] + pu[vi[1]] + pu[vi[2]]) / 3;
      const cv = (pv[vi[0]] + pv[vi[1]] + pv[vi[2]]) / 3;
      if (idx % stride === 0) {
        samples.push(cu, cv);
        for (const v of vi) samples.push(0.75 * pu[v] + 0.25 * cu, 0.75 * pv[v] + 0.25 * cv);
      }
      for (let k = 0; k < 3; k++) {
        const n = neighbors[3 * t + k];
        if (n >= 0 && regionOf[n] === id) continue;
        const a = vi[k];
        const b = vi[(k + 1) % 3];
        segs.push({ ax: pu[a], ay: pv[a], bx: pu[b], by: pv[b], anchored: edgeAnchored(a, b, n) });
      }
    });

    let faceRef: string | undefined;
    let best = -1;
    for (const [f, fa] of [...faceArea.entries()].sort((p, q) => p[0] - q[0])) {
      if (fa > best) { best = fa; faceRef = mesh.faceRefs[f]; }
    }
    const region: FdmOverhangRegion = {
      status: 'unsupported',
      areaMm2: area,
      maxOverhangDeg: (Math.asin(Math.min(1, maxDown)) * 180) / Math.PI,
      horizontal,
      bboxMin,
      bboxMax,
      ...(faceRef !== undefined ? { faceRef } : {}),
    };

    const anchored = segs.filter(s => s.anchored);
    if (anchored.length === 0) {
      region.reachMm = Infinity;
      return region;
    }
    if (maxRise <= settings.nozzleMm + ANGLE_EPS) {
      region.status = 'first-layer';
      return region;
    }
    const span = bridgeSpan(samples, segs, anchored);
    if (Number.isFinite(span)) {
      region.spanMm = span;
      region.status = span <= settings.maxBridgeMm + ANGLE_EPS ? 'bridged' : 'unsupported';
      return region;
    }
    const reachPts = samples.slice();
    for (const s of segs) if (!s.anchored) reachPts.push(s.ax, s.ay, s.bx, s.by);
    let reach = 0;
    for (let i = 0; i < reachPts.length; i += 2) {
      reach = Math.max(reach, distanceToSegments(reachPts[i], reachPts[i + 1], anchored));
    }
    region.reachMm = reach;
    region.status = reach <= settings.nozzleMm + ANGLE_EPS ? 'short-reach' : 'unsupported';
    return region;
  }

  /** Anchored when the edge lies on the bed, borders bed contact, or the
   *  surface across it descends from the edge. */
  function edgeAnchored(a: number, b: number, n: number): boolean {
    if (onBed(a) && onBed(b)) return true;
    if (n < 0) return false;
    if (isBed[n]) return true;
    const na = T[3 * n], nb = T[3 * n + 1], nc = T[3 * n + 2];
    const c = na !== a && na !== b ? na : nb !== a && nb !== b ? nb : nc;
    const ex = V[3 * b] - V[3 * a], ey = V[3 * b + 1] - V[3 * a + 1], ez = V[3 * b + 2] - V[3 * a + 2];
    const el = Math.hypot(ex, ey, ez);
    if (el <= 0) return false;
    const cx = V[3 * c] - V[3 * a], cy = V[3 * c + 1] - V[3 * a + 1], cz = V[3 * c + 2] - V[3 * a + 2];
    const along = (cx * ex + cy * ey + cz * ez) / (el * el);
    const dx = cx - along * ex, dy = cy - along * ey, dz = cz - along * ez;
    const dl = Math.hypot(dx, dy, dz);
    const dw = dx * rw[0] + dy * rw[1] + dz * rw[2];
    return dl > 0 && dw < -1e-3 * dl;
  }

  overhangs.sort((p, q) => q.areaMm2 - p.areaMm2);
  const unsupportedAreaMm2 = overhangs
    .filter(r => r.status === 'unsupported')
    .reduce((s, r) => s + r.areaMm2, 0);
  const fitsBed = !(sizeMm.x > settings.bedSizeMm.x || sizeMm.y > settings.bedSizeMm.y || sizeMm.z > settings.bedSizeMm.z);

  return {
    buildDirection: [...buildDirection] as Vec3,
    ...(frame.label !== undefined ? { label: frame.label } : {}),
    rotation: frame.rotation,
    sizeMm,
    fitsBed,
    unsupportedAreaMm2,
    overhangs,
    bedContact,
    bedContactLow: ratio < BED_CONTACT_MIN_RATIO,
    tipRisk: contactArea > 0 && tipRatio > TIP_RATIO_MAX,
  };
}

// --- Ranking ------------------------------------------------------------------

/**
 * Analyze the six axis-aligned build directions and rank them, best first:
 * fits the bed → least unsupported area (ties within max(1 mm², 1 %)) →
 * adequate bed contact → lowest height (ties within max(0.1 mm, 0.5 %)) →
 * most bed contact (area tie rule) → canonical order.
 * Deterministic for a given mesh.
 */
export function rankOrientations(prep: PreparedFdmMesh, settings: FdmSettings): FdmOrientationResult[] {
  const results = FDM_AXIS_LABELS.map(label => analyzeBuildDirection(prep, AXIS_FRAMES[label].dir, settings));
  const order = new Map(FDM_AXIS_LABELS.map((l, i) => [l, i]));
  return results.slice().sort((a, b) => {
    if (a.fitsBed !== b.fitsBed) return a.fitsBed ? -1 : 1;
    const ua = a.unsupportedAreaMm2, ub = b.unsupportedAreaMm2;
    if (!sameAreaMm2(ua, ub)) return ua - ub;
    if (a.bedContactLow !== b.bedContactLow) return a.bedContactLow ? 1 : -1;
    if (!sameLengthMm(a.sizeMm.z, b.sizeMm.z)) return a.sizeMm.z - b.sizeMm.z;
    if (!sameAreaMm2(a.bedContact.areaMm2, b.bedContact.areaMm2)) {
      return b.bedContact.areaMm2 - a.bedContact.areaMm2;
    }
    return order.get(a.label!)! - order.get(b.label!)!;
  });
}

// --- 2D helpers -----------------------------------------------------------------

/** Min over candidate directions of the longest anchored-both-ends chord;
 *  Infinity when no direction bridges every sample. */
function bridgeSpan(samples: number[], segs: Seg[], anchored: Seg[]): number {
  const angles: number[] = [];
  for (let k = 0; k < UNIFORM_DIRECTIONS; k++) angles.push((k * Math.PI) / UNIFORM_DIRECTIONS);
  const longest = anchored
    .map(s => ({ s, len: Math.hypot(s.bx - s.ax, s.by - s.ay) }))
    .sort((p, q) => q.len - p.len)
    .slice(0, ANCHOR_DIRECTIONS);
  for (const { s } of longest) {
    let a = Math.atan2(s.by - s.ay, s.bx - s.ax) + Math.PI / 2;
    a = ((a % Math.PI) + Math.PI) % Math.PI;
    angles.push(a);
  }
  const unique = [...new Set(angles.map(a => Math.round(a * 1e9) / 1e9))].sort((p, q) => p - q);

  let best = Infinity;
  for (const angle of unique) {
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    let longestChord = 0;
    let ok = true;
    for (let i = 0; i < samples.length && ok; i += 2) {
      const chord = anchoredChord(samples[i], samples[i + 1], dx, dy, segs);
      if (chord === undefined) ok = false;
      else if (chord > longestChord) {
        longestChord = chord;
        if (longestChord >= best) ok = false;
      }
    }
    if (ok) best = longestChord;
  }
  return best;
}

/** Chord through (px, py) along ±(dx, dy) to the nearest boundary crossing
 *  each way; its length when both ends are anchored, else undefined. Ties
 *  between an anchored and a free crossing resolve to free. */
function anchoredChord(px: number, py: number, dx: number, dy: number, segs: Seg[]): number | undefined {
  let fwd = Infinity, fwdAnchored = false;
  let back = Infinity, backAnchored = false;
  for (const s of segs) {
    const ex = s.bx - s.ax, ey = s.by - s.ay;
    const denom = dx * ey - dy * ex;
    if (Math.abs(denom) < 1e-12) continue;
    const wx = s.ax - px, wy = s.ay - py;
    const t = (wx * ey - wy * ex) / denom;
    const u = (wx * dy - wy * dx) / denom;
    if (u < -1e-9 || u > 1 + 1e-9) continue;
    if (t > 1e-9) {
      if (t < fwd - 1e-7) { fwd = t; fwdAnchored = s.anchored; }
      else if (t <= fwd + 1e-7) fwdAnchored = fwdAnchored && s.anchored;
    } else if (t < -1e-9) {
      const bt = -t;
      if (bt < back - 1e-7) { back = bt; backAnchored = s.anchored; }
      else if (bt <= back + 1e-7) backAnchored = backAnchored && s.anchored;
    }
  }
  if (!Number.isFinite(fwd) || !Number.isFinite(back) || !fwdAnchored || !backAnchored) return undefined;
  return fwd + back;
}

function distanceToSegments(px: number, py: number, segs: Seg[]): number {
  let best = Infinity;
  for (const s of segs) {
    const ex = s.bx - s.ax, ey = s.by - s.ay;
    const l2 = ex * ex + ey * ey;
    let t = l2 > 0 ? ((px - s.ax) * ex + (py - s.ay) * ey) / l2 : 0;
    t = Math.max(0, Math.min(1, t));
    const d = Math.hypot(px - (s.ax + t * ex), py - (s.ay + t * ey));
    if (d < best) best = d;
  }
  return best;
}

/** Andrew's monotone chain over a flat [x0, y0, x1, y1, ...] list; returns the
 *  hull as a flat CCW list without the closing point. */
export function convexHull(flat: readonly number[]): number[] {
  const pts: [number, number][] = [];
  for (let i = 0; i + 1 < flat.length; i += 2) pts.push([flat[i], flat[i + 1]]);
  pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (pts.length < 3) return pts.flat();
  const cross = (o: [number, number], a: [number, number], b: [number, number]): number =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: [number, number][] = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 1e-12) lower.pop();
    lower.push(p);
  }
  const upper: [number, number][] = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 1e-12) upper.pop();
    upper.push(p);
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)].flat();
}

export function polygonArea(flat: readonly number[]): number {
  let s = 0;
  const n = flat.length / 2;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    s += flat[2 * i] * flat[2 * j + 1] - flat[2 * j] * flat[2 * i + 1];
  }
  return Math.abs(s) / 2;
}

/** Minimum caliper width of a convex polygon (flat CCW list). */
export function hullMinWidth(flat: readonly number[]): number {
  const n = flat.length / 2;
  if (n < 3) return 0;
  let best = Infinity;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const ex = flat[2 * j] - flat[2 * i];
    const ey = flat[2 * j + 1] - flat[2 * i + 1];
    const len = Math.hypot(ex, ey);
    if (len <= 0) continue;
    let far = 0;
    for (let k = 0; k < n; k++) {
      const d = Math.abs((flat[2 * k] - flat[2 * i]) * ey - (flat[2 * k + 1] - flat[2 * i + 1]) * ex) / len;
      if (d > far) far = d;
    }
    if (far < best) best = far;
  }
  return Number.isFinite(best) ? best : 0;
}
