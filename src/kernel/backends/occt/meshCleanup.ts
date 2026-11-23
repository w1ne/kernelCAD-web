// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/occt/meshCleanup.ts
//
// Geometry-preserving cleanup of a closed export mesh.
//
// OCCT's tessellation of a correct solid has two kinds of triangle that are
// valid in exact arithmetic but trip float-precision mesh checks such as the
// triangle-triangle test behind open3d's `is_watertight()`:
//
//  1. Rows of coplanar triangles. Cylinders, cones and other ruled faces are
//     often split along their straight rulings, so one flat strip between
//     two rulings holds several triangles that share no vertex. After the
//     float32 rounding of an STL their planes differ by rounding noise, and a
//     float intersection test reports the pair as crossing.
//  2. Caps: a triangle whose third vertex lies within a fraction of a micron
//     of its longest edge (common on B-spline and loft faces). A near-zero
//     normal makes every plane-side test round to zero, and the test then
//     treats the cap as coplanar with whatever its projection overlaps.
//
// This pass removes both without moving the surface by more than
// `tolerance`:
//
//  - collapse: a vertex is merged into a neighbour when that neighbour lies
//    in the plane of every triangle around the vertex (a vertex in the middle
//    of a straight ruling or inside a flat region). The surface is unchanged.
//  - flip: an edge shared by two triangles is flipped when the flip raises
//    the worse of the two triangle qualities and either (a) both triangles
//    lie in one plane, or (b) one is a cap whose apex projects inside the
//    shared edge, so the flip splits its partner and moves the surface by at
//    most the cap height (<= `tolerance`). A cap flip is undone if a new
//    triangle would cross a neighbour (two sheets of surface can be closer
//    than the cap height near a knife edge).
//
// The input must be a closed, edge-manifold mesh (every edge in exactly two
// triangles). Anything else is returned unchanged: the watertight verify
// reports it, and this pass must never turn a reportable defect into a
// silent one.

export interface CleanupMesh {
  vertices: number[];
  triangles: number[];
}

export interface MeshCleanupStats {
  /** False when the input was not a closed edge-manifold mesh and was left as is. */
  applied: boolean;
  collapsed: number;
  flipped: number;
  trianglesBefore: number;
  trianglesAfter: number;
}

/** Largest surface displacement the cleanup may cause, in model units (mm). */
export const MESH_CLEANUP_TOLERANCE_MM = 1e-3;

/** Collapses must be exact: a vertex moves only along a flat or straight
 *  region, so the allowed off-plane distance is just float noise. */
const COLLAPSE_PLANE_TOLERANCE_MM = 1e-6;

/** A cap's apex is closer to its long edge than this fraction of the edge. */
const CAP_RELATIVE_HEIGHT = 1e-2;

/** Safety stop for the flip queue (it terminates on its own: every flip
 *  strictly raises a local minimum quality). */
const MAX_FLIPS_PER_TRIANGLE = 16;

export function cleanupExportMesh(
  mesh: CleanupMesh,
  tolerance: number = MESH_CLEANUP_TOLERANCE_MM,
): MeshCleanupStats {
  const trianglesBefore = mesh.triangles.length / 3;
  const stats: MeshCleanupStats = { applied: false, collapsed: 0, flipped: 0, trianglesBefore, trianglesAfter: trianglesBefore };
  if (trianglesBefore < 4 || !isClosedEdgeManifold(mesh.triangles)) return stats;

  const state = new CleanupState(mesh);
  const collapseTolerance = Math.min(tolerance, COLLAPSE_PLANE_TOLERANCE_MM * Math.max(1, state.scale));
  stats.collapsed = state.collapseFlatVertices(collapseTolerance);
  stats.flipped = state.flipEdges(tolerance, collapseTolerance);
  state.writeBack(mesh);
  stats.applied = true;
  stats.trianglesAfter = mesh.triangles.length / 3;
  return stats;
}

/** Every undirected edge is used by exactly two triangles, once in each direction.
 *  Use a sorted Float64Array instead of a JS Map containing 3 entries per
 *  triangle: on dense STL exports the Map consumes hundreds of MB. Pack an
 *  undirected edge into the high bits, and its direction into the low bit.
 *  Pairs must contain exactly one edge in each direction. */
function isClosedEdgeManifold(triangles: ArrayLike<number>): boolean {
  const n = triangles.length;
  if (n % 3 !== 0) return false;
  let maxIndex = 0;
  for (let i = 0; i < n; i++) {
    const v = triangles[i];
    if (!Number.isSafeInteger(v) || v < 0) return false;
    if (v > maxIndex) maxIndex = v;
  }
  const stride = maxIndex + 1;
  // Packed keys must be exact numbers; no aliasing of distinct mesh edges.
  if (2 * (maxIndex * stride + maxIndex) + 1 > Number.MAX_SAFE_INTEGER) return false;
  const edges = new Float64Array(n);
  let index = 0;
  for (let t = 0; t < n; t += 3) {
    for (let k = 0; k < 3; k++) {
      const a = triangles[t + k], b = triangles[t + ((k + 1) % 3)];
      if (a === b) return false;
      const lo = Math.min(a, b), hi = Math.max(a, b);
      edges[index++] = 2 * (lo * stride + hi) + (a > b ? 1 : 0);
    }
  }
  edges.sort();
  for (let i = 0; i < n; i += 2) {
    if (i + 1 >= n) return false;
    // Consecutive even/odd keys represent the same edge in reverse.
    if (edges[i + 1] !== edges[i] + 1 || edges[i] % 2 !== 0) return false;
    // Reject edges with four or more uses, even if directions balance.
    if (i + 2 < n && Math.floor(edges[i + 2] / 2) === Math.floor(edges[i] / 2)) return false;
  }
  return true;
}

class CleanupState {
  readonly V: Float64Array;
  readonly T: Int32Array;
  readonly alive: Uint8Array;
  /** Triangles around each vertex (may hold dead entries; filtered on read). */
  readonly star: number[][];
  readonly scale: number;

  constructor(mesh: CleanupMesh) {
    this.V = Float64Array.from(mesh.vertices);
    this.T = Int32Array.from(mesh.triangles);
    const nt = this.T.length / 3;
    this.alive = new Uint8Array(nt).fill(1);
    this.star = Array.from({ length: this.V.length / 3 }, () => [] as number[]);
    for (let t = 0; t < nt; t++) for (let k = 0; k < 3; k++) this.star[this.T[3 * t + k]].push(t);
    let s = 0;
    for (let i = 0; i < this.V.length; i++) s = Math.max(s, Math.abs(this.V[i]));
    this.scale = s;
  }

  liveStar(v: number): number[] {
    // Prune stale triangle IDs in place. Mesh cleanup repeatedly visits
    // adjacent stars, and .filter() allocated millions of short arrays on
    // dense exports even when no vertex was eligible to collapse.
    const list = this.star[v];
    let length = 0;
    for (let i = 0; i < list.length; i++) {
      const t = list[i];
      if (this.alive[t] === 1 && this.hasVertex(t, v)) list[length++] = t;
    }
    list.length = length;
    return list;
  }

  hasVertex(t: number, v: number): boolean {
    return this.T[3 * t] === v || this.T[3 * t + 1] === v || this.T[3 * t + 2] === v;
  }

  /** Unnormalised normal of triangle (a, b, c). */
  normal(a: number, b: number, c: number, out: Float64Array): Float64Array {
    const V = this.V;
    const ux = V[3 * b] - V[3 * a], uy = V[3 * b + 1] - V[3 * a + 1], uz = V[3 * b + 2] - V[3 * a + 2];
    const vx = V[3 * c] - V[3 * a], vy = V[3 * c + 1] - V[3 * a + 1], vz = V[3 * c + 2] - V[3 * a + 2];
    out[0] = uy * vz - uz * vy;
    out[1] = uz * vx - ux * vz;
    out[2] = ux * vy - uy * vx;
    return out;
  }

  /** Distance from point p to the plane of (a, b, c); Infinity for a degenerate triangle. */
  planeDistance(p: number, a: number, b: number, c: number): number {
    const n = this.normal(a, b, c, SCRATCH_N);
    const len = Math.hypot(n[0], n[1], n[2]);
    if (len === 0) return Infinity;
    const V = this.V;
    return Math.abs(n[0] * (V[3 * p] - V[3 * a]) + n[1] * (V[3 * p + 1] - V[3 * a + 1]) + n[2] * (V[3 * p + 2] - V[3 * a + 2])) / len;
  }

  /** Triangle quality in [0, 1]: 4·sqrt(3)·area / sum of squared edge lengths. */
  quality(a: number, b: number, c: number): number {
    const n = this.normal(a, b, c, SCRATCH_N);
    const area2 = Math.hypot(n[0], n[1], n[2]);
    const sq = this.dist2(a, b) + this.dist2(b, c) + this.dist2(c, a);
    return sq === 0 ? 0 : (2 * Math.sqrt(3) * area2) / sq;
  }

  /** Unit normal of (a, b, c) into `out`, or null for a zero-area triangle. */
  unitNormal(a: number, b: number, c: number, out: Float64Array): Float64Array | null {
    this.normal(a, b, c, out);
    const len = Math.hypot(out[0], out[1], out[2]);
    if (len === 0) return null;
    out[0] /= len; out[1] /= len; out[2] /= len;
    return out;
  }

  /** Parameter of p's projection onto segment ab (0 at a, 1 at b). */
  projectOnEdge(p: number, a: number, b: number): number {
    const V = this.V;
    const L2 = this.dist2(a, b);
    if (L2 === 0) return 0;
    return ((V[3 * p] - V[3 * a]) * (V[3 * b] - V[3 * a]) + (V[3 * p + 1] - V[3 * a + 1]) * (V[3 * b + 1] - V[3 * a + 1]) + (V[3 * p + 2] - V[3 * a + 2]) * (V[3 * b + 2] - V[3 * a + 2])) / L2;
  }

  /** Distance from vertex p to the line through a and b. */
  edgeHeight(p: number, a: number, b: number): number {
    const n = this.normal(a, b, p, SCRATCH_N);
    const len = Math.sqrt(this.dist2(a, b));
    return len === 0 ? 0 : Math.hypot(n[0], n[1], n[2]) / len;
  }

  dist2(a: number, b: number): number {
    const V = this.V;
    const dx = V[3 * a] - V[3 * b], dy = V[3 * a + 1] - V[3 * b + 1], dz = V[3 * a + 2] - V[3 * b + 2];
    return dx * dx + dy * dy + dz * dz;
  }

  ring(v: number, star: number[]): Set<number> {
    const r = new Set<number>();
    for (const t of star) for (let k = 0; k < 3; k++) { const x = this.T[3 * t + k]; if (x !== v) r.add(x); }
    return r;
  }

  /**
   * Merge vertices into a neighbour when the neighbour lies in the plane of
   * every triangle around the vertex. The triangles that keep their area stay
   * in their planes, so the surface does not move.
   */
  collapseFlatVertices(planeTolerance: number): number {
    let collapsed = 0;
    const nv = this.V.length / 3;
    const queue: number[] = [];
    for (let v = 0; v < nv; v++) queue.push(v);
    const queued = new Uint8Array(nv).fill(1);
    const nOld = new Float64Array(3);
    const nNew = new Float64Array(3);
    while (queue.length > 0) {
      const v = queue.pop()!;
      queued[v] = 0;
      const star = this.liveStar(v);
      if (star.length < 3) continue;
      const ringV = this.ring(v, star);
      let target = -1;
      for (const u of ringV) {
        if (this.canCollapse(v, u, star, ringV, planeTolerance, nOld, nNew)) { target = u; break; }
      }
      if (target < 0) continue;
      this.collapse(v, target, star);
      collapsed++;
      for (const x of this.ring(target, this.liveStar(target))) {
        if (!queued[x]) { queued[x] = 1; queue.push(x); }
      }
      if (!queued[target]) { queued[target] = 1; queue.push(target); }
    }
    return collapsed;
  }

  canCollapse(
    v: number, u: number, star: number[], ringV: Set<number>, planeTolerance: number,
    nOld: Float64Array, nNew: Float64Array,
  ): boolean {
    if (!this.linkConditionHolds(u, ringV)) return false;
    let removed = 0;
    for (const t of star) {
      const a = this.T[3 * t], b = this.T[3 * t + 1], c = this.T[3 * t + 2];
      if (a === u || b === u || c === u) {
        removed++;
        // The vertex opposite uv loses a triangle; keep it at degree >= 3.
        const w = a !== u && a !== v ? a : b !== u && b !== v ? b : c;
        if (this.liveStar(w).length <= 3) return false;
        continue;
      }
      if (!this.movedTriangleStays(v, u, a, b, c, planeTolerance, nOld, nNew)) return false;
    }
    return removed === 2;
  }

  /** v and u share exactly the two vertices opposite edge uv.
   *  Search the short incident-star list directly. Building a fresh Set for
   *  every candidate edge generated substantial garbage on dense meshes. */
  linkConditionHolds(u: number, ringV: Set<number>): boolean {
    const starU = this.liveStar(u);
    let common = 0;
    for (const x of ringV) {
      if (x === u) continue; // ring(u) excludes the center vertex itself.
      for (let i = 0; i < starU.length; i++) {
        if (!this.hasVertex(starU[i], x)) continue;
        if (++common > 2) return false;
        break;
      }
    }
    return common === 2;
  }

  /**
   * Triangle (a, b, c) with v replaced by u stays in its plane, keeps its
   * orientation and some area, and does not become a cap.
   */
  movedTriangleStays(
    v: number, u: number, a: number, b: number, c: number, planeTolerance: number,
    nOld: Float64Array, nNew: Float64Array,
  ): boolean {
    if (this.planeDistance(u, a, b, c) > planeTolerance) return false;
    const na = a === v ? u : a, nb = b === v ? u : b, nc = c === v ? u : c;
    const oldN = this.unitNormal(a, b, c, nOld);
    const newN = this.unitNormal(na, nb, nc, nNew);
    if (oldN === null || newN === null || dot3(oldN, newN) < 1 - 1e-9) return false;
    const qNew = this.quality(na, nb, nc);
    return !(qNew < 1e-3 && qNew < this.quality(a, b, c));
  }

  collapse(v: number, u: number, star: number[]): void {
    for (const t of star) {
      const i = 3 * t;
      if (this.T[i] === u || this.T[i + 1] === u || this.T[i + 2] === u) {
        this.alive[t] = 0;
        continue;
      }
      for (let k = 0; k < 3; k++) if (this.T[i + k] === v) this.T[i + k] = u;
      this.star[u].push(t);
    }
    this.star[v] = [];
  }

  /** The live triangle holding the directed edge a→b, or -1 (at most one when manifold). */
  triangleWithEdge(a: number, b: number): number {
    const list = this.star[a];
    for (let n = 0; n < list.length; n++) {
      const t = list[n];
      if (!this.alive[t]) continue;
      const i = 3 * t;
      if ((this.T[i] === a && this.T[i + 1] === b) || (this.T[i + 1] === a && this.T[i + 2] === b) || (this.T[i + 2] === a && this.T[i] === b)) return t;
    }
    return -1;
  }

  /**
   * Quality-improving edge flips that move the surface by (almost) nothing:
   * inside a flat region (the quad's diagonals cross, within
   * `flatTolerance`), or across the long edge of a cap whose apex lies within
   * `tolerance` of that edge. Each flip strictly raises the worse of the two
   * triangle qualities, so the work queue runs dry.
   */
  flipEdges(tolerance: number, flatTolerance: number): number {
    let flipped = 0;
    const nt = this.T.length / 3;
    const queue: number[] = [];
    const queued = new Uint8Array(nt);
    const enqueue = (x: number) => { if (x >= 0 && !queued[x]) { queued[x] = 1; queue.push(x); } };
    for (let t = nt - 1; t >= 0; t--) if (this.alive[t]) enqueue(t);
    let budget = MAX_FLIPS_PER_TRIANGLE * nt;
    while (queue.length > 0 && budget > 0) {
      const t = queue.pop()!;
      queued[t] = 0;
      if (!this.alive[t]) continue;
      for (let k = 0; k < 3; k++) {
        const touched = this.tryFlip(t, k, tolerance, flatTolerance);
        if (touched === null) continue;
        flipped++;
        budget--;
        for (const x of touched) enqueue(x);
        break;
      }
    }
    return flipped;
  }

  /**
   * Flip the edge of triangle t that starts at corner k, if allowed. Returns
   * the triangles whose edges changed, or null when nothing was flipped.
   */
  tryFlip(t: number, k: number, tolerance: number, flatTolerance: number): number[] | null {
    const i = 3 * t;
    const a = this.T[i + k], b = this.T[i + ((k + 1) % 3)], c = this.T[i + ((k + 2) % 3)];
    const s = this.triangleWithEdge(b, a);
    if (s < 0) return null;
    const j = 3 * s;
    const q = this.oppositeVertex(s, a, b);
    if (q === c) return null;
    const plane = this.flipPlane(a, b, c, q, tolerance, flatTolerance);
    if (plane === null || !this.flipImproves(a, b, c, q, plane)) return null;
    const oldT = [this.T[i], this.T[i + 1], this.T[i + 2]];
    const oldS = [this.T[j], this.T[j + 1], this.T[j + 2]];
    this.T[i] = c; this.T[i + 1] = a; this.T[i + 2] = q;
    this.T[j] = c; this.T[j + 1] = q; this.T[j + 2] = b;
    // A cap flip moves the surface by up to the cap height. Near a knife
    // edge (two faces meeting at a grazing angle) another sheet of the
    // surface can be closer than that, so check the neighbourhood.
    if (plane.cap && this.crossesNeighbourhood(t, s, [a, b, c, q])) {
      this.T.set(oldT, i);
      this.T.set(oldS, j);
      return null;
    }
    // Star bookkeeping: t gains q, s gains c (stale entries are skipped on read).
    this.star[q].push(t);
    this.star[c].push(s);
    return [t, s, this.triangleWithEdge(a, c), this.triangleWithEdge(c, b), this.triangleWithEdge(b, q), this.triangleWithEdge(q, a)];
  }

  /** The vertex of triangle s that is neither a nor b. */
  oppositeVertex(s: number, a: number, b: number): number {
    const j = 3 * s;
    for (let k = 0; k < 3; k++) {
      const x = this.T[j + k];
      if (x !== a && x !== b) return x;
    }
    return -1;
  }

  /**
   * Flipping ab to cq raises the worse triangle quality, does not duplicate
   * an existing edge c-q, and keeps both new triangles facing `plane.ref`.
   */
  flipImproves(a: number, b: number, c: number, q: number, plane: { ref: Float64Array; minCos: number }): boolean {
    const qualityBefore = Math.min(this.quality(a, b, c), this.quality(b, a, q));
    const qualityAfter = Math.min(this.quality(c, a, q), this.quality(c, q, b));
    if (!(qualityAfter > qualityBefore * (1 + 1e-6) + 1e-12)) return false;
    if (this.triangleWithEdge(c, q) >= 0 || this.triangleWithEdge(q, c) >= 0) return false;
    const m1 = this.unitNormal(c, a, q, SCRATCH_N1);
    const m2 = this.unitNormal(c, q, b, SCRATCH_N2);
    return m1 !== null && m2 !== null && dot3(m1, plane.ref) > plane.minCos && dot3(m2, plane.ref) > plane.minCos;
  }

  /**
   * The plane a flip of edge ab (quad a, c, b, q) must stay in, or null when
   * the flip could move the surface. Flat flip: both triangles already share
   * it. Cap flip: the cap's normal is noise, so the plane is its partner's;
   * the new triangles split the partner.
   */
  flipPlane(
    a: number, b: number, c: number, q: number, tolerance: number, flatTolerance: number,
  ): { ref: Float64Array; minCos: number; cap: boolean } | null {
    const diagonalGap = segmentDistance(this.V, a, b, c, q);
    const nA = this.unitNormal(a, b, c, SCRATCH_A);
    const nB = this.unitNormal(b, a, q, SCRATCH_B);
    if (diagonalGap <= flatTolerance && nA !== null && nB !== null && dot3(nA, nB) >= FLAT_COS) {
      return { ref: nA, minCos: FLAT_COS, cap: false };
    }
    const hc = this.edgeHeight(c, a, b), hq = this.edgeHeight(q, a, b);
    const capHeight = Math.min(hc, hq);
    if (capHeight > tolerance || capHeight > CAP_RELATIVE_HEIGHT * Math.sqrt(this.dist2(a, b))) return null;
    if (diagonalGap > capHeight * (1 + 1e-9) + flatTolerance) return null;
    // The apex must project strictly inside the long edge, else the flipped
    // pair overlaps instead of splitting the partner.
    const along = this.projectOnEdge(hc <= hq ? c : q, a, b);
    if (!(along > CAP_END_MARGIN && along < 1 - CAP_END_MARGIN)) return null;
    const partner = hc <= hq ? nB : nA;
    return partner === null ? null : { ref: partner, minCos: 0, cap: true };
  }

  /** True when triangle t or s crosses a live triangle within two rings of `seeds`. */
  crossesNeighbourhood(t: number, s: number, seeds: number[]): boolean {
    const verts = new Set<number>(seeds);
    for (const v of seeds) for (const x of this.ring(v, this.liveStar(v))) verts.add(x);
    const tris = new Set<number>();
    for (const v of verts) for (const x of this.liveStar(v)) tris.add(x);
    tris.delete(t);
    tris.delete(s);
    for (const x of tris) {
      if (this.trianglesCross(t, x) || this.trianglesCross(s, x)) return true;
    }
    return false;
  }

  /**
   * Do two triangles intersect anywhere other than at the vertices or edge
   * they share? Plain double-precision orientation tests; a borderline case
   * counts as crossing, which only makes the caller more conservative.
   */
  trianglesCross(t: number, u: number): boolean {
    const A = [this.T[3 * t], this.T[3 * t + 1], this.T[3 * t + 2]];
    const B = [this.T[3 * u], this.T[3 * u + 1], this.T[3 * u + 2]];
    const shared = A.filter(v => B.includes(v));
    if (shared.length >= 2) return false;
    // Edges of one triangle that do not touch a shared vertex, against the
    // other triangle. Two non-coplanar triangles that share one vertex and
    // still cross must have such an edge piercing the other.
    for (const [P, Q] of [[A, B], [B, A]]) {
      for (let k = 0; k < 3; k++) {
        const e0 = P[k], e1 = P[(k + 1) % 3];
        if (shared.includes(e0) || shared.includes(e1)) continue;
        if (this.segmentHitsTriangle(e0, e1, Q[0], Q[1], Q[2])) return true;
      }
    }
    return false;
  }

  orient(a: number, b: number, c: number, d: number): number {
    const V = this.V;
    const ax = V[3 * a] - V[3 * d], ay = V[3 * a + 1] - V[3 * d + 1], az = V[3 * a + 2] - V[3 * d + 2];
    const bx = V[3 * b] - V[3 * d], by = V[3 * b + 1] - V[3 * d + 1], bz = V[3 * b + 2] - V[3 * d + 2];
    const cx = V[3 * c] - V[3 * d], cy = V[3 * c + 1] - V[3 * d + 1], cz = V[3 * c + 2] - V[3 * d + 2];
    return ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx);
  }

  /** Segment pq meets closed triangle abc (non-coplanar case). */
  segmentHitsTriangle(p: number, q: number, a: number, b: number, c: number): boolean {
    const op = Math.sign(this.orient(a, b, c, p)), oq = Math.sign(this.orient(a, b, c, q));
    if (op === oq) return false; // same side, or coplanar (flat flips never reach here)
    const s1 = Math.sign(this.orient(p, q, a, b)), s2 = Math.sign(this.orient(p, q, b, c)), s3 = Math.sign(this.orient(p, q, c, a));
    const nz = [s1, s2, s3].filter(x => x !== 0);
    return nz.every(x => x === nz[0]);
  }

  writeBack(mesh: CleanupMesh): void {
    const nt = this.T.length / 3;
    const used = new Int32Array(this.V.length / 3).fill(-1);
    // Reuse the input arrays. Allocating new JS arrays for all triangle
    // indices doubles peak memory on dense STL exports; the source vertices
    // and faces are already copied into V and T, so it is safe to compact
    // those original arrays in place.
    const vertices = mesh.vertices;
    const triangles = mesh.triangles;
    let vertexCount = 0;
    let triangleIndexCount = 0;
    for (let t = 0; t < nt; t++) {
      if (!this.alive[t]) continue;
      for (let k = 0; k < 3; k++) {
        const v = this.T[3 * t + k];
        if (used[v] < 0) {
          used[v] = vertexCount / 3;
          vertices[vertexCount++] = this.V[3 * v];
          vertices[vertexCount++] = this.V[3 * v + 1];
          vertices[vertexCount++] = this.V[3 * v + 2];
        }
        triangles[triangleIndexCount++] = used[v];
      }
    }
    vertices.length = vertexCount;
    triangles.length = triangleIndexCount;
  }
}

const SCRATCH_N = new Float64Array(3);
const SCRATCH_A = new Float64Array(3);
const SCRATCH_B = new Float64Array(3);
const SCRATCH_N1 = new Float64Array(3);
const SCRATCH_N2 = new Float64Array(3);

/** Flat flip: old and new normals agree to ~0.08 degrees. */
const FLAT_COS = 1 - 1e-6;
/** A cap apex must project at least this fraction away from either end of its long edge. */
const CAP_END_MARGIN = 1e-6;

function dot3(a: Float64Array, b: Float64Array): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

/** Distance between segments ab and cq (vertex indices into V). */
function segmentDistance(V: Float64Array, a: number, b: number, c: number, q: number): number {
  const px = V[3 * a], py = V[3 * a + 1], pz = V[3 * a + 2];
  const d1x = V[3 * b] - px, d1y = V[3 * b + 1] - py, d1z = V[3 * b + 2] - pz;
  const qx = V[3 * c], qy = V[3 * c + 1], qz = V[3 * c + 2];
  const d2x = V[3 * q] - qx, d2y = V[3 * q + 1] - qy, d2z = V[3 * q + 2] - qz;
  const rx = px - qx, ry = py - qy, rz = pz - qz;
  const A = d1x * d1x + d1y * d1y + d1z * d1z;
  const E = d2x * d2x + d2y * d2y + d2z * d2z;
  const F = d2x * rx + d2y * ry + d2z * rz;
  const C = d1x * rx + d1y * ry + d1z * rz;
  const B = d1x * d2x + d1y * d2y + d1z * d2z;
  const denom = A * E - B * B;
  let s = denom > 0 ? clamp01((B * F - C * E) / denom) : 0;
  let t = E > 0 ? (B * s + F) / E : 0;
  if (t < 0) { t = 0; s = A > 0 ? clamp01(-C / A) : 0; }
  else if (t > 1) { t = 1; s = A > 0 ? clamp01((B - C) / A) : 0; }
  const dx = rx + d1x * s - d2x * t, dy = ry + d1y * s - d2y * t, dz = rz + d1z * s - d2z * t;
  return Math.hypot(dx, dy, dz);
}

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}
