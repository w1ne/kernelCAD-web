// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/lattice/buildLattice.ts
//
// Host body + TPMS spec -> one closed, outward-wound triangle mesh solid:
// a solid skin of `skin` mm following the body's outer surface, and a
// (graded) TPMS lattice filling the rest.
//
// HOW THE SOLID IS MESHED (skin > 0)
// ----------------------------------
// Meshing the solid's own field max(B, min(-(B + skin), L)) directly forces
// the grid finer than the wall (a 0.8 mm sheet needs a ~0.45 mm grid, or
// the sampling steps over it and the wall vanishes): tens of millions of
// triangles for a hand-sized part. Instead the solid is built as the body
// MINUS its lattice voids, and each piece is meshed separately:
//
//   outer surface   {B = 0}
//   sheet voids     V+ = {max(B + skin, w/2 - d) < 0},  V- = {max(B + skin, d + w/2) < 0}
//   network void    V  = {max(B + skin, t - d) < 0}
//
// where B is the body's signed distance and d = f / |grad f| the TPMS
// first-order distance. None of these fields has a thin feature, so the
// grid only has to resolve the cell (cell / 8 by default). The pieces are
// disjoint for the piecewise-linear interpolants the mesher actually
// contours, not just for the exact fields: per grid sample
// V+ + V- >= w > 0 and V >= B + skin > B, so inside every tetrahedron the
// linear interpolants cannot be negative together. Each piece is a closed
// manifold from marching tetrahedra; voids are re-wound inward. Their union
// is therefore a watertight, consistently oriented solid with internal
// cavities, by construction.
//
// skin = 0 (open cells at the surface) has no such decomposition; it meshes
// max(B, |d| - w/2) (sheet) or max(B, d - t) (network) directly, on a grid
// fine enough for the thinnest wall.

import { bodySignedDistance, snapToMesh, type BodyMesh } from './bodyDistance';
import { decimateMesh } from './decimate';
import { gridAround, type GridFrame } from './grid';
import { levelAt, sampleLevels, type LatticeFrame, type LevelSamples } from './latticeField';
import { projectVertices } from './project';
import { meshIsosurface, type IndexedMesh } from './marchingTets';
import { meshMass, meshTopology } from './meshMetrics';
import { measureThickness, trilinear, type ThicknessStats } from './thickness';
import {
  networkLevelForFraction,
  sheetFractionForWall,
  type TpmsType,
  type TpmsVariant,
} from './tpms';
import { buildGradeField, type LatticeGrade } from './grade';

export type { LatticeGrade } from './grade';

export interface LatticeBuildSpec {
  type: TpmsType;
  variant: TpmsVariant;
  /** Cell size (period), mm. */
  cell: number;
  /** Base value: sheet wall (mm) or network solid fraction (0-1). */
  value: number;
  /** Solid outer skin, mm (0 = open cells at the surface). */
  skin: number;
  frame: LatticeFrame;
  grade?: LatticeGrade;
  /** Grid step, mm. Default cell / 8 (finer for skin 0). */
  resolution?: number;
  /** Decimation tolerance, mm; 0 disables. Default grid step / 10. */
  tolerance?: number;
  /** Grid-point budget (default 24 M); the step grows to fit. */
  maxGridPoints?: number;
}

export interface LatticeReport {
  type: TpmsType;
  variant: TpmsVariant;
  cellMm: number;
  cellsAround?: number;
  skinMm: number;
  gridStepMm: number;
  gridPoints: number;
  /** The grid step was raised to fit `maxGridPoints`. */
  resolutionClamped: boolean;
  /** Designed sheet wall range over the lattice (sheet only), mm. */
  designWallMm?: { min: number; max: number };
  /** Designed lattice solid fraction range (infinite-lattice value). */
  designFraction: { min: number; max: number };
  rawTriangles: number;
  triangles: number;
  vertices: number;
  volumeMm3: number;
  bodyVolumeMm3: number;
  /** volume / host body volume (skin included). */
  solidFraction: number;
  /** Measured across lattice walls / struts. */
  measuredWallMm?: ThicknessStats;
  /** Measured inward from the outer surface (skin > 0). */
  measuredSkinMm?: ThicknessStats;
  watertight: boolean;
  consistentOrientation: boolean;
  timingsMs: Record<string, number>;
}

export interface LatticeBuildResult {
  positions: Float32Array;
  indices: Uint32Array;
  report: LatticeReport;
}

const DEFAULT_MAX_GRID_POINTS = 24_000_000;

interface Bounds { min: [number, number, number]; max: [number, number, number] }

function boundsOf(mesh: BodyMesh): Bounds {
  const { bbox } = meshMass(mesh.vertices, []);
  return bbox;
}

function chooseStep(spec: LatticeBuildSpec, b: Bounds, minWall: number): { h: number; clamped: boolean } {
  const fine = spec.skin > 0 ? spec.cell / 8 : Math.min(spec.cell / 8, minWall / 1.8);
  let h = spec.resolution ?? fine;
  const budget = spec.maxGridPoints ?? DEFAULT_MAX_GRID_POINTS;
  const vol = (b.max[0] - b.min[0] + 5 * h) * (b.max[1] - b.min[1] + 5 * h) * (b.max[2] - b.min[2] + 5 * h);
  const needed = Math.cbrt(vol / budget);
  if (needed > h) return { h: needed * 1.02, clamped: true };
  h = Math.max(h, 1e-3);
  return { h, clamped: false };
}

/** Per-point parameter (wall mm or solid fraction), plus its range over the
 *  lattice core. */
function paramField(spec: LatticeBuildSpec, g: GridFrame, B: Float32Array, body: BodyMesh): { param: Float32Array; min: number; max: number } {
  const param = spec.grade ? buildGradeField(spec.grade, g, B, body, spec.skin) : new Float32Array(B.length).fill(spec.value);
  let min = Infinity, max = -Infinity;
  for (let i = 0; i < param.length; i++) {
    if (B[i] >= -spec.skin) continue;
    if (param[i] < min) min = param[i];
    if (param[i] > max) max = param[i];
  }
  if (min === Infinity) { min = spec.value; max = spec.value; }
  return { param, min, max };
}

/** Network level field t(p) in f units from a solid-fraction field. */
function levelsFromFraction(type: TpmsType, fraction: Float32Array): Float32Array {
  const lut = new Float32Array(257);
  for (let i = 0; i <= 256; i++) lut[i] = networkLevelForFraction(type, i / 256);
  const out = new Float32Array(fraction.length);
  for (let i = 0; i < fraction.length; i++) {
    const x = Math.min(Math.max(fraction[i], 0), 1) * 256;
    const lo = Math.floor(x), hi = Math.min(lo + 1, 256);
    out[i] = lut[lo] + (lut[hi] - lut[lo]) * (x - lo);
  }
  return out;
}

/** Fills `out` with one void field (see the module header). */
function voidField(
  out: Float32Array, kind: 'sheetPlus' | 'sheetMinus' | 'network',
  B: Float32Array, lv: LevelSamples, param: Float32Array, skin: number,
): Float32Array {
  for (let i = 0; i < out.length; i++) {
    const d = lv.f[i] * lv.invGrad[i];
    const lat = kind === 'sheetPlus' ? param[i] / 2 - d
      : kind === 'sheetMinus' ? d + param[i] / 2
        : (param[i] - lv.f[i]) * lv.invGrad[i];
    out[i] = Math.max(B[i] + skin, lat);
  }
  return out;
}

function openField(out: Float32Array, variant: TpmsVariant, B: Float32Array, lv: LevelSamples, param: Float32Array): Float32Array {
  for (let i = 0; i < out.length; i++) {
    const lat = variant === 'sheet'
      ? Math.abs(lv.f[i] * lv.invGrad[i]) - param[i] / 2
      : (lv.f[i] - param[i]) * lv.invGrad[i];
    out[i] = Math.max(B[i], lat);
  }
  return out;
}

function flipWinding(m: IndexedMesh): IndexedMesh {
  const idx = m.indices;
  for (let t = 0; t < idx.length; t += 3) { const a = idx[t + 1]; idx[t + 1] = idx[t + 2]; idx[t + 2] = a; }
  return m;
}

function concat(parts: IndexedMesh[]): { mesh: IndexedMesh; outerTriangles: number } {
  let nv = 0, ni = 0;
  for (const p of parts) { nv += p.positions.length; ni += p.indices.length; }
  const positions = new Float32Array(nv);
  const indices = new Uint32Array(ni);
  let vo = 0, io = 0;
  for (const p of parts) {
    positions.set(p.positions, vo);
    const base = vo / 3;
    for (let i = 0; i < p.indices.length; i++) indices[io + i] = p.indices[i] + base;
    vo += p.positions.length; io += p.indices.length;
  }
  return { mesh: { positions, indices }, outerTriangles: parts[0]?.indices.length ?? 0 };
}

interface Pieces { mesh: IndexedMesh; outerIndexCount: number }

type VoidKind = 'sheetPlus' | 'sheetMinus' | 'network';

function meshPieces(spec: LatticeBuildSpec, g: GridFrame, B: Float32Array, lv: LevelSamples, param: Float32Array, body: BodyMesh): Pieces {
  const scratch = new Float32Array(B.length);
  const lat = analyticLattice(spec, g, param, lv.cellsAround ?? 0);
  const maxStep = g.h / 4;
  if (spec.skin <= 0) {
    const m = meshIsosurface({ ...g, values: openField(scratch, spec.variant, B, lv, param) });
    projectVertices(m.positions, (x, y, z, out) => lat.term('open', x, y, z, out) && out[0] > trilinear(g, B, x, y, z), maxStep);
    return { mesh: m, outerIndexCount: 0 };
  }
  const outer = meshIsosurface({ ...g, values: B });
  snapToMesh(outer.positions, body, g.h / 2);
  const parts: IndexedMesh[] = [outer];
  const kinds: VoidKind[] = spec.variant === 'sheet' ? ['sheetPlus', 'sheetMinus'] : ['network'];
  for (const kind of kinds) {
    const m = flipWinding(meshIsosurface({ ...g, values: voidField(scratch, kind, B, lv, param, spec.skin) }));
    projectVertices(m.positions, (x, y, z, out) =>
      lat.term(kind, x, y, z, out) && out[0] > trilinear(g, B, x, y, z) + spec.skin, maxStep);
    parts.push(m);
  }
  const { mesh, outerTriangles } = concat(parts);
  return { mesh, outerIndexCount: outerTriangles };
}

/** Exact (analytic TPMS, interpolated parameter) lattice terms. */
function analyticLattice(spec: LatticeBuildSpec, g: GridFrame, param: Float32Array, around: number) {
  const scratch = new Float64Array(4), lv = new Float64Array(5);
  const minGrad = (2 * Math.PI / spec.cell) * 1e-3;
  const p = (x: number, y: number, z: number): number => {
    const v = trilinear(g, param, x, y, z);
    return Number.isFinite(v) ? v : spec.value;
  };
  /** Value and the sign (+1 / -1) of its gradient along the TPMS normal. */
  const valueOf = (kind: VoidKind | 'open', x: number, y: number, z: number): [number, number] => {
    levelAt(spec.type, spec.cell, spec.frame, around, x, y, z, scratch, lv);
    const f = lv[0], ig = 1 / Math.max(lv[1], minGrad), d = f * ig;
    if (kind === 'sheetPlus') return [p(x, y, z) / 2 - d, -1];
    if (kind === 'sheetMinus') return [d + p(x, y, z) / 2, 1];
    if (kind === 'network') return [(p(x, y, z) - f) * ig, -1];
    return spec.variant === 'sheet' ? [Math.abs(d) - p(x, y, z) / 2, d >= 0 ? 1 : -1] : [(f - p(x, y, z)) * ig, 1];
  };
  return {
    /** Void term (kind) or material term ('open'), negative inside it. */
    value: (kind: VoidKind | 'open', x: number, y: number, z: number): number => valueOf(kind, x, y, z)[0],
    term(kind: VoidKind | 'open', x: number, y: number, z: number, out: Float64Array): boolean {
      const [v, sign] = valueOf(kind, x, y, z);
      out[0] = v; out[1] = sign * lv[2]; out[2] = sign * lv[3]; out[3] = sign * lv[4];
      return true;
    },
  };
}

/** Solid sampler (negative = material): interpolated body field, analytic
 *  lattice. */
function solidSampler(spec: LatticeBuildSpec, g: GridFrame, B: Float32Array, lv: LevelSamples, param: Float32Array) {
  const lat = analyticLattice(spec, g, param, lv.cellsAround ?? 0);
  return (x: number, y: number, z: number): number => {
    const b = trilinear(g, B, x, y, z);
    if (!Number.isFinite(b)) return 1;
    const l = lat.value('open', x, y, z);
    return spec.skin > 0 ? Math.max(b, Math.min(-(b + spec.skin), l)) : Math.max(b, l);
  };
}

function timed<T>(timings: Record<string, number>, key: string, fn: () => T): T {
  const t0 = performance.now();
  const out = fn();
  timings[key] = Math.round(performance.now() - t0);
  return out;
}

/** Build the lattice solid inside `body`. */
export function buildLatticeSolid(body: BodyMesh, spec: LatticeBuildSpec): LatticeBuildResult {
  const timings: Record<string, number> = {};
  const t0 = performance.now();
  const b = boundsOf(body);
  const minWall = spec.variant === 'sheet' ? Math.min(spec.value, spec.grade?.near ?? spec.value) : spec.cell / 4;
  const { h, clamped } = chooseStep(spec, b, minWall);
  const g = gridAround(b.min, b.max, h, 2);
  const needFar = spec.grade?.kind === 'distance' && spec.grade.source === 'surface';
  const B = timed(timings, 'bodyDistanceMs', () => bodySignedDistance(body, g, { band: spec.skin + 3 * h, far: needFar }));
  const lv = timed(timings, 'tpmsFieldMs', () => sampleLevels(spec.type, spec.cell, spec.frame, g));
  const grade = timed(timings, 'gradeMs', () => paramField(spec, g, B, body));
  const param = spec.variant === 'network' ? levelsFromFraction(spec.type, grade.param) : grade.param;
  const pieces = timed(timings, 'meshMs', () => meshPieces(spec, g, B, lv, param, body));
  const rawTriangles = pieces.mesh.indices.length / 3;
  const tol = spec.tolerance ?? h / 10;
  const final = tol > 0
    ? timed(timings, 'decimateMs', () => decimateMesh(pieces.mesh.positions, pieces.mesh.indices, { tolerance: tol }))
    : { ...pieces.mesh, passes: 0 };
  const report = timed(timings, 'measureMs', () => measure(spec, g, B, lv, param, grade, final, body, {
    clamped, rawTriangles,
  }));
  timings.totalMs = Math.round(performance.now() - t0);
  report.timingsMs = timings;
  return { positions: final.positions, indices: final.indices, report };
}

function measure(
  spec: LatticeBuildSpec, g: GridFrame, B: Float32Array, lv: LevelSamples, param: Float32Array,
  grade: { min: number; max: number }, mesh: IndexedMesh, body: BodyMesh,
  extra: { clamped: boolean; rawTriangles: number },
): LatticeReport {
  const mass = meshMass(mesh.positions, mesh.indices);
  const topo = meshTopology(mesh.positions.length / 3, mesh.indices);
  const bodyVolume = meshMass(body.vertices, body.triangles).volumeMm3;
  const solid = solidSampler(spec, g, B, lv, param);
  const step = g.h / 8;
  const sheetFraction = (w: number): number => sheetFractionForWall(spec.type, spec.cell, w);
  const onOuter = (x: number, y: number, z: number): boolean => Math.abs(trilinear(g, B, x, y, z)) < g.h / 4;
  const { wall, skin } = thicknessByRegion(mesh, solid, step, spec, onOuter);
  return {
    type: spec.type,
    variant: spec.variant,
    cellMm: spec.cell,
    ...(spec.frame.map === 'cylindrical' && lv.cellsAround !== undefined ? { cellsAround: lv.cellsAround } : {}),
    skinMm: spec.skin,
    gridStepMm: g.h,
    gridPoints: g.nx * g.ny * g.nz,
    resolutionClamped: extra.clamped,
    ...(spec.variant === 'sheet' ? { designWallMm: { min: grade.min, max: grade.max } } : {}),
    designFraction: spec.variant === 'sheet'
      ? { min: sheetFraction(grade.min), max: sheetFraction(grade.max) }
      : { min: grade.min, max: grade.max },
    rawTriangles: extra.rawTriangles,
    triangles: mesh.indices.length / 3,
    vertices: mesh.positions.length / 3,
    volumeMm3: mass.volumeMm3,
    bodyVolumeMm3: bodyVolume,
    solidFraction: bodyVolume > 0 ? mass.volumeMm3 / bodyVolume : 0,
    ...(wall ? { measuredWallMm: wall } : {}),
    ...(skin ? { measuredSkinMm: skin } : {}),
    watertight: topo.watertight,
    consistentOrientation: topo.consistentOrientation,
    timingsMs: {},
  };
}

/** Wall samples come from triangles off the outer surface, skin samples
 *  from triangles on it (|B| at the centroid under a quarter grid step). */
function thicknessByRegion(
  mesh: IndexedMesh, solid: (x: number, y: number, z: number) => number, step: number,
  spec: LatticeBuildSpec, onOuter: (x: number, y: number, z: number) => boolean,
): { wall?: ThicknessStats; skin?: ThicknessStats } {
  const P = mesh.positions, I = mesh.indices;
  const outer: number[] = [], inner: number[] = [];
  for (let t = 0; t < I.length; t += 3) {
    const a = 3 * I[t], b = 3 * I[t + 1], c = 3 * I[t + 2];
    const on = onOuter((P[a] + P[b] + P[c]) / 3, (P[a + 1] + P[b + 1] + P[c + 1]) / 3, (P[a + 2] + P[b + 2] + P[c + 2]) / 3);
    (on ? outer : inner).push(I[t], I[t + 1], I[t + 2]);
  }
  const maxDepth = Math.max(spec.skin, spec.cell) * 2;
  const run = (list: number[]): ThicknessStats | undefined => {
    const idx = Uint32Array.from(list);
    return measureThickness(P, idx, { from: 0, to: idx.length }, solid, step, 3000, maxDepth);
  };
  const wall = run(inner);
  const skin = spec.skin > 0 ? run(outer) : undefined;
  return { ...(wall ? { wall } : {}), ...(skin ? { skin } : {}) };
}
