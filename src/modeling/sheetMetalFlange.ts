// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Thin API sugar over Shape.bend for edge flanges, hems, and corner relief
// metadata. No new OCCT lowerers — folds still lower as sheetMetalBend.

import { invalidArgs } from '../shared/intent/invalidArgs';

export type HemType = 'open' | 'closed' | 'teardrop';
export type CornerReliefType = 'none' | 'circular' | 'square' | 'obround' | 'tear';

export interface EdgeFlangeOpts {
  /** Flange length along the face normal direction after the bend (mm). */
  length: number;
  /** Fold angle in degrees. Defaults to 90. */
  angle?: number;
  /** Inner bend radius (mm). When omitted, caller should fill from thickness. */
  radius?: number | null;
}

export interface HemOpts {
  /** Hem type. */
  type: HemType;
  /** Hem return length (mm). */
  length: number;
  /** Inner bend radius (mm). When omitted, caller fills from thickness. */
  radius?: number | null;
}

export interface CornerReliefOpts {
  type: CornerReliefType;
  /** Relief size (mm). Required unless type is 'none'. */
  size?: number;
}

export interface BendSugarArgs {
  angle: number;
  /** null means "caller fills from sheet thickness". */
  radius: number | null;
  metadata: Record<string, string | number | boolean>;
}

function requirePositive(api: string, path: string, got: unknown, example: string): number {
  if (typeof got !== 'number' || !Number.isFinite(got) || got <= 0) {
    invalidArgs({
      api,
      path,
      got,
      showType: typeof got !== 'number',
      requires: 'a finite number > 0 (mm)',
      unit: 'mm',
      example,
    });
  }
  return got;
}

function optionalRadius(api: string, radius: number | null | undefined, example: string): number | null {
  if (radius === undefined || radius === null) return null;
  return requirePositive(api, 'radius', radius, example);
}

export function normalizeEdgeFlangeOpts(opts: EdgeFlangeOpts): Required<Pick<EdgeFlangeOpts, 'length' | 'angle'>> & { radius: number | null } {
  const api = 'edgeFlange(edgeRef, opts)';
  const example = "blank.edgeFlange({ atX: 50 }, { length: 20, angle: 90, radius: 1.5 })";
  if (opts === null || typeof opts !== 'object') {
    invalidArgs({
      api,
      path: 'opts',
      got: opts,
      showType: true,
      requires: 'an options object { length, angle?, radius? }',
      example,
    });
  }
  const length = requirePositive(api, 'length', opts.length, example);
  const angle = opts.angle === undefined ? 90 : opts.angle;
  if (typeof angle !== 'number' || !Number.isFinite(angle)) {
    invalidArgs({
      api,
      path: 'angle',
      got: opts.angle,
      showType: typeof opts.angle !== 'number',
      requires: 'a finite fold angle in degrees (default 90)',
      unit: 'deg',
      example,
    });
  }
  return { length, angle, radius: optionalRadius(api, opts.radius, example) };
}

export function normalizeHemOpts(opts: HemOpts): { type: HemType; length: number; radius: number | null } {
  const api = 'hem(edgeRef, opts)';
  const example = "blank.hem({ atY: 0 }, { type: 'closed', length: 6, radius: 1 })";
  if (opts === null || typeof opts !== 'object') {
    invalidArgs({
      api,
      path: 'opts',
      got: opts,
      showType: true,
      requires: "an options object { type: 'open'|'closed'|'teardrop', length, radius? }",
      example,
    });
  }
  const type = opts.type;
  if (type !== 'open' && type !== 'closed' && type !== 'teardrop') {
    invalidArgs({
      api,
      path: 'type',
      got: opts.type,
      showType: typeof opts.type !== 'string',
      requires: "one of 'open' | 'closed' | 'teardrop'",
      example,
    });
  }
  const length = requirePositive(api, 'length', opts.length, example);
  return { type, length, radius: optionalRadius(api, opts.radius, example) };
}

export function normalizeCornerReliefOpts(opts: CornerReliefOpts): { type: CornerReliefType; size: number | null } {
  const api = 'cornerRelief(opts)';
  const example = "blank.cornerRelief({ type: 'circular', size: 2 })";
  if (opts === null || typeof opts !== 'object') {
    invalidArgs({
      api,
      path: 'opts',
      got: opts,
      showType: true,
      requires: "an options object { type, size? }",
      example,
    });
  }
  const type = opts.type;
  const allowed: CornerReliefType[] = ['none', 'circular', 'square', 'obround', 'tear'];
  if (!allowed.includes(type as CornerReliefType)) {
    invalidArgs({
      api,
      path: 'type',
      got: opts.type,
      showType: typeof opts.type !== 'string',
      requires: "one of 'none' | 'circular' | 'square' | 'obround' | 'tear'",
      example,
    });
  }
  if (type === 'none') return { type, size: null };
  const size = requirePositive(api, 'size', opts.size, example);
  return { type, size };
}

/** Map edge-flange opts to bend(angle, radius) plus metadata for DFM/docs. */
export function edgeFlangeToBendArgs(opts: EdgeFlangeOpts): BendSugarArgs {
  const n = normalizeEdgeFlangeOpts(opts);
  return {
    angle: n.angle,
    radius: n.radius,
    metadata: {
      sheetMetalSugar: 'edgeFlange',
      flangeLength: n.length,
      flangeAngle: n.angle,
    },
  };
}

/** Hem ≈ 180° bend with hem metadata. Open hems use slightly under 180. */
export function hemToBendArgs(opts: HemOpts): BendSugarArgs {
  const n = normalizeHemOpts(opts);
  const angle = n.type === 'open' ? 170 : 180;
  return {
    angle,
    radius: n.radius,
    metadata: {
      sheetMetalSugar: 'hem',
      hemType: n.type,
      hemLength: n.length,
    },
  };
}

export function cornerReliefMetadata(opts: CornerReliefOpts): Record<string, string | number | boolean> {
  const n = normalizeCornerReliefOpts(opts);
  return {
    sheetMetalSugar: 'cornerRelief',
    reliefType: n.type,
    ...(n.size !== null ? { reliefSize: n.size } : {}),
  };
}
