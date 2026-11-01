// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/lattice/latticeCapture.ts
//
// Capture-time validation for `body.lattice({...})`: every option is checked
// here, with a copy-pasteable example, so a bad call fails at the line that
// made it rather than inside the mesher.

import type { CaptureSession } from '../capture/captureSession';
import type { Shape } from '../capture/proxy';
import { invalidArgs } from '../../shared/intent/invalidArgs';
import type { Param } from '../../shared/intent/types';
import { toParam } from '../../shared/runtime/editableHelpers';
import type { Editable } from '../../shared/runtime/paramRef';
import {
  LATTICE_FRAMES,
  LATTICE_GRADE_SOURCES,
  LATTICE_TYPES,
  LATTICE_VARIANTS,
  type LatticeGradeMetadata,
  type LatticeMetadata,
  type LatticeStressBand,
} from '../../shared/intent/latticeRecord';

/** Author-facing options of `Shape.lattice`. */
export interface LatticeOptions {
  /** TPMS family. Default 'gyroid'. */
  type?: 'gyroid' | 'schwarzP' | 'diamond' | 'neovius';
  /** 'sheet' (wall of `wall` mm on the minimal surface, both channel
   *  networks open) or 'network' (one labyrinth filled, `density` solid
   *  fraction). Default 'sheet'. */
  variant?: 'sheet' | 'network';
  /** Cell size (period), mm. */
  cell: Editable<number>;
  /** sheet: wall thickness, mm. Default max(0.8, cell / 10). */
  wall?: Editable<number>;
  /** Solid fraction of the lattice, 0.05-0.9 (network default 0.3; for a
   *  sheet it sets the wall instead of `wall`). */
  density?: Editable<number>;
  /** Solid outer skin, mm; 0 leaves the cells open at the surface. Default 1.2. */
  skin?: Editable<number>;
  /** Wall / density grading. */
  grade?: {
    from: 'surface' | 'holes' | 'fea';
    near?: number;
    far?: number;
    over?: number;
    study?: string;
    bands?: LatticeStressBand[];
  };
  /** Cell orientation: 'part' (the host primitive's own frame — follows
   *  its rotations), 'world', or 'cylindrical' (cells wrap around the part
   *  frame's Z axis). Default 'part'. */
  frame?: 'part' | 'world' | 'cylindrical';
  /** cylindrical: explicit axis. */
  axis?: { origin: [number, number, number]; direction: [number, number, number] };
  /** Sample-grid step, mm (default cell / 8). */
  resolution?: number;
  /** Mesh decimation tolerance, mm (default grid step / 10; 0 = off). */
  tolerance?: number;
}

const API = 'lattice({ type, variant, cell, wall | density, skin, grade, frame })';
const EXAMPLE = "body.lattice({ type: 'gyroid', cell: 6, wall: 0.8, skin: 1.2 })";

function fail(path: string, got: unknown, requires: string, unit?: string): never {
  return invalidArgs({ api: API, path, got, requires, example: EXAMPLE, ...(unit ? { unit } : {}) });
}

function oneOf<T extends string>(path: string, v: unknown, allowed: readonly T[], dflt: T): T {
  if (v === undefined) return dflt;
  if (typeof v !== 'string' || !(allowed as readonly string[]).includes(v)) {
    fail(path, v, `one of ${allowed.map((a) => `'${a}'`).join(', ')}`);
  }
  return v as T;
}

function finiteIn(path: string, v: unknown, lo: number, hi: number, unit?: string): number {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < lo || v > hi) {
    fail(path, v, `a finite number in [${lo}, ${hi}]`, unit);
  }
  return v;
}

function editableIn(path: string, v: Editable<number>, lo: number, hi: number, unit: 'mm' | 'ratio'): Param {
  const p = toParam(v, unit === 'mm' ? 'mm' : 'unitless');
  finiteIn(path, p.evaluated, lo, hi, unit);
  return p;
}

function validateBands(bands: unknown): LatticeStressBand[] {
  if (!Array.isArray(bands) || bands.length < 2) fail('opts.grade.bands', bands, 'at least 2 bands [{ name, fromYield, densityPercent }]');
  return bands.map((b, i) => {
    const band = b as Partial<LatticeStressBand>;
    if (typeof band.name !== 'string' || band.name.length === 0) fail(`opts.grade.bands[${i}].name`, band.name, 'a non-empty string');
    finiteIn(`opts.grade.bands[${i}].fromYield`, band.fromYield, 0, 10);
    finiteIn(`opts.grade.bands[${i}].densityPercent`, band.densityPercent, 5, 90);
    if (i === 0 && band.fromYield !== 0) fail('opts.grade.bands[0].fromYield', band.fromYield, '0 (the first band starts at zero stress)');
    if (i > 0 && !(band.fromYield! > (bands[i - 1] as LatticeStressBand).fromYield)) {
      fail(`opts.grade.bands[${i}].fromYield`, band.fromYield, 'strictly increasing fromYield');
    }
    return { name: band.name!, fromYield: band.fromYield!, densityPercent: band.densityPercent! };
  });
}

function validateFeaGrade(g: NonNullable<LatticeOptions['grade']>): LatticeGradeMetadata {
  if (g.study !== undefined && (typeof g.study !== 'string' || g.study.length === 0)) fail('opts.grade.study', g.study, 'a feaStudy name');
  return { from: 'fea', ...(g.study !== undefined ? { study: g.study } : {}), ...(g.bands !== undefined ? { bands: validateBands(g.bands) } : {}) };
}

function validateGrade(g: LatticeOptions['grade'], variant: 'sheet' | 'network', cell: number): LatticeGradeMetadata | undefined {
  if (g === undefined) return undefined;
  if (typeof g !== 'object' || g === null) fail('opts.grade', g, "an object such as { from: 'surface', near: 1.2, over: 8 }");
  const from = oneOf('opts.grade.from', g.from, LATTICE_GRADE_SOURCES, 'surface');
  if (from === 'fea') return validateFeaGrade(g);
  const [lo, hi, unit] = variant === 'sheet' ? [0.1, cell / 2, 'mm'] : [0.05, 0.9, 'ratio'];
  if (g.near === undefined) fail('opts.grade.near', g.near, `the ${variant === 'sheet' ? 'wall (mm)' : 'solid fraction'} at the ${from}`);
  const near = finiteIn('opts.grade.near', g.near, lo, hi, unit);
  const over = g.over === undefined ? 2 * cell : finiteIn('opts.grade.over', g.over, 0.1, 1000, 'mm');
  if (g.far === undefined) return { from, near, over };
  return { from, near, far: finiteIn('opts.grade.far', g.far, lo, hi, unit), over };
}

function validateAxis(axis: LatticeOptions['axis']): LatticeMetadata['axis'] {
  if (axis === undefined) return undefined;
  const ok = (v: unknown): v is [number, number, number] =>
    Array.isArray(v) && v.length === 3 && v.every((c) => typeof c === 'number' && Number.isFinite(c));
  if (!axis || !ok(axis.origin)) fail('opts.axis.origin', axis?.origin, 'a [x, y, z] point, mm');
  if (!ok(axis.direction) || Math.hypot(...axis.direction) === 0) fail('opts.axis.direction', axis.direction, 'a non-zero [x, y, z] direction');
  return { origin: [...axis.origin], direction: [...axis.direction] };
}

/** Design-value params (cell, wall | density, skin) and which value the author gave. */
function designParams(opts: LatticeOptions, variant: 'sheet' | 'network'): { params: Record<string, Param>; valueKind: 'wall' | 'density' } {
  if (opts.cell === undefined) fail('opts.cell', opts.cell, 'the cell size (period) in mm, e.g. 6', 'mm');
  const cellP = editableIn('opts.cell', opts.cell, 1, 200, 'mm');
  const cell = cellP.evaluated;
  const params: Record<string, Param> = { cell: cellP };
  const skin = opts.skin === undefined ? toParam(1.2, 'mm') : editableIn('opts.skin', opts.skin, 0, 50, 'mm');
  if (variant === 'sheet' && opts.density === undefined) {
    params.wall = opts.wall === undefined
      ? toParam(Math.max(0.8, cell / 10), 'mm')
      : editableIn('opts.wall', opts.wall, 0.1, cell / 2, 'mm');
    return { params: { ...params, skin }, valueKind: 'wall' };
  }
  if (variant === 'network' && opts.wall !== undefined) fail('opts.wall', opts.wall, "no wall for variant 'network' — give density (solid fraction) instead");
  params.density = opts.density === undefined ? toParam(0.3, 'unitless') : editableIn('opts.density', opts.density, 0.05, 0.9, 'ratio');
  return { params: { ...params, skin }, valueKind: 'density' };
}

function optionalIn(path: string, v: number | undefined, lo: number, hi: number): number | undefined {
  return v === undefined ? undefined : finiteIn(path, v, lo, hi, 'mm');
}

/** Validate options and capture the 'lattice' record on `base`. */
export function captureLattice(session: CaptureSession, base: Shape, opts: LatticeOptions): Shape {
  if (typeof opts !== 'object' || opts === null) fail('opts', opts, 'an options object');
  const type = oneOf('opts.type', opts.type, LATTICE_TYPES, 'gyroid');
  const variant = oneOf('opts.variant', opts.variant, LATTICE_VARIANTS, 'sheet');
  const frame = oneOf('opts.frame', opts.frame, LATTICE_FRAMES, 'part');
  const { params, valueKind } = designParams(opts, variant);
  const cell = params.cell.evaluated;
  const grade = validateGrade(opts.grade, variant, cell);
  const axis = validateAxis(opts.axis);
  const resolution = optionalIn('opts.resolution', opts.resolution, 0.05, cell / 2);
  const tolerance = optionalIn('opts.tolerance', opts.tolerance, 0, 1);
  const lattice: LatticeMetadata = {
    type, variant, valueKind, frame,
    ...(axis ? { axis } : {}),
    ...(grade ? { grade } : {}),
    ...(resolution !== undefined ? { resolution } : {}),
    ...(tolerance !== undefined ? { tolerance } : {}),
  };
  return session.createShape({
    kind: 'lattice',
    inputs: { base: { kind: 'feature', id: base.id } },
    params,
    metadata: { lattice },
  });
}
