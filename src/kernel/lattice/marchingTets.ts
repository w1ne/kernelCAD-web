// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/lattice/marchingTets.ts
//
// Zero-level isosurface of a sampled scalar grid by marching tetrahedra.
//
// Every grid cube is split into the six Kuhn tetrahedra around its 0 -> 7
// diagonal. The Kuhn split is a valid triangulation of the whole grid (the
// face diagonals of neighbouring cubes agree), and the zero set of the
// piecewise-linear interpolant over a triangulation is a closed, orientable
// 2-manifold whenever no sample is exactly zero and the boundary samples are
// all positive. So the output is watertight and edge-manifold BY
// CONSTRUCTION — unlike surface nets or the classic marching-cubes table,
// which can leave holes or non-manifold edges on ambiguous faces. Callers
// pad the grid so the boundary is outside; zeros are nudged positive here.
//
// Triangles are wound so their normal points toward increasing value
// (outward, with negative = inside).
//
// Memory: values are the only full-grid array. Edge -> vertex ids live in
// two rolling z-layers (8 slots per grid point: one per edge direction).

export interface ScalarGrid {
  readonly nx: number;
  readonly ny: number;
  readonly nz: number;
  readonly origin: readonly [number, number, number];
  readonly h: number;
  /** Samples, index i + nx * (j + ny * k). Negative = inside. */
  readonly values: Float32Array;
}

export interface IndexedMesh {
  positions: Float32Array;
  indices: Uint32Array;
}

/** The six Kuhn tetrahedra of a cube, as corner bit masks (x=1, y=2, z=4). */
const KUHN_TETS: readonly (readonly [number, number, number, number])[] = [
  [0, 1, 3, 7], [0, 1, 5, 7], [0, 2, 3, 7], [0, 2, 6, 7], [0, 4, 5, 7], [0, 4, 6, 7],
];

function cornerVec(c: number): [number, number, number] {
  return [c & 1, (c >> 1) & 1, (c >> 2) & 1];
}

/** Orientation sign of the tetrahedron (a, b, c, d) of cube corners. */
function orient(a: number, b: number, c: number, d: number): number {
  const pa = cornerVec(a), pb = cornerVec(b), pc = cornerVec(c), pd = cornerVec(d);
  const u = [pb[0] - pa[0], pb[1] - pa[1], pb[2] - pa[2]];
  const v = [pc[0] - pa[0], pc[1] - pa[1], pc[2] - pa[2]];
  const w = [pd[0] - pa[0], pd[1] - pa[1], pd[2] - pa[2]];
  return u[0] * (v[1] * w[2] - v[2] * w[1]) - u[1] * (v[0] * w[2] - v[2] * w[0]) + u[2] * (v[0] * w[1] - v[1] * w[0]);
}

/** Edge (a, b) with the subset corner first, as edgeVertex expects. */
function edge(a: number, b: number): [number, number] {
  return a < b ? [a, b] : [b, a];
}

/** Triangles for one tet and inside mask, as flat corner-pair lists. The
 *  winding is derived combinatorially from the tet's orientation, so it is
 *  exact even when a triangle is numerically degenerate: for a positively
 *  oriented (a, b, c, d), triangle (ab, ac, ad) faces away from a, and the
 *  quad (ac, ad, bd, bc) of a two-in (a, b) case faces away from a and b. */
function tetCase(t: readonly number[], mask: number): number[] {
  const ins = t.filter((_, q) => (mask >> q) & 1);
  const outs = t.filter((_, q) => !((mask >> q) & 1));
  if (ins.length === 0 || outs.length === 0) return [];
  if (ins.length === 2) {
    const [a, b] = ins;
    let [c, d] = outs;
    if (orient(a, b, c, d) < 0) [c, d] = [d, c];
    return [...edge(a, c), ...edge(a, d), ...edge(b, d), ...edge(a, c), ...edge(b, d), ...edge(b, c)];
  }
  const loneInside = ins.length === 1;
  const lone = loneInside ? ins[0] : outs[0];
  const rest = loneInside ? outs : ins;
  const r0 = rest[0];
  let r1 = rest[1], r2 = rest[2];
  if (orient(lone, r0, r1, r2) < 0) [r1, r2] = [r2, r1];
  if (!loneInside) [r1, r2] = [r2, r1];
  return [...edge(lone, r0), ...edge(lone, r1), ...edge(lone, r2)];
}

const TET_CASES: readonly (readonly number[])[] = KUHN_TETS.flatMap((t) =>
  Array.from({ length: 16 }, (_, mask) => tetCase(t, mask)));

class GrowF32 {
  data: Float32Array;
  length = 0;
  constructor(capacity: number) { this.data = new Float32Array(Math.max(capacity, 48)); }
  push3(a: number, b: number, c: number): void {
    if (this.length + 3 > this.data.length) {
      const next = new Float32Array(this.data.length * 2);
      next.set(this.data);
      this.data = next;
    }
    this.data[this.length++] = a;
    this.data[this.length++] = b;
    this.data[this.length++] = c;
  }
  finish(): Float32Array { return this.data.slice(0, this.length); }
}

class GrowU32 {
  data: Uint32Array;
  length = 0;
  constructor(capacity: number) { this.data = new Uint32Array(Math.max(capacity, 48)); }
  push3(a: number, b: number, c: number): void {
    if (this.length + 3 > this.data.length) {
      const next = new Uint32Array(this.data.length * 2);
      next.set(this.data);
      this.data = next;
    }
    this.data[this.length++] = a;
    this.data[this.length++] = b;
    this.data[this.length++] = c;
  }
  finish(): Uint32Array { return this.data.slice(0, this.length); }
}

/** Per-run state shared by the cube / tet / edge helpers. */
class Mesher {
  readonly positions: GrowF32;
  readonly indices: GrowU32;
  /** Edge-vertex ids for the current (k) and next (k + 1) point layers. */
  cur: Int32Array;
  nxt: Int32Array;
  k = 0;
  // Scratch for one cube.
  readonly cv = new Float64Array(8);
  readonly cp = new Float64Array(24);
  readonly cl = new Int32Array(8);

  readonly g: ScalarGrid;

  constructor(g: ScalarGrid) {
    this.g = g;
    const layer = g.nx * g.ny * 8;
    this.cur = new Int32Array(layer).fill(-1);
    this.nxt = new Int32Array(layer).fill(-1);
    const estimate = Math.min(g.nx * g.ny * g.nz, 1 << 22);
    this.positions = new GrowF32(estimate);
    this.indices = new GrowU32(estimate * 2);
  }

  /** Load the 8 corner values / positions / layer-local ids of cube (i, j). */
  loadCube(i: number, j: number): void {
    const { g, cv, cp, cl } = this;
    for (let c = 0; c < 8; c++) {
      const di = c & 1, dj = (c >> 1) & 1, dk = (c >> 2) & 1;
      const ii = i + di, jj = j + dj;
      let v = g.values[ii + g.nx * (jj + g.ny * (this.k + dk))];
      if (v === 0) v = 1e-9;
      cv[c] = v;
      cp[3 * c] = g.origin[0] + ii * g.h;
      cp[3 * c + 1] = g.origin[1] + jj * g.h;
      cp[3 * c + 2] = g.origin[2] + (this.k + dk) * g.h;
      cl[c] = (ii + g.nx * jj) * 8;
    }
  }

  /** Vertex id on the cube edge between corners a and b (a subset of b). */
  edgeVertex(a: number, b: number): number {
    const dir = a ^ b;
    const store = (a & 4) !== 0 ? this.nxt : this.cur;
    const slot = this.cl[a] + dir;
    const known = store[slot];
    if (known >= 0) return known;
    const { cv, cp } = this;
    // Clamped off the corners so two edge vertices never coincide.
    const t = Math.min(Math.max(cv[a] / (cv[a] - cv[b]), 1e-3), 1 - 1e-3);
    const id = this.positions.length / 3;
    this.positions.push3(
      cp[3 * a] + t * (cp[3 * b] - cp[3 * a]),
      cp[3 * a + 1] + t * (cp[3 * b + 1] - cp[3 * a + 1]),
      cp[3 * a + 2] + t * (cp[3 * b + 2] - cp[3 * a + 2]),
    );
    store[slot] = id;
    return id;
  }

  /** March one tetrahedron (index into KUHN_TETS). */
  tet(ti: number): void {
    const t = KUHN_TETS[ti];
    const cv = this.cv;
    let mask = 0;
    for (let q = 0; q < 4; q++) if (cv[t[q]] < 0) mask |= 1 << q;
    const tris = TET_CASES[ti * 16 + mask];
    for (let n = 0; n < tris.length; n += 6) {
      this.indices.push3(
        this.edgeVertex(tris[n], tris[n + 1]),
        this.edgeVertex(tris[n + 2], tris[n + 3]),
        this.edgeVertex(tris[n + 4], tris[n + 5]),
      );
    }
  }

  layer(): void {
    const { g } = this;
    for (let j = 0; j < g.ny - 1; j++) {
      for (let i = 0; i < g.nx - 1; i++) {
        if (!this.cubeStraddles(i, j)) continue;
        this.loadCube(i, j);
        for (let t = 0; t < 6; t++) this.tet(t);
      }
    }
    const done = this.cur;
    this.cur = this.nxt;
    this.nxt = done.fill(-1);
    this.k++;
  }

  /** Cheap reject: all 8 corners on one side. */
  cubeStraddles(i: number, j: number): boolean {
    const { g } = this;
    const base = i + g.nx * (j + g.ny * this.k);
    const sx = 1, sy = g.nx, sz = g.nx * g.ny;
    const v = g.values;
    const s = v[base] < 0;
    return (v[base + sx] < 0) !== s || (v[base + sy] < 0) !== s || (v[base + sx + sy] < 0) !== s
      || (v[base + sz] < 0) !== s || (v[base + sz + sx] < 0) !== s || (v[base + sz + sy] < 0) !== s
      || (v[base + sz + sx + sy] < 0) !== s;
  }
}

/** Zero isosurface of `grid` (negative inside) as an indexed, outward-wound,
 *  watertight triangle mesh. */
export function meshIsosurface(grid: ScalarGrid): IndexedMesh {
  if (grid.nx < 2 || grid.ny < 2 || grid.nz < 2) {
    return { positions: new Float32Array(0), indices: new Uint32Array(0) };
  }
  const m = new Mesher(grid);
  for (let k = 0; k < grid.nz - 1; k++) m.layer();
  return { positions: m.positions.finish(), indices: m.indices.finish() };
}
