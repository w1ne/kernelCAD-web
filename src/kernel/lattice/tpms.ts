// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/lattice/tpms.ts
//
// Triply periodic minimal surface (TPMS) implicit functions.
//
// Each surface is the zero set of a trigonometric level function f(x, y, z)
// with period `cell` (mm) along every axis. Two solids come from one f:
//
//   - sheet:   |f| / |grad f| < wall / 2   (a wall of thickness `wall`
//              centred on the minimal surface; both void networks stay open)
//   - network: f < t                       (one of the two labyrinths filled;
//              the level t is chosen for a target solid fraction)
//
// f / |grad f| is the first-order distance to the level set, so a sheet's
// wall thickness is `wall` to first order everywhere on the surface. Solid
// fraction <-> parameter maps are measured by sampling one unit cell (the
// fraction of points with f < t, or with |f|/|grad f| < w/2, is exactly the
// solid fraction of an infinite lattice), not taken from a fitted formula.

export const TPMS_TYPES = ['gyroid', 'schwarzP', 'diamond', 'neovius'] as const;
export type TpmsType = (typeof TPMS_TYPES)[number];

export const TPMS_VARIANTS = ['sheet', 'network'] as const;
export type TpmsVariant = (typeof TPMS_VARIANTS)[number];

/** Minimal-surface area per unit cell, in units of cell^2 (literature values
 *  for the f = 0 surface). Sheet solid fraction ~= area * wall / cell. */
export const TPMS_AREA_PER_CELL: Readonly<Record<TpmsType, number>> = {
  gyroid: 3.0915,
  schwarzP: 2.3451,
  diamond: 3.8377,
  neovius: 3.66,
};

const TWO_PI = 2 * Math.PI;

/** Level value and gradient (per unit of the angular argument) at angular
 *  coordinates x, y, z. Writes [f, fx, fy, fz] into `out`. */
export type TpmsKernel = (x: number, y: number, z: number, out: Float64Array) => void;

function gyroid(x: number, y: number, z: number, out: Float64Array): void {
  const sx = Math.sin(x), cx = Math.cos(x);
  const sy = Math.sin(y), cy = Math.cos(y);
  const sz = Math.sin(z), cz = Math.cos(z);
  out[0] = sx * cy + sy * cz + sz * cx;
  out[1] = cx * cy - sz * sx;
  out[2] = -sx * sy + cy * cz;
  out[3] = -sy * sz + cz * cx;
}

function schwarzP(x: number, y: number, z: number, out: Float64Array): void {
  out[0] = Math.cos(x) + Math.cos(y) + Math.cos(z);
  out[1] = -Math.sin(x);
  out[2] = -Math.sin(y);
  out[3] = -Math.sin(z);
}

function diamond(x: number, y: number, z: number, out: Float64Array): void {
  const sx = Math.sin(x), cx = Math.cos(x);
  const sy = Math.sin(y), cy = Math.cos(y);
  const sz = Math.sin(z), cz = Math.cos(z);
  out[0] = sx * sy * sz + sx * cy * cz + cx * sy * cz + cx * cy * sz;
  out[1] = cx * sy * sz + cx * cy * cz - sx * sy * cz - sx * cy * sz;
  out[2] = sx * cy * sz - sx * sy * cz + cx * cy * cz - cx * sy * sz;
  out[3] = sx * sy * cz - sx * cy * sz - cx * sy * sz + cx * cy * cz;
}

function neovius(x: number, y: number, z: number, out: Float64Array): void {
  const sx = Math.sin(x), cx = Math.cos(x);
  const sy = Math.sin(y), cy = Math.cos(y);
  const sz = Math.sin(z), cz = Math.cos(z);
  out[0] = 3 * (cx + cy + cz) + 4 * cx * cy * cz;
  out[1] = -3 * sx - 4 * sx * cy * cz;
  out[2] = -3 * sy - 4 * cx * sy * cz;
  out[3] = -3 * sz - 4 * cx * cy * sz;
}

export const TPMS_KERNELS: Readonly<Record<TpmsType, TpmsKernel>> = { gyroid, schwarzP, diamond, neovius };

/** Raw level value f at a point in mm for a lattice of period `cell`. */
export function tpmsValue(type: TpmsType, cell: number, p: readonly [number, number, number]): number {
  const k = TWO_PI / cell;
  const out = new Float64Array(4);
  TPMS_KERNELS[type](p[0] * k, p[1] * k, p[2] * k, out);
  return out[0];
}

/** First-order signed distance (mm) to the f = level surface:
 *  (f - level) / |grad f|, gradient in mm^-1. */
export function tpmsDistance(
  type: TpmsType,
  cell: number,
  p: readonly [number, number, number],
  level = 0,
): number {
  const k = TWO_PI / cell;
  const out = new Float64Array(4);
  TPMS_KERNELS[type](p[0] * k, p[1] * k, p[2] * k, out);
  const g = k * Math.max(Math.hypot(out[1], out[2], out[3]), 1e-3);
  return (out[0] - level) / g;
}

// ---------------------------------------------------------------------------
// Solid fraction maps, sampled once per type.

const SAMPLES_PER_AXIS = 28;

interface FractionTable {
  /** Sorted f values over one unit cell. */
  readonly level: Float64Array;
  /** Sorted |f| / |grad f| over one unit cell, in cell units. */
  readonly halfWall: Float64Array;
}

const tables = new Map<TpmsType, FractionTable>();

function fractionTable(type: TpmsType): FractionTable {
  const cached = tables.get(type);
  if (cached) return cached;
  const n = SAMPLES_PER_AXIS;
  const level = new Float64Array(n * n * n);
  const halfWall = new Float64Array(n * n * n);
  const out = new Float64Array(4);
  const kernel = TPMS_KERNELS[type];
  let i = 0;
  for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) for (let c = 0; c < n; c++) {
    // Cell-centred samples; angular period 2 pi.
    kernel(TWO_PI * (a + 0.5) / n, TWO_PI * (b + 0.5) / n, TWO_PI * (c + 0.5) / n, out);
    level[i] = out[0];
    halfWall[i] = Math.abs(out[0]) / (TWO_PI * Math.max(Math.hypot(out[1], out[2], out[3]), 1e-3));
    i++;
  }
  level.sort();
  halfWall.sort();
  const table = { level, halfWall };
  tables.set(type, table);
  return table;
}

function quantile(sorted: Float64Array, q: number): number {
  const x = Math.min(Math.max(q, 0), 1) * (sorted.length - 1);
  const i = Math.floor(x);
  const j = Math.min(i + 1, sorted.length - 1);
  return sorted[i] + (sorted[j] - sorted[i]) * (x - i);
}

function rank(sorted: Float64Array, v: number): number {
  let lo = 0, hi = sorted.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (sorted[mid] < v) lo = mid + 1; else hi = mid;
  }
  return lo / sorted.length;
}

/** Network level t whose solid {f < t} fills `fraction` of space. */
export function networkLevelForFraction(type: TpmsType, fraction: number): number {
  return quantile(fractionTable(type).level, fraction);
}

/** Solid fraction of the network {f < level}. */
export function networkFractionForLevel(type: TpmsType, level: number): number {
  return rank(fractionTable(type).level, level);
}

/** Sheet wall (mm) whose solid fills `fraction` of space at period `cell`. */
export function sheetWallForFraction(type: TpmsType, cell: number, fraction: number): number {
  return 2 * cell * quantile(fractionTable(type).halfWall, fraction);
}

/** Solid fraction of a sheet of wall `wall` (mm) at period `cell`. */
export function sheetFractionForWall(type: TpmsType, cell: number, wall: number): number {
  return rank(fractionTable(type).halfWall, wall / (2 * cell));
}
