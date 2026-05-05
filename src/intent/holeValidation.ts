// src/intent/holeValidation.ts
//
// Script-time validators for `Shape.hole(face, opts)` and
// `Shape.holes(face, opts)`. Every trigger throws
// `KernelError('feature.invalid-args', msg, featureId, hint)` per the
// post-milestone-C closed vocabulary policy. Hints are imperative and
// identify the offending field by name + value.
//
// Source: spec 2026-05-05-v0.3-slice1-hole-cutout-design §D.1.

import { KernelError } from './kernelError';
import type { FeatureId, FaceRef, Param } from './types';
import type { FaceSelector } from '../capture/proxy';

export interface HoleCounterbore { diameter: number; depth: number }
export interface HoleCountersink { diameter: number; angleDeg?: number }

export interface HoleOpts {
  u: number;
  v: number;
  diameter: number;
  depth?: number | 'through';
  upToFace?: FaceRef;
  counterbore?: HoleCounterbore;
  countersink?: HoleCountersink;
}

export interface HolesOpts {
  positions: Array<{ u: number; v: number }>;
  diameter: number;
  depth?: number | 'through';
  upToFace?: FaceRef;
  counterbore?: HoleCounterbore;
  countersink?: HoleCountersink;
}

const MAX_DIAMETER_MM = 1000;
const DEFAULT_CSK_ANGLE_DEG = 90;

function isFiniteNumber(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n);
}

/** Validate the shared parts of HoleOpts / HolesOpts (everything except positions). */
function validateCommonHoleFields(
  opts: HoleOpts | HolesOpts,
  featureId: FeatureId | undefined,
): void {
  // Depth-required / depth-conflict
  if (opts.depth === undefined && opts.upToFace === undefined) {
    throw new KernelError(
      'feature.invalid-args',
      'hole: neither depth nor upToFace was set; one of them is required.',
      featureId,
      "Set either depth (number or 'through') or upToFace; one is required.",
    );
  }
  if (opts.depth !== undefined && opts.upToFace !== undefined) {
    throw new KernelError(
      'feature.invalid-args',
      'hole: both depth and upToFace were set; they are mutually exclusive.',
      featureId,
      'Set depth or upToFace, not both.',
    );
  }
  // Numeric depth (when not 'through') must be positive
  if (typeof opts.depth === 'number') {
    if (!isFiniteNumber(opts.depth) || opts.depth <= 0) {
      throw new KernelError(
        'feature.invalid-args',
        `hole: depth (${opts.depth}) must be positive.`,
        featureId,
        "hole depth must be positive. Use 'through' if you want to clip at the back face.",
      );
    }
  }
  // cb / cs mutual exclusion
  if (opts.counterbore !== undefined && opts.countersink !== undefined) {
    throw new KernelError(
      'feature.invalid-args',
      'hole: counterbore and countersink were both set.',
      featureId,
      'counterbore and countersink are mutually exclusive on a single hole. Chain two .hole() calls if you need both effects.',
    );
  }
  // Diameter
  if (!isFiniteNumber(opts.diameter) || opts.diameter <= 0 || opts.diameter > MAX_DIAMETER_MM) {
    throw new KernelError(
      'feature.invalid-args',
      `hole: diameter (${opts.diameter}) must be a finite number > 0 and ≤ ${MAX_DIAMETER_MM} mm.`,
      featureId,
      `diameter (${opts.diameter}) must be > 0 and ≤ ${MAX_DIAMETER_MM} mm.`,
    );
  }
  // Counterbore checks
  if (opts.counterbore !== undefined) {
    const cb = opts.counterbore;
    if (!isFiniteNumber(cb.diameter) || cb.diameter <= opts.diameter) {
      throw new KernelError(
        'feature.invalid-args',
        `hole: counterbore.diameter (${cb.diameter}) must be greater than diameter (${opts.diameter}).`,
        featureId,
        `counterbore.diameter (${cb.diameter}) must be greater than diameter (${opts.diameter}). Counterbore is the wider shoulder; if you want a narrower top, use countersink instead.`,
      );
    }
    if (!isFiniteNumber(cb.depth) || cb.depth <= 0) {
      throw new KernelError(
        'feature.invalid-args',
        `hole: counterbore.depth (${cb.depth}) must be positive.`,
        featureId,
        'counterbore.depth must be a positive finite number.',
      );
    }
  }
  // Countersink checks
  if (opts.countersink !== undefined) {
    const cs = opts.countersink;
    if (!isFiniteNumber(cs.diameter) || cs.diameter <= opts.diameter) {
      throw new KernelError(
        'feature.invalid-args',
        `hole: countersink.diameter (${cs.diameter}) must be greater than diameter (${opts.diameter}).`,
        featureId,
        `countersink.diameter (${cs.diameter}) must be greater than diameter (${opts.diameter}).`,
      );
    }
    const angle = cs.angleDeg ?? DEFAULT_CSK_ANGLE_DEG;
    if (!isFiniteNumber(angle) || angle <= 0 || angle >= 180) {
      throw new KernelError(
        'feature.invalid-args',
        `hole: countersink.angleDeg (${angle}) must be in (0, 180).`,
        featureId,
        `countersink.angleDeg (${angle}) must be in (0, 180); the typical value is 82 or 90.`,
      );
    }
  }
}

export function validateHoleOpts(opts: HoleOpts, featureId: FeatureId | undefined): void {
  if (!isFiniteNumber(opts.u) || !isFiniteNumber(opts.v)) {
    throw new KernelError(
      'feature.invalid-args',
      `hole: position {u: ${opts.u}, v: ${opts.v}} must be finite numbers.`,
      featureId,
      `Hole position {u, v} must be finite numbers.`,
    );
  }
  validateCommonHoleFields(opts, featureId);
}

export function validateHolesOpts(opts: HolesOpts, featureId: FeatureId | undefined): void {
  if (!Array.isArray(opts.positions) || opts.positions.length === 0) {
    throw new KernelError(
      'feature.invalid-args',
      'holes: positions array must contain at least one entry.',
      featureId,
      'holes() requires at least one position. For a single hole, use .hole() instead.',
    );
  }
  for (let i = 0; i < opts.positions.length; i++) {
    const p = opts.positions[i];
    if (
      !p ||
      typeof p !== 'object' ||
      !isFiniteNumber((p as { u?: unknown }).u) ||
      !isFiniteNumber((p as { v?: unknown }).v)
    ) {
      throw new KernelError(
        'feature.invalid-args',
        `holes: positions[${i}] = ${JSON.stringify(p)} must be { u: number, v: number } with finite values.`,
        featureId,
        `Hole position {u, v} must be finite numbers.`,
      );
    }
  }
  validateCommonHoleFields(opts, featureId);
}

// ---------------------------------------------------------------------------
// Param serialization (capture-time)
//
// The capture layer stores numbers as `Param` records with expression / unit /
// evaluated. The serializers here turn HoleOpts / HolesOpts into the flat
// `Record<string, Param>` shape that FeatureRecord.params expects.
//
// The `face` selector and `upToFace` are stored under metadata (not Params) —
// see serializeHoleParams for the shape. The lowerer in Phase 2 reads these
// back via the existing FaceSelector resolver.

export interface SerializedHoleCapture {
  params: Record<string, Param>;
  metadata: Record<string, unknown>;
}

function paramMm(value: number): Param {
  return { expression: String(value), unit: 'mm', evaluated: value };
}

function paramDeg(value: number): Param {
  return { expression: String(value), unit: 'deg', evaluated: value };
}

function paramUnitless(value: string | number): Param {
  return {
    expression: typeof value === 'string' ? `'${value}'` : String(value),
    unit: 'unitless',
    evaluated: typeof value === 'number' ? value : 0,
  };
}

export function serializeHoleParams(face: FaceSelector, opts: HoleOpts): SerializedHoleCapture {
  const params: Record<string, Param> = {
    u: paramMm(opts.u),
    v: paramMm(opts.v),
    diameter: paramMm(opts.diameter),
  };
  if (typeof opts.depth === 'number') {
    params.depth = paramMm(opts.depth);
  } else if (opts.depth === 'through') {
    params.depthMode = paramUnitless('through');
  }
  if (opts.counterbore) {
    params.counterboreDiameter = paramMm(opts.counterbore.diameter);
    params.counterboreDepth = paramMm(opts.counterbore.depth);
  }
  if (opts.countersink) {
    params.countersinkDiameter = paramMm(opts.countersink.diameter);
    params.countersinkAngleDeg = paramDeg(opts.countersink.angleDeg ?? DEFAULT_CSK_ANGLE_DEG);
  }
  const metadata: Record<string, unknown> = { face };
  if (opts.upToFace !== undefined) metadata.upToFace = opts.upToFace;
  return { params, metadata };
}

export function serializeHolesParams(face: FaceSelector, opts: HolesOpts): SerializedHoleCapture {
  const params: Record<string, Param> = {
    diameter: paramMm(opts.diameter),
    positionCount: paramUnitless(opts.positions.length),
  };
  if (typeof opts.depth === 'number') {
    params.depth = paramMm(opts.depth);
  } else if (opts.depth === 'through') {
    params.depthMode = paramUnitless('through');
  }
  if (opts.counterbore) {
    params.counterboreDiameter = paramMm(opts.counterbore.diameter);
    params.counterboreDepth = paramMm(opts.counterbore.depth);
  }
  if (opts.countersink) {
    params.countersinkDiameter = paramMm(opts.countersink.diameter);
    params.countersinkAngleDeg = paramDeg(opts.countersink.angleDeg ?? DEFAULT_CSK_ANGLE_DEG);
  }
  const metadata: Record<string, unknown> = {
    face,
    positions: opts.positions,
  };
  if (opts.upToFace !== undefined) metadata.upToFace = opts.upToFace;
  return { params, metadata };
}
