// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/lattice/decimate.ts
//
// Tolerance-bounded edge-collapse decimation of a closed manifold mesh.
//
// Marching tetrahedra spends most of its triangles on slivers and flat-ish
// patches (every grid tet a surface crosses yields one or two). Collapsing
// edges whose quadric error (sum of squared distances to the planes of the
// original incident faces, Garland-Heckbert) stays under `tolerance^2`
// removes those without moving the surface by more than ~tolerance. The
// target is the cheapest of the edge midpoint and its two endpoints.
//
// Topology is preserved, not hoped for:
//   - link condition: the endpoints' one-rings share exactly the two
//     vertices opposite the edge (no pinching, no non-manifold edge);
//   - both endpoints keep valence >= 4 (no closed piece folds flat);
//   - no surviving, non-degenerate triangle flips or collapses to zero
//     area (its normal turns by less than ~78 deg).
// Adjacency stays exact across collapses without rebuilding: each surviving
// vertex owns a circular list of the original vertices merged into it, and
// its triangles are the union of their (per-pass) CSR lists. Candidates are
// re-checked against current positions when popped. Passes (which rebuild
// the candidate list, picking up edges new collapses created) repeat until
// one removes under 2 % of the triangles.

export interface DecimateOptions {
  /** Max surface deviation, mm. */
  tolerance: number;
  /** Pass cap (default 8). */
  maxPasses?: number;
}

export interface DecimateResult {
  positions: Float32Array;
  indices: Uint32Array;
  passes: number;
}

const COS_MAX_TURN = 0.2;
/** Twice-area below which a triangle counts as degenerate, mm^2. */
const DEGENERATE_AREA2 = 1e-10;
const RING_CAP = 256;

class Collapser {
  readonly pos: Float64Array;
  readonly tri: Uint32Array;
  readonly alive: Uint8Array;
  readonly quadric: Float64Array;
  /** Collapsed-away vertices. */
  readonly dead: Uint8Array;
  /** Circular member list of each merge group (CSR lists stay per original
   *  vertex; a representative's triangles are its members' lists). */
  readonly next: Int32Array;
  readonly stamp: Int32Array;
  stampValue = 0;
  vtStart = new Int32Array(0);
  vtList = new Int32Array(0);
  readonly ringU = new Int32Array(RING_CAP);
  readonly ringV = new Int32Array(RING_CAP);
  ringUCount = 0;
  ringVCount = 0;
  readonly target = new Float64Array(3);
  private readonly n0 = new Float64Array(3);
  private readonly n1 = new Float64Array(3);

  constructor(positions: Float32Array, indices: Uint32Array) {
    this.pos = Float64Array.from(positions);
    this.tri = indices.slice();
    this.alive = new Uint8Array(indices.length / 3).fill(1);
    const nv = positions.length / 3;
    this.quadric = new Float64Array(10 * nv);
    this.dead = new Uint8Array(nv);
    this.next = new Int32Array(nv);
    this.stamp = new Int32Array(nv);
    for (let t = 0; t < this.alive.length; t++) this.addFaceQuadric(t);
  }

  private addFaceQuadric(t: number): void {
    const P = this.pos, i = 3 * this.tri[3 * t], j = 3 * this.tri[3 * t + 1], k = 3 * this.tri[3 * t + 2];
    const n = cross(P[i], P[i + 1], P[i + 2], P[j], P[j + 1], P[j + 2], P[k], P[k + 1], P[k + 2]);
    const len = Math.hypot(n[0], n[1], n[2]);
    if (len === 0) return;
    const a = n[0] / len, b = n[1] / len, c = n[2] / len;
    const d = -(a * P[i] + b * P[i + 1] + c * P[i + 2]);
    const Q = this.quadric;
    for (let e = 0; e < 3; e++) {
      const o = 10 * this.tri[3 * t + e];
      Q[o] += a * a; Q[o + 1] += a * b; Q[o + 2] += a * c; Q[o + 3] += a * d; Q[o + 4] += b * b;
      Q[o + 5] += b * c; Q[o + 6] += b * d; Q[o + 7] += c * c; Q[o + 8] += c * d; Q[o + 9] += d * d;
    }
  }

  error(u: number, v: number, x: number, y: number, z: number): number {
    const Q = this.quadric, a = 10 * u, b = 10 * v;
    return (Q[a] + Q[b]) * x * x + 2 * (Q[a + 1] + Q[b + 1]) * x * y + 2 * (Q[a + 2] + Q[b + 2]) * x * z
      + 2 * (Q[a + 3] + Q[b + 3]) * x + (Q[a + 4] + Q[b + 4]) * y * y + 2 * (Q[a + 5] + Q[b + 5]) * y * z
      + 2 * (Q[a + 6] + Q[b + 6]) * y + (Q[a + 7] + Q[b + 7]) * z * z + 2 * (Q[a + 8] + Q[b + 8]) * z
      + (Q[a + 9] + Q[b + 9]);
  }

  /** Error of target k (0 = midpoint, 1 = u, 2 = v). */
  targetError(u: number, v: number, k: number): number {
    const P = this.pos, a = 3 * u, b = 3 * v;
    if (k === 1) return this.error(u, v, P[a], P[a + 1], P[a + 2]);
    if (k === 2) return this.error(u, v, P[b], P[b + 1], P[b + 2]);
    return this.error(u, v, 0.5 * (P[a] + P[b]), 0.5 * (P[a + 1] + P[b + 1]), 0.5 * (P[a + 2] + P[b + 2]));
  }

  setTarget(u: number, v: number, k: number): void {
    const P = this.pos, a = 3 * u, b = 3 * v, t = this.target;
    for (let c = 0; c < 3; c++) t[c] = k === 1 ? P[a + c] : k === 2 ? P[b + c] : 0.5 * (P[a + c] + P[b + c]);
  }

  /** Vertex -> alive-triangle adjacency (CSR). */
  buildAdjacency(): void {
    const nv = this.pos.length / 3;
    const count = new Int32Array(nv + 1);
    for (let t = 0; t < this.alive.length; t++) {
      if (!this.alive[t]) continue;
      for (let e = 0; e < 3; e++) count[this.tri[3 * t + e] + 1]++;
    }
    for (let i = 0; i < nv; i++) count[i + 1] += count[i];
    const list = new Int32Array(count[nv]);
    const fill = count.slice(0, nv);
    for (let t = 0; t < this.alive.length; t++) {
      if (!this.alive[t]) continue;
      for (let e = 0; e < 3; e++) list[fill[this.tri[3 * t + e]]++] = t;
    }
    this.vtStart = count;
    this.vtList = list;
    for (let i = 0; i < nv; i++) this.next[i] = i;
  }

  /** Unique one-ring of v into out, stamped with a fresh stamp; returns the
   *  count, or -1 when it overflows the ring buffer. */
  ring(v: number, out: Int32Array): number {
    const s = ++this.stampValue;
    let n = 0, m = v;
    do {
      for (let q = this.vtStart[m]; q < this.vtStart[m + 1]; q++) {
        const t = this.vtList[q];
        if (!this.alive[t]) continue;
        for (let e = 0; e < 3; e++) {
          const w = this.tri[3 * t + e];
          if (w === v || this.stamp[w] === s) continue;
          if (n >= out.length) return -1;
          this.stamp[w] = s;
          out[n++] = w;
        }
      }
      m = this.next[m];
    } while (m !== v);
    return n;
  }

  /** Link condition + valence: collapse keeps the mesh a closed manifold. */
  linkOk(u: number, v: number): boolean {
    this.ringUCount = this.ring(u, this.ringU);
    this.ringVCount = this.ring(v, this.ringV);
    if (this.ringUCount < 4 || this.ringVCount < 4) return false;
    // ringV's stamp is the current one: count u-neighbours carrying it.
    const s = this.stampValue;
    let shared = 0;
    for (let q = 0; q < this.ringUCount; q++) if (this.stamp[this.ringU[q]] === s) shared++;
    return shared === 2;
  }

  /** No surviving triangle around `end` flips when `end` moves to target. */
  private endNormalsOk(end: number, u: number, v: number): boolean {
    let m = end;
    do {
      for (let q = this.vtStart[m]; q < this.vtStart[m + 1]; q++) {
        const t = this.vtList[q];
        if (this.alive[t] && !this.triangleKeeps(t, end, u, v)) return false;
      }
      m = this.next[m];
    } while (m !== end);
    return true;
  }

  /** Triangle t survives `end` moving to target without flipping. */
  private triangleKeeps(t: number, end: number, u: number, v: number): boolean {
    const T = this.tri;
    const a = T[3 * t], b = T[3 * t + 1], c = T[3 * t + 2];
    if ((a === u || b === u || c === u) && (a === v || b === v || c === v)) return true;
    const n0 = this.n0, n1 = this.n1;
    triNormal(this.pos, this.pos, -1, a, b, c, n0);
    const lb = Math.hypot(n0[0], n0[1], n0[2]);
    // An already-degenerate sliver cannot get worse; collapsing it is the point.
    if (lb < DEGENERATE_AREA2) return true;
    triNormal(this.pos, this.target, end, a, b, c, n1);
    const la = Math.hypot(n1[0], n1[1], n1[2]);
    if (la < DEGENERATE_AREA2) return false;
    return (n0[0] * n1[0] + n0[1] * n1[1] + n0[2] * n1[2]) / (la * lb) >= COS_MAX_TURN;
  }

  normalsOk(u: number, v: number): boolean {
    return this.endNormalsOk(u, u, v) && this.endNormalsOk(v, u, v);
  }

  /** Cheapest target under tol2 that keeps every normal, into `target`. */
  placeTarget(u: number, v: number, tol2: number): boolean {
    const e0 = this.targetError(u, v, 0), e1 = this.targetError(u, v, 1), e2 = this.targetError(u, v, 2);
    // Try the three targets cheapest first; stop at the first over budget.
    for (let attempt = 0; attempt < 3; attempt++) {
      const k = attempt === 0 ? argmin3(e0, e1, e2) : attempt === 1 ? argmid3(e0, e1, e2) : argmax3(e0, e1, e2);
      const err = k === 0 ? e0 : k === 1 ? e1 : e2;
      if (!(err <= tol2)) return false;
      this.setTarget(u, v, k);
      if (this.normalsOk(u, v)) return true;
    }
    return false;
  }

  collapse(u: number, v: number): void {
    let m = u;
    do {
      for (let q = this.vtStart[m]; q < this.vtStart[m + 1]; q++) {
        const t = this.vtList[q];
        if (!this.alive[t]) continue;
        const o = 3 * t;
        if (this.tri[o] === v || this.tri[o + 1] === v || this.tri[o + 2] === v) { this.alive[t] = 0; continue; }
        for (let e = 0; e < 3; e++) if (this.tri[o + e] === u) this.tri[o + e] = v;
      }
      m = this.next[m];
    } while (m !== u);
    const t = this.target;
    this.pos[3 * v] = t[0]; this.pos[3 * v + 1] = t[1]; this.pos[3 * v + 2] = t[2];
    for (let i = 0; i < 10; i++) this.quadric[10 * v + i] += this.quadric[10 * u + i];
    this.dead[u] = 1;
    // Splice u's member list into v's.
    const nu = this.next[u];
    this.next[u] = this.next[v];
    this.next[v] = nu;
  }
}

/** Normal (unnormalised) of (a, b, c) into out; vertex `moved` reads from `at`. */
function triNormal(P: Float64Array, at: Float64Array, moved: number, a: number, b: number, c: number, out: Float64Array): void {
  const pa = a === moved ? at : P, oa = a === moved ? 0 : 3 * a;
  const pb = b === moved ? at : P, ob = b === moved ? 0 : 3 * b;
  const pc = c === moved ? at : P, oc = c === moved ? 0 : 3 * c;
  const ux = pb[ob] - pa[oa], uy = pb[ob + 1] - pa[oa + 1], uz = pb[ob + 2] - pa[oa + 2];
  const vx = pc[oc] - pa[oa], vy = pc[oc + 1] - pa[oa + 1], vz = pc[oc + 2] - pa[oa + 2];
  out[0] = uy * vz - uz * vy; out[1] = uz * vx - ux * vz; out[2] = ux * vy - uy * vx;
}

function argmin3(a: number, b: number, c: number): number {
  return a <= b && a <= c ? 0 : b <= c ? 1 : 2;
}

function argmax3(a: number, b: number, c: number): number {
  return a > b && a > c ? 0 : b > c ? 1 : 2;
}

function argmid3(a: number, b: number, c: number): number {
  return 3 - argmin3(a, b, c) - argmax3(a, b, c);
}

function cross(
  ax: number, ay: number, az: number, bx: number, by: number, bz: number, cx: number, cy: number, cz: number,
): [number, number, number] {
  const ux = bx - ax, uy = by - ay, uz = bz - az, vx = cx - ax, vy = cy - ay, vz = cz - az;
  return [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
}

/** Unique edges (u < v along the winding) whose cheapest target costs under
 *  tol^2, bucketed coarse-to-fine by cost so cheap collapses go first. */
function candidateEdges(c: Collapser, tol2: number): Int32Array[] {
  const buckets: number[][] = [[], [], [], []];
  for (let t = 0; t < c.alive.length; t++) {
    if (!c.alive[t]) continue;
    for (let e = 0; e < 3; e++) {
      const u = c.tri[3 * t + e], v = c.tri[3 * t + ((e + 1) % 3)];
      if (u > v) continue;
      const err = Math.min(c.targetError(u, v, 0), c.targetError(u, v, 1), c.targetError(u, v, 2));
      if (!(err <= tol2)) continue;
      const b = err <= tol2 / 64 ? 0 : err <= tol2 / 16 ? 1 : err <= tol2 / 4 ? 2 : 3;
      buckets[b].push(u, v);
    }
  }
  return buckets.map((b) => Int32Array.from(b));
}

function runPass(c: Collapser, tol2: number): number {
  c.buildAdjacency();
  let collapsed = 0;
  for (const bucket of candidateEdges(c, tol2)) {
    for (let n = 0; n < bucket.length; n += 2) {
      const u = bucket[n], v = bucket[n + 1];
      if (c.dead[u] || c.dead[v]) continue;
      if (!c.linkOk(u, v)) continue;
      if (!c.placeTarget(u, v, tol2)) continue;
      c.collapse(u, v);
      collapsed++;
    }
  }
  return collapsed;
}

function compact(c: Collapser): { positions: Float32Array; indices: Uint32Array } {
  const nv = c.pos.length / 3;
  const remap = new Int32Array(nv).fill(-1);
  let next = 0, nt = 0;
  for (let t = 0; t < c.alive.length; t++) if (c.alive[t]) nt++;
  const indices = new Uint32Array(3 * nt);
  let w = 0;
  for (let t = 0; t < c.alive.length; t++) {
    if (!c.alive[t]) continue;
    for (let e = 0; e < 3; e++) {
      const v = c.tri[3 * t + e];
      if (remap[v] < 0) remap[v] = next++;
      indices[w++] = remap[v];
    }
  }
  const positions = new Float32Array(3 * next);
  for (let v = 0; v < nv; v++) {
    const r = remap[v];
    if (r < 0) continue;
    positions[3 * r] = c.pos[3 * v]; positions[3 * r + 1] = c.pos[3 * v + 1]; positions[3 * r + 2] = c.pos[3 * v + 2];
  }
  return { positions, indices };
}

/** Decimate a closed manifold mesh within `tolerance` mm. */
export function decimateMesh(positions: Float32Array, indices: Uint32Array, opts: DecimateOptions): DecimateResult {
  const c = new Collapser(positions, indices);
  const tol2 = opts.tolerance * opts.tolerance;
  const maxPasses = opts.maxPasses ?? 8;
  let passes = 0;
  let aliveCount = indices.length / 3;
  while (passes < maxPasses) {
    const collapsed = runPass(c, tol2);
    passes++;
    aliveCount -= 2 * collapsed;
    if (collapsed * 2 < 0.02 * aliveCount) break;
  }
  return { ...compact(c), passes };
}
