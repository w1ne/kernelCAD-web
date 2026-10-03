// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/fea/infillBands.ts
//
// Solved stress field -> stress-graded FDM infill regions.
//
// The part is split into N bands by von Mises stress as a fraction of the
// material's yield (default: < 15 % low, 15-40 % mid, > 40 % high). The
// lowest band is the object's own infill; every higher band becomes one
// slicer MODIFIER volume that carries its own infill density.
//
// Geometry: the field is sampled onto a voxel grid (2-5 mm cells). A cell
// takes the highest band of any element whose bounding box touches it, so
// the bands err toward MORE infill, never less. Band k's modifier is the set
// of cells at band >= k, so the modifiers nest (high inside mid); slicers
// apply the later modifier where two overlap, and the writer emits them in
// ascending band order.
//
// Watertight by construction: a union of voxels has a non-manifold surface
// only where two cells touch along an edge or at a corner alone. Each band's
// cell set is grown (never shrunk) until no 2x2x2 block holds such a
// configuration ("well-composed" sets, Latecki 1997). The boundary quads of a
// well-composed set, welded on grid points, form a closed 2-manifold that
// cannot self-intersect. Growing only adds infill, so the fix is safe.
//
// Modifiers only act inside the part, so the cells need no clipping to it.

import type { FeaFieldResult, FeaMesh } from './types';

/** One infill band. `fromYield` is the band's lower edge as a fraction of
 *  yield; the first band must start at 0. */
export interface InfillBandSpec {
  name: string;
  fromYield: number;
  /** Sparse infill density, percent (0-100). */
  densityPercent: number;
}

export const DEFAULT_INFILL_BANDS: readonly InfillBandSpec[] = [
  { name: 'low', fromYield: 0, densityPercent: 10 },
  { name: 'mid', fromYield: 0.15, densityPercent: 25 },
  { name: 'high', fromYield: 0.4, densityPercent: 60 },
];

export const DEFAULT_INFILL_PATTERN = 'gyroid';
/** Solid shell (walls + top/bottom) assumed by the saving estimate, mm:
 *  2 wall loops x 0.45 mm line width. */
export const DEFAULT_SHELL_MM = 0.9;
const MIN_CELL_MM = 2;
const MAX_CELL_MM = 5;
const MAX_CELLS = 400_000;
/** Volumetric flow assumptions for the time estimate, mm^3/s. Walls print
 *  slower than sparse infill on every stock Bambu/Orca profile. */
const SHELL_FLOW_MM3_S = 6;
const INFILL_FLOW_MM3_S = 12;

export interface StressInfillOptions {
  bands?: readonly InfillBandSpec[];
  pattern?: string;
  /** Voxel edge, mm. Default: longest part extent / 25, clamped to 2-5 mm. */
  cellMm?: number;
  shellMm?: number;
  /** Filament density for the gram estimate, g/cm^3. */
  filamentDensityGCm3?: number;
}

export interface InfillMesh {
  vertices: number[];
  triangles: number[];
}

export interface InfillBandResult {
  name: string;
  densityPercent: number;
  fromMPa: number;
  /** Upper edge, MPa; `Infinity` for the top band. */
  toMPa: number;
  /** Part volume whose stress falls in this band, percent. */
  stressVolumePercent: number;
  /** Part volume the slicer prints at this density (after voxel growth),
   *  percent. This is the number the saving estimate uses. */
  printedVolumePercent: number;
  /** Modifier mesh; undefined for the base band (the object's own infill)
   *  and for a band no cell reached. */
  modifier?: InfillMesh;
}

export interface InfillSaving {
  partVolumeMm3: number;
  surfaceAreaMm2: number;
  shellMm: number;
  /** Uniform infill at the HIGH band density. */
  uniformDensityPercent: number;
  uniformMaterialMm3: number;
  gradedMaterialMm3: number;
  materialSavingPercent: number;
  uniformGrams?: number;
  gradedGrams?: number;
  uniformTimeMin: number;
  gradedTimeMin: number;
  timeSavingPercent: number;
  assumptions: string;
}

export interface StressInfillResult {
  bands: InfillBandResult[];
  pattern: string;
  cellMm: number;
  yieldMPa: number;
  saving: InfillSaving;
}

/** Validate a band table; returns a message when it is unusable. */
export function validateInfillBands(bands: readonly InfillBandSpec[]): string | undefined {
  if (bands.length < 2) return 'infill.bands needs at least 2 bands.';
  if (bands[0].fromYield !== 0) return 'infill.bands[0].fromYield must be 0.';
  for (let i = 0; i < bands.length; i++) {
    const b = bands[i];
    if (typeof b.name !== 'string' || b.name.length === 0) return `infill.bands[${i}].name must be a non-empty string.`;
    if (!(Number.isFinite(b.fromYield) && b.fromYield >= 0)) return `infill.bands[${i}].fromYield must be a finite number >= 0.`;
    if (!(Number.isFinite(b.densityPercent) && b.densityPercent >= 0 && b.densityPercent <= 100)) {
      return `infill.bands[${i}].densityPercent must be in 0-100.`;
    }
    if (i > 0 && !(b.fromYield > bands[i - 1].fromYield)) {
      return `infill.bands fromYield must strictly increase; band ${i} (${b.fromYield}) <= band ${i - 1} (${bands[i - 1].fromYield}).`;
    }
  }
  return undefined;
}

/** Band index of one von Mises value: the highest band whose lower edge it
 *  reaches. */
export function classifyStress(vmMPa: number, yieldMPa: number, bands: readonly InfillBandSpec[]): number {
  const frac = yieldMPa > 0 ? vmMPa / yieldMPa : 0;
  let k = 0;
  for (let i = 1; i < bands.length; i++) if (frac >= bands[i].fromYield) k = i;
  return k;
}

// ---------------------------------------------------------------------------
// Voxel grid

export interface VoxelGrid {
  origin: [number, number, number];
  cellMm: number;
  n: [number, number, number];
  /** Per-cell band, -1 = no element touches the cell (outside the part). */
  band: Int8Array;
}

function cellIndex(g: { n: readonly number[] }, i: number, j: number, k: number): number {
  return i + g.n[0] * (j + g.n[1] * k);
}

/** Default voxel edge: the longest extent / 25, clamped to 2-5 mm, then
 *  raised until the grid stays under the cell ceiling. */
export function defaultCellMm(min: readonly number[], max: readonly number[]): number {
  const ext = [0, 1, 2].map((a) => Math.max(max[a] - min[a], 1e-6));
  let cell = Math.min(MAX_CELL_MM, Math.max(MIN_CELL_MM, Math.max(...ext) / 25));
  while (ext.reduce((acc, e) => acc * (Math.ceil(e / cell) + 4), 1) > MAX_CELLS) cell *= 1.25;
  return cell;
}

/** Element band from its mean nodal stress; mean (not max) so one singular
 *  corner node at a fixed hole does not paint its whole neighbourhood. */
function elementBands(
  mesh: FeaMesh,
  fields: FeaFieldResult,
  yieldMPa: number,
  bands: readonly InfillBandSpec[],
): Int8Array {
  const vmByNode = new Map<number, number>();
  for (let i = 0; i < fields.nodeIds.length; i++) vmByNode.set(fields.nodeIds[i], fields.vonMises[i]);
  const out = new Int8Array(mesh.elements.length);
  mesh.elements.forEach((el, e) => {
    let sum = 0;
    for (const n of el.nodes) sum += vmByNode.get(n) ?? 0;
    out[e] = classifyStress(sum / el.nodes.length, yieldMPa, bands);
  });
  return out;
}

/** Sample per-element bands onto a voxel grid (max over touching elements). */
export function voxelizeBands(
  mesh: FeaMesh,
  elemBand: Int8Array,
  cellMm: number,
): VoxelGrid {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const p of mesh.nodes.values()) {
    for (let a = 0; a < 3; a++) {
      if (p[a] < min[a]) min[a] = p[a];
      if (p[a] > max[a]) max[a] = p[a];
    }
  }
  // Two empty cells of padding on every side: room for the well-composed
  // growth, and a closed boundary for the surface walk.
  const pad = 2;
  const origin: [number, number, number] = [
    min[0] - pad * cellMm, min[1] - pad * cellMm, min[2] - pad * cellMm,
  ];
  const n: [number, number, number] = [0, 1, 2].map(
    (a) => Math.ceil((max[a] - min[a]) / cellMm) + 2 * pad,
  ) as [number, number, number];
  const band = new Int8Array(n[0] * n[1] * n[2]).fill(-1);
  const g = { n };
  mesh.elements.forEach((el, e) => {
    const lo = [Infinity, Infinity, Infinity];
    const hi = [-Infinity, -Infinity, -Infinity];
    for (const id of el.nodes) {
      const p = mesh.nodes.get(id);
      if (p === undefined) continue;
      for (let a = 0; a < 3; a++) {
        if (p[a] < lo[a]) lo[a] = p[a];
        if (p[a] > hi[a]) hi[a] = p[a];
      }
    }
    const i0 = [0, 1, 2].map((a) => Math.max(0, Math.floor((lo[a] - origin[a]) / cellMm)));
    const i1 = [0, 1, 2].map((a) => Math.min(n[a] - 1, Math.floor((hi[a] - origin[a]) / cellMm)));
    const b = elemBand[e];
    for (let k = i0[2]; k <= i1[2]; k++) {
      for (let j = i0[1]; j <= i1[1]; j++) {
        for (let i = i0[0]; i <= i1[0]; i++) {
          const c = cellIndex(g, i, j, k);
          if (band[c] < b) band[c] = b;
        }
      }
    }
  });
  return { origin, cellMm, n, band };
}

// ---------------------------------------------------------------------------
// Well-composed growth

/** good[mask] is true when, inside one 2x2x2 block (bit = x + 2y + 4z), both
 *  the occupied and the empty cells are face-connected. Exactly then the
 *  voxel surface is a manifold at the block's centre vertex and edges. */
const WELL_COMPOSED: Uint8Array = (() => {
  const t = new Uint8Array(256);
  const components = (mask: number, want: number): number => {
    const seen = new Set<number>();
    let count = 0;
    for (let s = 0; s < 8; s++) {
      if (((mask >> s) & 1) !== want || seen.has(s)) continue;
      count++;
      const stack = [s];
      seen.add(s);
      while (stack.length > 0) {
        const c = stack.pop()!;
        for (const bit of [1, 2, 4]) {
          const nb = c ^ bit;
          if (((mask >> nb) & 1) === want && !seen.has(nb)) { seen.add(nb); stack.push(nb); }
        }
      }
    }
    return count;
  };
  for (let m = 0; m < 256; m++) t[m] = components(m, 1) <= 1 && components(m, 0) <= 1 ? 1 : 0;
  return t;
})();

/** Grow `occ` (in place) until it is well-composed. Only adds cells. Blocks
 *  that straddle the grid border see out-of-grid cells as empty. */
export function makeWellComposed(occ: Uint8Array, n: readonly [number, number, number]): number {
  const [nx, ny, nz] = n;
  const at = (i: number, j: number, k: number): number =>
    i < 0 || j < 0 || k < 0 || i >= nx || j >= ny || k >= nz ? 0 : occ[i + nx * (j + ny * k)];
  const maskOf = (i: number, j: number, k: number): number => {
    let m = 0;
    for (let s = 0; s < 8; s++) if (at(i + (s & 1), j + ((s >> 1) & 1), k + ((s >> 2) & 1))) m |= 1 << s;
    return m;
  };
  // Blocks are keyed by their min corner, -1..n-1 on each axis.
  const key = (i: number, j: number, k: number): number => (i + 1) + (nx + 1) * ((j + 1) + (ny + 1) * (k + 1));
  const queue: number[] = [];
  const queued = new Uint8Array((nx + 1) * (ny + 1) * (nz + 1));
  const push = (i: number, j: number, k: number) => {
    if (i < -1 || j < -1 || k < -1 || i >= nx || j >= ny || k >= nz) return;
    const q = key(i, j, k);
    if (queued[q]) return;
    queued[q] = 1;
    queue.push(i, j, k);
  };
  for (let k = -1; k < nz; k++) for (let j = -1; j < ny; j++) for (let i = -1; i < nx; i++) push(i, j, k);
  let added = 0;
  while (queue.length > 0) {
    const k = queue.pop()!;
    const j = queue.pop()!;
    const i = queue.pop()!;
    queued[key(i, j, k)] = 0;
    const m = maskOf(i, j, k);
    if (WELL_COMPOSED[m]) continue;
    for (let s = 0; s < 8; s++) {
      if ((m >> s) & 1) continue;
      const ci = i + (s & 1), cj = j + ((s >> 1) & 1), ck = k + ((s >> 2) & 1);
      if (ci < 0 || cj < 0 || ck < 0 || ci >= nx || cj >= ny || ck >= nz) continue;
      occ[ci + nx * (cj + ny * ck)] = 1;
      added++;
      for (let d = 0; d < 8; d++) push(ci - (d & 1), cj - ((d >> 1) & 1), ck - ((d >> 2) & 1));
    }
    // A block whose empty cells all lie outside the grid cannot be fixed by
    // growth; the 2-cell padding keeps occupied cells away from the border,
    // and the extractor's defect check reports it if it ever happens.
  }
  return added;
}

// ---------------------------------------------------------------------------
// Surface extraction

/** Outward-wound boundary quads of an occupied voxel set, welded on grid
 *  points. Closed and manifold when the set is well-composed. */
export function voxelSurface(
  occ: Uint8Array,
  n: readonly [number, number, number],
  origin: readonly number[],
  cellMm: number,
): InfillMesh {
  const [nx, ny, nz] = n;
  const vertices: number[] = [];
  const triangles: number[] = [];
  const vid = new Map<number, number>();
  const vertex = (i: number, j: number, k: number): number => {
    const key = i + (nx + 1) * (j + (ny + 1) * k);
    let v = vid.get(key);
    if (v === undefined) {
      v = vertices.length / 3;
      vertices.push(origin[0] + i * cellMm, origin[1] + j * cellMm, origin[2] + k * cellMm);
      vid.set(key, v);
    }
    return v;
  };
  const filled = (i: number, j: number, k: number): boolean =>
    i >= 0 && j >= 0 && k >= 0 && i < nx && j < ny && k < nz && occ[i + nx * (j + ny * k)] === 1;
  // For each axis-direction: neighbour offset and the 4 face corners, CCW
  // seen from outside (right-hand rule gives the outward normal).
  const faces: ReadonlyArray<{ d: [number, number, number]; c: ReadonlyArray<[number, number, number]> }> = [
    { d: [1, 0, 0], c: [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]] },
    { d: [-1, 0, 0], c: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]] },
    { d: [0, 1, 0], c: [[0, 1, 0], [0, 1, 1], [1, 1, 1], [1, 1, 0]] },
    { d: [0, -1, 0], c: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]] },
    { d: [0, 0, 1], c: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]] },
    { d: [0, 0, -1], c: [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]] },
  ];
  for (let k = 0; k < nz; k++) {
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        if (!filled(i, j, k)) continue;
        for (const f of faces) {
          if (filled(i + f.d[0], j + f.d[1], k + f.d[2])) continue;
          const q = f.c.map(([a, b, c]) => vertex(i + a, j + b, k + c));
          triangles.push(q[0], q[1], q[2], q[0], q[2], q[3]);
        }
      }
    }
  }
  return { vertices, triangles };
}

// ---------------------------------------------------------------------------
// Volumes and the saving estimate

function tetVolume(a: readonly number[], b: readonly number[], c: readonly number[], d: readonly number[]): number {
  const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
  const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
  const wx = d[0] - a[0], wy = d[1] - a[1], wz = d[2] - a[2];
  return Math.abs(ux * (vy * wz - vz * wy) - uy * (vx * wz - vz * wx) + uz * (vx * wy - vy * wx)) / 6;
}

function surfaceArea(mesh: FeaMesh): number {
  let area = 0;
  for (const s of mesh.surfaces) {
    for (const t of s.tris) {
      const a = mesh.nodes.get(t[0]), b = mesh.nodes.get(t[1]), c = mesh.nodes.get(t[2]);
      if (!a || !b || !c) continue;
      const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
      const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
      area += Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx) / 2;
    }
  }
  return area;
}

/** Material + time estimate: a solid shell of `shellMm` over the surface,
 *  sparse infill inside at each band's density in proportion to its printed
 *  volume share. Compared against uniform infill at the HIGH density. */
export function estimateInfillSaving(
  partVolumeMm3: number,
  surfaceAreaMm2: number,
  printedFractions: readonly number[],
  bands: readonly InfillBandSpec[],
  shellMm: number,
  filamentDensityGCm3: number | undefined,
): InfillSaving {
  const shell = Math.min(partVolumeMm3, surfaceAreaMm2 * shellMm);
  const interior = Math.max(0, partVolumeMm3 - shell);
  const high = bands[bands.length - 1].densityPercent / 100;
  const meanDensity = printedFractions.reduce((acc, f, i) => acc + f * (bands[i].densityPercent / 100), 0);
  const uniformInfill = interior * high;
  const gradedInfill = interior * meanDensity;
  const uniformMaterialMm3 = shell + uniformInfill;
  const gradedMaterialMm3 = shell + gradedInfill;
  const time = (inf: number) => (shell / SHELL_FLOW_MM3_S + inf / INFILL_FLOW_MM3_S) / 60;
  const uniformTimeMin = time(uniformInfill);
  const gradedTimeMin = time(gradedInfill);
  const pct = (u: number, g: number) => (u > 0 ? ((u - g) / u) * 100 : 0);
  return {
    partVolumeMm3,
    surfaceAreaMm2,
    shellMm,
    uniformDensityPercent: bands[bands.length - 1].densityPercent,
    uniformMaterialMm3,
    gradedMaterialMm3,
    materialSavingPercent: pct(uniformMaterialMm3, gradedMaterialMm3),
    ...(filamentDensityGCm3 !== undefined
      ? {
          uniformGrams: (uniformMaterialMm3 / 1000) * filamentDensityGCm3,
          gradedGrams: (gradedMaterialMm3 / 1000) * filamentDensityGCm3,
        }
      : {}),
    uniformTimeMin,
    gradedTimeMin,
    timeSavingPercent: pct(uniformTimeMin, gradedTimeMin),
    assumptions:
      `Estimate, not a slice: solid shell ${shellMm} mm over the surface, sparse infill inside; ` +
      `extrusion time at ${SHELL_FLOW_MM3_S} mm^3/s shell and ${INFILL_FLOW_MM3_S} mm^3/s infill (travel, ` +
      'top/bottom skins and accel ignored). Slice the 3MF for exact grams and minutes.',
  };
}

// ---------------------------------------------------------------------------
// Entry point

/**
 * Build stress-graded infill bands from a solved study.
 *
 * Throws on an unusable band table; never returns a uniform-infill result
 * dressed up as graded.
 */
export function buildStressInfill(
  mesh: FeaMesh,
  fields: FeaFieldResult,
  yieldMPa: number,
  options: StressInfillOptions = {},
): StressInfillResult {
  const bands = options.bands ?? DEFAULT_INFILL_BANDS;
  const bad = validateInfillBands(bands);
  if (bad !== undefined) throw new Error(bad);
  if (!(yieldMPa > 0)) throw new Error(`stress-graded infill needs a positive yield; got ${yieldMPa}.`);
  if (mesh.elements.length === 0) throw new Error('stress-graded infill: the FEA mesh has no elements.');

  const elemBand = elementBands(mesh, fields, yieldMPa, bands);

  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const p of mesh.nodes.values()) {
    for (let a = 0; a < 3; a++) { min[a] = Math.min(min[a], p[a]); max[a] = Math.max(max[a], p[a]); }
  }
  const cellMm = options.cellMm ?? defaultCellMm(min, max);
  if (!(cellMm > 0)) throw new Error(`infill.cellMm must be > 0; got ${cellMm}.`);
  const grid = voxelizeBands(mesh, elemBand, cellMm);
  const cells = grid.band.length;

  // Nested occupancy, top band first: occ[k] = well-composed(occ[k+1] | band >= k).
  const occ: Array<Uint8Array | undefined> = new Array(bands.length).fill(undefined);
  let above: Uint8Array | undefined;
  for (let k = bands.length - 1; k >= 1; k--) {
    const o = new Uint8Array(cells);
    for (let c = 0; c < cells; c++) o[c] = grid.band[c] >= k || (above !== undefined && above[c] === 1) ? 1 : 0;
    makeWellComposed(o, grid.n);
    occ[k] = o;
    above = o;
  }

  // Volumes over the FEA elements: by raw stress class, and by the band the
  // slicer will actually apply at the element centroid.
  const stressVol = new Array(bands.length).fill(0);
  const printedVol = new Array(bands.length).fill(0);
  let total = 0;
  mesh.elements.forEach((el, e) => {
    const p = el.nodes.slice(0, 4).map((id) => mesh.nodes.get(id) ?? [0, 0, 0]);
    const v = tetVolume(p[0], p[1], p[2], p[3]);
    total += v;
    stressVol[elemBand[e]] += v;
    const cxyz = [0, 1, 2].map((a) => (p[0][a] + p[1][a] + p[2][a] + p[3][a]) / 4);
    const ci = [0, 1, 2].map((a) =>
      Math.min(grid.n[a] - 1, Math.max(0, Math.floor((cxyz[a] - grid.origin[a]) / cellMm))),
    );
    const c = cellIndex(grid, ci[0], ci[1], ci[2]);
    let applied = 0;
    for (let k = bands.length - 1; k >= 1; k--) {
      if (occ[k]![c] === 1) { applied = k; break; }
    }
    printedVol[applied] += v;
  });

  const out: InfillBandResult[] = bands.map((b, k) => {
    const modifier = k === 0 ? undefined : voxelSurface(occ[k]!, grid.n, grid.origin, cellMm);
    return {
      name: b.name,
      densityPercent: b.densityPercent,
      fromMPa: b.fromYield * yieldMPa,
      toMPa: k + 1 < bands.length ? bands[k + 1].fromYield * yieldMPa : Infinity,
      stressVolumePercent: total > 0 ? (stressVol[k] / total) * 100 : 0,
      printedVolumePercent: total > 0 ? (printedVol[k] / total) * 100 : 0,
      ...(modifier !== undefined && modifier.triangles.length > 0 ? { modifier } : {}),
    };
  });

  const saving = estimateInfillSaving(
    total,
    surfaceArea(mesh),
    printedVol.map((v) => (total > 0 ? v / total : 0)),
    bands,
    options.shellMm ?? DEFAULT_SHELL_MM,
    options.filamentDensityGCm3,
  );

  return { bands: out, pattern: options.pattern ?? DEFAULT_INFILL_PATTERN, cellMm, yieldMPa, saving };
}
