// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/fea/supportZone.ts
//
// Which nodes sit next to the EDGE of a fixed face.
//
// A study's `fixed` face is clamped rigidly: every node on it gets all three
// translations set to zero. Where that clamped patch meets free surface the
// linear-elastic solution is singular, so the stress there has no finite
// value to converge to. On a finer mesh the corner element gets smaller and
// the nodal peak climbs, and the solver's error estimate stays high there
// whatever the mesh size. A bolted bore is the usual case. Real bolt clamping
// spreads that load over washer and thread contact, so the clamp-edge value
// is an artifact of the idealisation, not a prediction.
//
// The runner therefore splits the field in two:
//   - SUPPORT-ADJACENT nodes, close to the boundary of the clamped region.
//     Their peak is still reported, as the support peak, but it does not
//     decide the safety factor.
//   - everything else, the GOVERNING field, which the safety factor, the hot
//     spots, the trust estimate and the gate use.
//
// "Boundary of the clamped region" means edges of the fixed faces' surface
// triangles that belong to exactly one fixed triangle. An edge two fixed
// faces share (the seam between the two halves of a bore) is interior to the
// clamp and is not singular.
//
// "Close" is 0.4 x the local wall thickness at that edge. This is the first
// read-out point of the structural hot-spot method (IIW fatigue
// recommendations, 0.4 t from a weld toe): closer than that, a notch or
// singularity dominates and the value depends on the mesh; from there on the
// structural stress converges. The thickness is measured by casting a fan of
// rays from each boundary edge into the solid, from along the fixed face to
// along the free face beside it, and taking the shortest hit: for a bolt bore that is the wall the bore goes through,
// for a clamped beam end it is the beam depth, for a fixed base plate it is
// the plate, at the heel of an L it is the distance to the inside corner.
//
// A radius tied to geometry rather than to the element size is deliberate.
// An exclusion of one element shrinks with the mesh, so on every refinement
// it admits nodes closer to the singular edge and the governing peak keeps
// moving (measured on the cookbook bracket: 33 / 40 / 41 MPa at 2.5 / 1.8 /
// 1.4 mm). A fixed geometric radius gives a field that converges. On a mesh
// coarser than the radius the excluded band holds no interior nodes and the
// governing value stays close to the raw one, which errs high, not low.

/** Exclusion radius as a fraction of the local wall thickness (the IIW
 *  hot-spot 0.4 t read-out point). */
export const SUPPORT_RADIUS_THICKNESS_FRACTION = 0.4;
/** Budget for the thickness ray casts (boundary edges x skin triangles).
 *  Past it, a subset of edges is cast and the rest take the thickness of the
 *  nearest cast edge. */
const RAY_BUDGET = 20_000_000;

type Vec3 = readonly [number, number, number];

/** Boundary edges of a triangle set: edges used by exactly one triangle. */
export function boundaryEdges(
  tris: readonly (readonly [number, number, number])[],
): Array<[number, number]> {
  const count = new Map<string, [number, number, number]>();
  for (const [a, b, c] of tris) {
    for (const [u, v] of [[a, b], [b, c], [c, a]] as const) {
      const lo = Math.min(u, v), hi = Math.max(u, v);
      const k = `${lo}_${hi}`;
      const prev = count.get(k);
      if (prev === undefined) count.set(k, [lo, hi, 1]);
      else prev[2]++;
    }
  }
  const out: Array<[number, number]> = [];
  for (const [lo, hi, n] of count.values()) if (n === 1) out.push([lo, hi]);
  return out;
}

function pointSegmentDistance(p: Vec3, a: Vec3, b: Vec3): number {
  const abx = b[0] - a[0], aby = b[1] - a[1], abz = b[2] - a[2];
  const apx = p[0] - a[0], apy = p[1] - a[1], apz = p[2] - a[2];
  const len2 = abx * abx + aby * aby + abz * abz;
  const t = len2 > 0 ? Math.min(1, Math.max(0, (apx * abx + apy * aby + apz * abz) / len2)) : 0;
  return Math.hypot(apx - t * abx, apy - t * aby, apz - t * abz);
}

type Tri = readonly [number, number, number];

const triKey = (t: readonly number[]): string => [...t].sort((a, b) => a - b).join('_');

function sub(a: Vec3, b: Vec3): [number, number, number] {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}
function cross(a: Vec3, b: Vec3): [number, number, number] {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
function unit(a: Vec3): [number, number, number] {
  const l = Math.hypot(a[0], a[1], a[2]);
  return l > 0 ? [a[0] / l, a[1] / l, a[2] / l] : [0, 0, 0];
}

/** Ray / triangle hit distance (Moller-Trumbore), or Infinity. */
function rayHit(o: Vec3, d: Vec3, a: Vec3, b: Vec3, c: Vec3): number {
  const e1 = sub(b, a), e2 = sub(c, a);
  const p = cross(d, e2);
  const det = dot(e1, p);
  if (Math.abs(det) < 1e-12) return Infinity;
  const inv = 1 / det;
  const s = sub(o, a);
  const u = dot(s, p) * inv;
  if (u < 0 || u > 1) return Infinity;
  const q = cross(s, e1);
  const v = dot(d, q) * inv;
  if (v < 0 || u + v > 1) return Infinity;
  const t = dot(e2, q) * inv;
  return t > 0 ? t : Infinity;
}

export interface SupportZoneMesh {
  nodes: ReadonlyMap<number, Vec3>;
  /** Tet10 elements; only the first four (corner) node ids are read. */
  elements: readonly { nodes: readonly number[] }[];
  /** Every skin triangle of the part (all meshed surfaces). */
  skinTris: readonly Tri[];
}

export interface SupportZone {
  /** Node ids inside the support zone. */
  adjacent: Set<number>;
  /** Boundary edges of the clamped region. */
  boundaryEdgeCount: number;
  /** Range of the exclusion radius over those edges, mm. */
  radiusMm?: { min: number; max: number };
}

/** Unit normal of a skin triangle pointing INTO the solid, found from the
 *  tet the triangle bounds (its fourth corner is on the inside). */
function inwardNormals(mesh: SupportZoneMesh, tris: readonly Tri[]): Map<string, [number, number, number]> {
  const wanted = new Map<string, Tri>();
  for (const t of tris) wanted.set(triKey(t), t);
  const out = new Map<string, [number, number, number]>();
  for (const el of mesh.elements) {
    const c = el.nodes.slice(0, 4);
    for (let skip = 0; skip < 4; skip++) {
      const face = c.filter((_, k) => k !== skip);
      const key = triKey(face);
      const t = wanted.get(key);
      if (t === undefined || out.has(key)) continue;
      const a = mesh.nodes.get(t[0]), b = mesh.nodes.get(t[1]), cc = mesh.nodes.get(t[2]);
      const inside = mesh.nodes.get(c[skip]);
      if (a === undefined || b === undefined || cc === undefined || inside === undefined) continue;
      const n = unit(cross(sub(b, a), sub(cc, a)));
      out.set(key, dot(n, sub(inside, a)) >= 0 ? n : [-n[0], -n[1], -n[2]]);
    }
  }
  return out;
}

interface BoundarySegment {
  a: Vec3;
  b: Vec3;
  /** Inward normals of the fixed triangle and the free triangle on it. */
  dirs: Array<[number, number, number]>;
  /** Element edge length, the fallback scale. */
  h: number;
}

function boundarySegments(mesh: SupportZoneMesh, fixedTris: readonly Tri[]): BoundarySegment[] {
  const fixedKeys = new Set(fixedTris.map(triKey));
  const edges = boundaryEdges(fixedTris);
  const edgeSet = new Set(edges.map(([u, v]) => `${u}_${v}`));
  // Triangles (fixed and free) on each boundary edge.
  const onEdge = new Map<string, { fixed?: Tri; free?: Tri }>();
  const visit = (t: Tri, isFixed: boolean) => {
    for (const [u, v] of [[t[0], t[1]], [t[1], t[2]], [t[2], t[0]]] as const) {
      const k = u < v ? `${u}_${v}` : `${v}_${u}`;
      if (!edgeSet.has(k)) continue;
      const slot = onEdge.get(k) ?? {};
      if (isFixed) slot.fixed = t;
      else if (slot.free === undefined) slot.free = t;
      onEdge.set(k, slot);
    }
  };
  for (const t of fixedTris) visit(t, true);
  for (const t of mesh.skinTris) if (!fixedKeys.has(triKey(t))) visit(t, false);
  const sideTris: Tri[] = [];
  for (const slot of onEdge.values()) {
    if (slot.fixed !== undefined) sideTris.push(slot.fixed);
    if (slot.free !== undefined) sideTris.push(slot.free);
  }
  const normals = inwardNormals(mesh, sideTris);
  const out: BoundarySegment[] = [];
  for (const [u, v] of edges) {
    const a = mesh.nodes.get(u), b = mesh.nodes.get(v);
    if (a === undefined || b === undefined) continue;
    const h = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    if (!(h > 0)) continue;
    const slot = onEdge.get(`${u}_${v}`) ?? {};
    const dirs: Array<[number, number, number]> = [];
    for (const t of [slot.fixed, slot.free]) {
      const n = t !== undefined ? normals.get(triKey(t)) : undefined;
      if (n !== undefined) dirs.push(n);
    }
    out.push({ a, b, dirs, h });
  }
  return out;
}

/** Skin triangle corners as one flat array (9 numbers per triangle). */
function skinCoords(mesh: SupportZoneMesh): Float64Array {
  const out = new Float64Array(mesh.skinTris.length * 9);
  mesh.skinTris.forEach((t, i) => {
    for (let c = 0; c < 3; c++) {
      const p = mesh.nodes.get(t[c]) ?? [NaN, NaN, NaN];
      out[i * 9 + c * 3] = p[0]; out[i * 9 + c * 3 + 1] = p[1]; out[i * 9 + c * 3 + 2] = p[2];
    }
  });
  return out;
}

/** Rays per boundary edge, fanned across the material wedge. */
const FAN_RAYS = 7;

/**
 * Ray directions for one segment: a fan across the material wedge, from
 * "along the free face" to "along the fixed face". Each end is the other
 * face's inward normal with its component along this face's normal removed,
 * so the end rays run PARALLEL to a face instead of grazing into it (a
 * faceted bore's triangles are not exactly perpendicular to the wall face).
 * The fan matters at a heel: where a clamped face meets the underside of a
 * second leg, both end rays run the full length of a leg, and only the
 * diagonal ones find the inside corner. A near-parallel pair (a fixed patch
 * tangent to its surroundings) casts the raw normal.
 */
function rayDirections(dirs: ReadonlyArray<readonly [number, number, number]>): Array<[number, number, number]> {
  if (dirs.length < 2) return dirs.map(d => [d[0], d[1], d[2]]);
  const [n1, n2] = dirs;
  const k = dot(n1, n2);
  if (Math.abs(k) >= 0.95) return [unit([n1[0] + n2[0], n1[1] + n2[1], n1[2] + n2[2]])];
  const a = unit([n1[0] - k * n2[0], n1[1] - k * n2[1], n1[2] - k * n2[2]]);
  const b = unit([n2[0] - k * n1[0], n2[1] - k * n1[1], n2[2] - k * n1[2]]);
  const out: Array<[number, number, number]> = [];
  for (let i = 0; i < FAN_RAYS; i++) {
    const w = i / (FAN_RAYS - 1);
    out.push(unit([(1 - w) * a[0] + w * b[0], (1 - w) * a[1] + w * b[1], (1 - w) * a[2] + w * b[2]]));
  }
  return out;
}

/** Wall thickness at one boundary segment: the shortest of the rays cast
 *  from its midpoint into the solid. Hits nearer than a tenth of the element edge
 *  are the faces the ray starts beside, not the far wall. Infinity when
 *  nothing is hit. */
function thicknessAt(skin: Float64Array, seg: BoundarySegment): number {
  const m: Vec3 = [(seg.a[0] + seg.b[0]) / 2, (seg.a[1] + seg.b[1]) / 2, (seg.a[2] + seg.b[2]) / 2];
  // Start just inside the solid (along the bisector of the two normals).
  const bis = unit(seg.dirs.reduce<[number, number, number]>((acc, d) => [acc[0] + d[0], acc[1] + d[1], acc[2] + d[2]], [0, 0, 0]));
  const eps = seg.h * 1e-2;
  const o: Vec3 = [m[0] + bis[0] * eps, m[1] + bis[1] * eps, m[2] + bis[2] * eps];
  const minHit = seg.h * 0.1;
  let best = Infinity;
  for (const d of rayDirections(seg.dirs)) {
    for (let i = 0; i < skin.length; i += 9) {
      const hit = rayHit(
        o, d,
        [skin[i], skin[i + 1], skin[i + 2]],
        [skin[i + 3], skin[i + 4], skin[i + 5]],
        [skin[i + 6], skin[i + 7], skin[i + 8]],
      );
      if (hit > minHit && hit < best) best = hit;
    }
  }
  return best;
}

/** Exclusion radius per segment: 0.4 x local thickness; the element edge
 *  length when no thickness could be measured. */
function segmentRadii(mesh: SupportZoneMesh, segs: readonly BoundarySegment[]): number[] {
  const stride = Math.max(1, Math.ceil((segs.length * mesh.skinTris.length * FAN_RAYS) / RAY_BUDGET));
  const mid = (s: BoundarySegment): Vec3 => [(s.a[0] + s.b[0]) / 2, (s.a[1] + s.b[1]) / 2, (s.a[2] + s.b[2]) / 2];
  const skin = skinCoords(mesh);
  const cast: Array<{ mid: Vec3; t: number }> = [];
  for (let i = 0; i < segs.length; i += stride) cast.push({ mid: mid(segs[i]), t: thicknessAt(skin, segs[i]) });
  return segs.map((s, i) => {
    let t = Infinity;
    if (stride === 1) {
      t = cast[i].t;
    } else {
      const m = mid(s);
      let bestD = Infinity;
      for (const c of cast) {
        const d = Math.hypot(c.mid[0] - m[0], c.mid[1] - m[1], c.mid[2] - m[2]);
        if (d < bestD) { bestD = d; t = c.t; }
      }
    }
    return Number.isFinite(t) ? SUPPORT_RADIUS_THICKNESS_FRACTION * t : s.h;
  });
}

/**
 * The support zone of a clamped region: node ids within 0.4 x the local wall
 * thickness of the boundary of the fixed region described by `fixedTris`
 * (corner-node triangles of every fixed surface). A uniform hash grid keeps
 * the distance pass near-linear in the node count.
 *
 * Empty when the fixed region has no boundary (a closed fixed surface) or no
 * triangles.
 */
export function supportZone(mesh: SupportZoneMesh, fixedTris: readonly Tri[]): SupportZone {
  const adjacent = new Set<number>();
  const segs = boundarySegments(mesh, fixedTris);
  if (segs.length === 0) return { adjacent, boundaryEdgeCount: 0 };
  const radii = segmentRadii(mesh, segs);

  const cell = Math.max(...radii);
  const keyOf = (i: number, j: number, k: number) => `${i},${j},${k}`;
  const grid = new Map<string, number[]>();
  for (const [id, p] of mesh.nodes) {
    const k = keyOf(Math.floor(p[0] / cell), Math.floor(p[1] / cell), Math.floor(p[2] / cell));
    const bucket = grid.get(k);
    if (bucket === undefined) grid.set(k, [id]);
    else bucket.push(id);
  }

  segs.forEach(({ a, b }, s) => {
    const r = radii[s];
    const lo = [0, 1, 2].map(ax => Math.floor((Math.min(a[ax], b[ax]) - r) / cell));
    const hi = [0, 1, 2].map(ax => Math.floor((Math.max(a[ax], b[ax]) + r) / cell));
    for (let i = lo[0]; i <= hi[0]; i++) {
      for (let j = lo[1]; j <= hi[1]; j++) {
        for (let k = lo[2]; k <= hi[2]; k++) {
          const bucket = grid.get(keyOf(i, j, k));
          if (bucket === undefined) continue;
          for (const id of bucket) {
            if (adjacent.has(id)) continue;
            if (pointSegmentDistance(mesh.nodes.get(id)!, a, b) <= r) adjacent.add(id);
          }
        }
      }
    }
  });
  return {
    adjacent,
    boundaryEdgeCount: segs.length,
    radiusMm: { min: Math.min(...radii), max: Math.max(...radii) },
  };
}
