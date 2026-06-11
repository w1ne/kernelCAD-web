// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/runtime/dfm/meshBvh.ts
//
// Plain-TypeScript triangle BVH for the DFM gates (min-wall ray sampler,
// voxel void analysis). Deliberately no third-party BVH dependency: the
// modeling layer must not import three.js-coupled helpers.
//
// Implementation notes:
//   - Möller–Trumbore ray/triangle intersection with a 1e-12 determinant
//     epsilon; barycentric bounds are inclusive within 1e-9 so rays that
//     pierce a shared edge or vertex still register on every incident
//     triangle (pointInside dedups those by t).
//   - Nodes are stored in flat Float64Array/Int32Array buffers — no
//     per-node objects — so 500k-triangle meshes stay in budget. Layout:
//     the left child immediately follows its parent (DFS order), only the
//     right-child index is stored; `count > 0` marks a leaf.
//   - Median split on triangle centroids along the widest centroid axis
//     (Hoare quickselect, O(n) per level), leaf size 8, stack-based
//     traversal (no recursion at query time).
//   - Degenerate triangles (area < 1e-12) are skipped at build and excluded
//     from `triangleCount`.
//
// The DfmMesh field names match `meshShapeForExport` in
// src/kernel/backends/occt/occtBackend.ts exactly
// (`{ vertices, triangles }`), so its welded watertight output can be fed
// in directly.

import type { Vec3 } from '../../../shared/intent/types';

/** Indexed triangle soup, same shape as `meshShapeForExport`'s return:
 *  `vertices` is a flat xyz array, `triangles` holds vertex indices in
 *  groups of three. */
export interface DfmMesh {
  vertices: readonly number[];
  triangles: readonly number[];
}

export interface BvhHit {
  /** Ray parameter: hit point = origin + t * dir (dir need not be unit). */
  t: number;
  /** Triangle index into the ORIGINAL `mesh.triangles` (triangle i spans
   *  `triangles[3i..3i+2]`), so callers can map hits back to source faces
   *  even when degenerate triangles were skipped at build. */
  triIndex: number;
}

const DET_EPS = 1e-12;
const AREA_EPS = 1e-12;
const BARY_EPS = 1e-9;
const PARITY_T_EPS = 1e-9;
const LEAF_SIZE = 8;

export class TriangleBvh {
  /** Number of non-degenerate triangles indexed by the BVH. */
  readonly triangleCount: number;

  // Packed triangle vertices: 9 doubles per valid triangle (v0 v1 v2),
  // ordered by build slot. Cache-friendly at intersection time.
  private readonly triVerts: Float64Array;
  // Build slot -> original triangle index in mesh.triangles.
  private readonly srcIndex: Int32Array;
  // Permutation of build slots; leaves reference contiguous ranges of it.
  private readonly triOrder: Int32Array;

  // Flat node storage. Node n: bounds[6n..6n+5] = minX minY minZ maxX maxY
  // maxZ; count[n] > 0 marks a leaf holding triOrder[start[n] ..
  // start[n]+count[n]); internal nodes have count 0, left child at n+1,
  // right child at rightChild[n].
  private readonly bounds: Float64Array;
  private readonly start: Int32Array;
  private readonly count: Int32Array;
  private readonly rightChild: Int32Array;
  private nodeCount = 0;

  // Reusable traversal stack shared by raycast/allHits. Queries are
  // synchronous and non-reentrant (pointInside -> allHits is sequential,
  // never nested), so a single per-instance buffer is safe and avoids a
  // fresh Int32Array allocation per query. Depth 128 covers any tree this
  // layout can produce (worst-case depth ~ 2*log2(n) << 128).
  private readonly traversalStack = new Int32Array(128);
  // Parallel stack of node ENTRY t (raycast only): lets a popped node be
  // discarded with one comparison when bestT shrank below its entry after
  // it was pushed.
  private readonly traversalTStack = new Float64Array(128);

  constructor(mesh: DfmMesh) {
    const { vertices, triangles } = mesh;
    const numTris = (triangles.length / 3) | 0;

    // Pack non-degenerate triangles.
    const triVerts = new Float64Array(numTris * 9);
    const srcIndex = new Int32Array(numTris);
    let valid = 0;
    for (let i = 0; i < numTris; i++) {
      const i0 = triangles[3 * i] * 3;
      const i1 = triangles[3 * i + 1] * 3;
      const i2 = triangles[3 * i + 2] * 3;
      const ax = vertices[i0], ay = vertices[i0 + 1], az = vertices[i0 + 2];
      const bx = vertices[i1], by = vertices[i1 + 1], bz = vertices[i1 + 2];
      const cx = vertices[i2], cy = vertices[i2 + 1], cz = vertices[i2 + 2];
      const e1x = bx - ax, e1y = by - ay, e1z = bz - az;
      const e2x = cx - ax, e2y = cy - ay, e2z = cz - az;
      const nx = e1y * e2z - e1z * e2y;
      const ny = e1z * e2x - e1x * e2z;
      const nz = e1x * e2y - e1y * e2x;
      const area = 0.5 * Math.sqrt(nx * nx + ny * ny + nz * nz);
      if (!(area >= AREA_EPS)) continue; // skip degenerate (or NaN) triangles
      const o = valid * 9;
      triVerts[o] = ax; triVerts[o + 1] = ay; triVerts[o + 2] = az;
      triVerts[o + 3] = bx; triVerts[o + 4] = by; triVerts[o + 5] = bz;
      triVerts[o + 6] = cx; triVerts[o + 7] = cy; triVerts[o + 8] = cz;
      srcIndex[valid] = i;
      valid++;
    }
    this.triangleCount = valid;
    this.triVerts = triVerts.subarray(0, valid * 9) as Float64Array;
    this.srcIndex = srcIndex.subarray(0, valid) as Int32Array;

    // Centroids for the median split (build-time only).
    const centroids = new Float64Array(valid * 3);
    for (let s = 0; s < valid; s++) {
      const o = s * 9;
      centroids[3 * s] = (triVerts[o] + triVerts[o + 3] + triVerts[o + 6]) / 3;
      centroids[3 * s + 1] = (triVerts[o + 1] + triVerts[o + 4] + triVerts[o + 7]) / 3;
      centroids[3 * s + 2] = (triVerts[o + 2] + triVerts[o + 5] + triVerts[o + 8]) / 3;
    }

    const triOrder = new Int32Array(valid);
    for (let s = 0; s < valid; s++) triOrder[s] = s;
    this.triOrder = triOrder;

    const maxNodes = Math.max(1, 2 * valid);
    this.bounds = new Float64Array(maxNodes * 6);
    this.start = new Int32Array(maxNodes);
    this.count = new Int32Array(maxNodes);
    this.rightChild = new Int32Array(maxNodes);

    if (valid > 0) this.buildNode(0, valid, centroids);
    else {
      // Empty tree: a placeholder root that must NEVER be traversed.
      // Invariant: every public query early-returns on triangleCount === 0
      // before touching node storage. The inverted bounds do NOT reject
      // rays (the slab near/far swap turns [+Inf, -Inf] into an infinite
      // box), and count[0] === 0 marks this node internal with
      // rightChild 0, so an unguarded traversal would self-loop forever.
      // Any new public query MUST keep the triangleCount === 0 guard.
      this.nodeCount = 1;
      this.bounds.set([Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity], 0);
      this.count[0] = 0;
    }
  }

  /** Allocate and fill the subtree over triOrder[lo, hi). Returns the node
   *  index. Recursive at build time only (depth ~ log2(n / leafSize)). */
  private buildNode(lo: number, hi: number, centroids: Float64Array): number {
    const node = this.nodeCount++;
    const b = this.bounds;
    const bo = node * 6;
    // Node bounds from triangle vertices in range.
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    // Centroid bounds for axis selection.
    let cMinX = Infinity, cMinY = Infinity, cMinZ = Infinity;
    let cMaxX = -Infinity, cMaxY = -Infinity, cMaxZ = -Infinity;
    for (let k = lo; k < hi; k++) {
      const s = this.triOrder[k];
      const o = s * 9;
      for (let v = 0; v < 9; v += 3) {
        const x = this.triVerts[o + v], y = this.triVerts[o + v + 1], z = this.triVerts[o + v + 2];
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
        if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
      }
      const cx = centroids[3 * s], cy = centroids[3 * s + 1], cz = centroids[3 * s + 2];
      if (cx < cMinX) cMinX = cx; if (cx > cMaxX) cMaxX = cx;
      if (cy < cMinY) cMinY = cy; if (cy > cMaxY) cMaxY = cy;
      if (cz < cMinZ) cMinZ = cz; if (cz > cMaxZ) cMaxZ = cz;
    }
    b[bo] = minX; b[bo + 1] = minY; b[bo + 2] = minZ;
    b[bo + 3] = maxX; b[bo + 4] = maxY; b[bo + 5] = maxZ;

    const n = hi - lo;
    const ex = cMaxX - cMinX, ey = cMaxY - cMinY, ez = cMaxZ - cMinZ;
    if (n <= LEAF_SIZE || (ex <= 0 && ey <= 0 && ez <= 0)) {
      // Leaf — also when all centroids coincide (split would not progress).
      this.start[node] = lo;
      this.count[node] = n;
      return node;
    }

    const axis = ex >= ey ? (ex >= ez ? 0 : 2) : ey >= ez ? 1 : 2;
    const mid = lo + (n >> 1);
    this.selectNth(lo, hi, mid, axis, centroids);

    this.count[node] = 0;
    this.buildNode(lo, mid, centroids); // left child = node + 1 (DFS order)
    this.rightChild[node] = this.buildNode(mid, hi, centroids);
    return node;
  }

  /** Hoare quickselect: partition triOrder[lo, hi) so the element at `nth`
   *  is in sorted position by centroid[axis]. O(n) expected per call. */
  private selectNth(lo: number, hi: number, nth: number, axis: number, centroids: Float64Array): void {
    const order = this.triOrder;
    const key = (k: number): number => centroids[3 * order[k] + axis];
    let left = lo;
    let right = hi - 1;
    while (left < right) {
      // Median-of-three pivot to dodge sorted-input pathologies.
      const midIdx = (left + right) >> 1;
      const a = key(left), m = key(midIdx), z = key(right);
      const pivot = a < m ? (m < z ? m : a < z ? z : a) : (a < z ? a : m < z ? z : m);
      let i = left;
      let j = right;
      while (i <= j) {
        while (key(i) < pivot) i++;
        while (key(j) > pivot) j--;
        if (i <= j) {
          const tmp = order[i]; order[i] = order[j]; order[j] = tmp;
          i++; j--;
        }
      }
      if (nth <= j) right = j;
      else if (nth >= i) left = i;
      else break;
    }
  }

  /** Möller–Trumbore against the packed triangle at build slot `s`.
   *  Returns t, or NaN on miss. Inclusive barycentric bounds (±1e-9) so
   *  exact edge/vertex piercings register. */
  private intersectTri(
    s: number,
    ox: number, oy: number, oz: number,
    dx: number, dy: number, dz: number,
  ): number {
    const tv = this.triVerts;
    const o = s * 9;
    const ax = tv[o], ay = tv[o + 1], az = tv[o + 2];
    const e1x = tv[o + 3] - ax, e1y = tv[o + 4] - ay, e1z = tv[o + 5] - az;
    const e2x = tv[o + 6] - ax, e2y = tv[o + 7] - ay, e2z = tv[o + 8] - az;
    const hx = dy * e2z - dz * e2y;
    const hy = dz * e2x - dx * e2z;
    const hz = dx * e2y - dy * e2x;
    const det = e1x * hx + e1y * hy + e1z * hz;
    if (det > -DET_EPS && det < DET_EPS) return NaN; // parallel / degenerate
    const inv = 1 / det;
    const sx = ox - ax, sy = oy - ay, sz = oz - az;
    const u = (sx * hx + sy * hy + sz * hz) * inv;
    if (u < -BARY_EPS || u > 1 + BARY_EPS) return NaN;
    const qx = sy * e1z - sz * e1y;
    const qy = sz * e1x - sx * e1z;
    const qz = sx * e1y - sy * e1x;
    const v = (dx * qx + dy * qy + dz * qz) * inv;
    if (v < -BARY_EPS || u + v > 1 + BARY_EPS) return NaN;
    return (e2x * qx + e2y * qy + e2z * qz) * inv;
  }

  /** Ray/AABB slab test for node `node` over the t interval [tMin, tMax].
   *  Returns the clipped ENTRY t (>= tMin) on overlap, Infinity on miss.
   *  NaN lanes (origin exactly on a slab plane with zero direction) drop
   *  out of the comparisons, which is conservative-correct. */
  private nodeEnterT(
    node: number,
    ox: number, oy: number, oz: number,
    ix: number, iy: number, iz: number,
    tMin: number, tMax: number,
  ): number {
    const b = this.bounds;
    const o = node * 6;
    let t0 = tMin;
    let t1 = tMax;

    let tn = (b[o] - ox) * ix;
    let tf = (b[o + 3] - ox) * ix;
    if (tn > tf) { const tmp = tn; tn = tf; tf = tmp; }
    if (tn > t0) t0 = tn;
    if (tf < t1) t1 = tf;
    if (t0 > t1) return Infinity;

    tn = (b[o + 1] - oy) * iy;
    tf = (b[o + 4] - oy) * iy;
    if (tn > tf) { const tmp = tn; tn = tf; tf = tmp; }
    if (tn > t0) t0 = tn;
    if (tf < t1) t1 = tf;
    if (t0 > t1) return Infinity;

    tn = (b[o + 2] - oz) * iz;
    tf = (b[o + 5] - oz) * iz;
    if (tn > tf) { const tmp = tn; tn = tf; tf = tmp; }
    if (tn > t0) t0 = tn;
    if (tf < t1) t1 = tf;
    return t0 <= t1 ? t0 : Infinity;
  }

  /** Nearest hit with t > tMin (default 0), optionally skipping one source
   *  triangle (original-mesh index, e.g. the triangle a sample ray was
   *  launched from). Direction need not be normalized; t is in units of
   *  |dir|.
   *
   *  Traversal is near-child-first: at each internal node both children's
   *  entry t is computed and the FARTHER child is pushed first, so the
   *  nearer subtree is explored before the farther one and bestT shrinks as
   *  early as possible. Each stack slot carries its node's entry t; a
   *  popped node whose entry is already >= bestT is discarded with one
   *  comparison. */
  raycast(origin: Vec3, dir: Vec3, opts?: { tMin?: number; skipTri?: number }): BvhHit | null {
    if (this.triangleCount === 0) return null;
    const tMin = opts?.tMin ?? 0;
    const skipTri = opts?.skipTri ?? -1;
    const [ox, oy, oz] = origin;
    const [dx, dy, dz] = dir;
    const ix = 1 / dx, iy = 1 / dy, iz = 1 / dz;

    let bestT = Infinity;
    let bestTri = -1;
    const stack = this.traversalStack;
    const tStack = this.traversalTStack;
    let sp = 0;
    const rootT = this.nodeEnterT(0, ox, oy, oz, ix, iy, iz, tMin, Infinity);
    if (rootT < Infinity) {
      stack[0] = 0;
      tStack[0] = rootT;
      sp = 1;
    }
    while (sp > 0) {
      sp--;
      if (tStack[sp] >= bestT) continue; // bestT shrank since this was pushed
      const node = stack[sp];
      const cnt = this.count[node];
      if (cnt > 0) {
        const lo = this.start[node];
        for (let k = lo; k < lo + cnt; k++) {
          const s = this.triOrder[k];
          if (this.srcIndex[s] === skipTri) continue;
          const t = this.intersectTri(s, ox, oy, oz, dx, dy, dz);
          if (t > tMin && t < bestT) {
            bestT = t;
            bestTri = this.srcIndex[s];
          }
        }
      } else {
        let nearNode = node + 1;
        let farNode = this.rightChild[node];
        let nearT = this.nodeEnterT(nearNode, ox, oy, oz, ix, iy, iz, tMin, bestT);
        let farT = this.nodeEnterT(farNode, ox, oy, oz, ix, iy, iz, tMin, bestT);
        if (farT < nearT) {
          const n = nearNode; nearNode = farNode; farNode = n;
          const t = nearT; nearT = farT; farT = t;
        }
        if (farT < Infinity) { // farther child first => popped last
          stack[sp] = farNode;
          tStack[sp] = farT;
          sp++;
        }
        if (nearT < Infinity) {
          stack[sp] = nearNode;
          tStack[sp] = nearT;
          sp++;
        }
      }
    }
    return bestTri >= 0 ? { t: bestT, triIndex: bestTri } : null;
  }

  /** Every hit along the ray with t > tMin, ascending t. Slab traversal
   *  with no early-out — every intersected leaf is visited. */
  allHits(origin: Vec3, dir: Vec3, tMin = 0): BvhHit[] {
    if (this.triangleCount === 0) return [];
    const [ox, oy, oz] = origin;
    const [dx, dy, dz] = dir;
    const ix = 1 / dx, iy = 1 / dy, iz = 1 / dz;

    const hits: BvhHit[] = [];
    const stack = this.traversalStack;
    let sp = 0;
    stack[sp++] = 0;
    while (sp > 0) {
      const node = stack[--sp];
      if (this.nodeEnterT(node, ox, oy, oz, ix, iy, iz, tMin, Infinity) === Infinity) continue;
      const cnt = this.count[node];
      if (cnt > 0) {
        const lo = this.start[node];
        for (let k = lo; k < lo + cnt; k++) {
          const s = this.triOrder[k];
          const t = this.intersectTri(s, ox, oy, oz, dx, dy, dz);
          if (t > tMin) hits.push({ t, triIndex: this.srcIndex[s] });
        }
      } else {
        stack[sp++] = node + 1;
        stack[sp++] = this.rightChild[node];
      }
    }
    hits.sort((a, b) => a.t - b.t);
    return hits;
  }

  /** Ray-parity inside test: odd number of surface crossings along the
   *  parity axis ⇒ inside. Welded watertight input (meshShapeForExport)
   *  makes parity reliable; grazing hits through shared edges/vertices are
   *  deduplicated by t (within 1e-9) before counting, since every incident
   *  triangle reports the same crossing.
   *
   *  The parity ray runs along the root-bounds axis with the SMALLEST
   *  extent (ties prefer x, then y): the infinite ray then pierces the
   *  fewest tree cells — a thin slab is probed through its thickness in a
   *  point-location-style descent instead of swept across its span. Axis
   *  choice is per-mesh deterministic, and parity is axis-invariant on
   *  watertight input. */
  pointInside(p: Vec3): boolean {
    if (this.triangleCount === 0) return false; // empty tree: placeholder root bounds must not be read
    const b = this.bounds;
    const ex = b[3] - b[0], ey = b[4] - b[1], ez = b[5] - b[2];
    const dir: Vec3 =
      ex <= ey ? (ex <= ez ? [1, 0, 0] : [0, 0, 1]) : ey <= ez ? [0, 1, 0] : [0, 0, 1];
    const hits = this.allHits(p, dir, 0);
    let crossings = 0;
    let lastT = -Infinity;
    for (const h of hits) {
      if (h.t - lastT > PARITY_T_EPS) crossings++;
      lastT = h.t;
    }
    return (crossings & 1) === 1;
  }
}
