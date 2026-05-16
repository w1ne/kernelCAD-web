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
import type { Editable } from '../runtime/paramRef';
import { currentValue, currentBool } from '../runtime/editableHelpers';
import type { ParamTable } from '../runtime/paramTable';

// User-facing opts allow Editable<number> for editable numeric fields. The
// validator + serializer machinery internally splits into a "resolved" view
// (numbers only, for validation) and the original Editable view (for the
// serializer that writes symbolic refs into Param records).

export interface EditableHoleCounterbore { diameter: Editable<number>; depth: Editable<number> }
export interface EditableHoleCountersink { diameter: Editable<number>; angleDeg?: Editable<number> }
export interface HoleCounterbore { diameter: number; depth: number }
export interface HoleCountersink { diameter: number; angleDeg?: number }

export interface EditableHoleOpts {
  u: Editable<number>;
  v: Editable<number>;
  diameter: Editable<number>;
  depth?: Editable<number> | 'through';
  upToFace?: FaceRef;
  counterbore?: EditableHoleCounterbore;
  countersink?: EditableHoleCountersink;
  /** Optional agent-chosen feature name. When set, downstream selectors can
   *  address the bore as `<name>.wall`, `<name>.floor`, etc. Validated
   *  against `/^[a-zA-Z][a-zA-Z0-9_-]{0,31}$/`. */
  name?: string;
  /** Slice-3: when set, the lowerer treats this record as a passthrough on
   *  `false`. Ships in Phase 4. */
  enabled?: Editable<boolean>;
}

export interface HoleOpts {
  u: number;
  v: number;
  diameter: number;
  depth?: number | 'through';
  upToFace?: FaceRef;
  counterbore?: HoleCounterbore;
  countersink?: HoleCountersink;
  name?: string;
  enabled?: boolean;
}

export interface EditableHolesOpts {
  positions: Array<{ u: Editable<number>; v: Editable<number> }>;
  diameter: Editable<number>;
  depth?: Editable<number> | 'through';
  upToFace?: FaceRef;
  counterbore?: EditableHoleCounterbore;
  countersink?: EditableHoleCountersink;
  name?: string;
  enabled?: Editable<boolean>;
}

export interface HolesOpts {
  positions: Array<{ u: number; v: number }>;
  diameter: number;
  depth?: number | 'through';
  upToFace?: FaceRef;
  counterbore?: HoleCounterbore;
  countersink?: HoleCountersink;
  name?: string;
  enabled?: boolean;
}

/** Resolve every Editable field in EditableHoleOpts to its current numeric/
 *  boolean value at capture time, using the session's param table for symbolic
 *  refs. Used to feed the strict-typed validator (and to detect bound errors
 *  early — at declare/edit time rather than deferring to lower). */
export function resolveHoleOpts(opts: EditableHoleOpts, table: ParamTable): HoleOpts {
  const out: HoleOpts = {
    u: currentValue(opts.u, table),
    v: currentValue(opts.v, table),
    diameter: currentValue(opts.diameter, table),
    name: opts.name,
  };
  if (opts.depth !== undefined) {
    out.depth = opts.depth === 'through' ? 'through' : currentValue(opts.depth, table);
  }
  if (opts.upToFace !== undefined) out.upToFace = opts.upToFace;
  if (opts.counterbore !== undefined) {
    out.counterbore = {
      diameter: currentValue(opts.counterbore.diameter, table),
      depth: currentValue(opts.counterbore.depth, table),
    };
  }
  if (opts.countersink !== undefined) {
    out.countersink = {
      diameter: currentValue(opts.countersink.diameter, table),
      angleDeg: opts.countersink.angleDeg !== undefined
        ? currentValue(opts.countersink.angleDeg, table)
        : undefined,
    };
  }
  if (opts.enabled !== undefined) {
    out.enabled = currentBool(opts.enabled, table);
  }
  return out;
}

export function resolveHolesOpts(opts: EditableHolesOpts, table: ParamTable): HolesOpts {
  const out: HolesOpts = {
    positions: opts.positions.map((p) => ({
      u: currentValue(p.u, table),
      v: currentValue(p.v, table),
    })),
    diameter: currentValue(opts.diameter, table),
    name: opts.name,
  };
  if (opts.depth !== undefined) {
    out.depth = opts.depth === 'through' ? 'through' : currentValue(opts.depth, table);
  }
  if (opts.upToFace !== undefined) out.upToFace = opts.upToFace;
  if (opts.counterbore !== undefined) {
    out.counterbore = {
      diameter: currentValue(opts.counterbore.diameter, table),
      depth: currentValue(opts.counterbore.depth, table),
    };
  }
  if (opts.countersink !== undefined) {
    out.countersink = {
      diameter: currentValue(opts.countersink.diameter, table),
      angleDeg: opts.countersink.angleDeg !== undefined
        ? currentValue(opts.countersink.angleDeg, table)
        : undefined,
    };
  }
  if (opts.enabled !== undefined) {
    out.enabled = currentBool(opts.enabled, table);
  }
  return out;
}

const MAX_DIAMETER_MM = 1000;
const DEFAULT_CSK_ANGLE_DEG = 90;

/** Slice-2 feature-name regex: starts with a letter, then letters/digits/
 *  underscores/hyphens, max 32 chars total. */
export const FEATURE_NAME_REGEX = /^[a-zA-Z][a-zA-Z0-9_-]{0,31}$/;

export function validateFeatureName(
  name: string,
  featureId: FeatureId | undefined,
): void {
  if (!FEATURE_NAME_REGEX.test(name)) {
    throw new KernelError(
      'feature.invalid-args',
      `feature name '${name}' is invalid.`,
      featureId,
      `Feature name must start with a letter and contain only letters, digits, underscores, or hyphens (max 32 chars).`,
    );
  }
}

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
  if (opts.name !== undefined) validateFeatureName(opts.name, featureId);
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
  if (opts.name !== undefined) validateFeatureName(opts.name, featureId);
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

// Slice-3: paramMm/Deg accept Editable<number>; toParam() handles the symbolic
// ParamRef case by emitting a Param with `paramRef` set. Pre-resolve at the
// dispatcher substitutes `evaluated` at lower time.
import { toParam, toBoolParam } from '../runtime/editableHelpers';

function paramMm(value: Editable<number>): Param {
  return toParam(value, 'mm');
}

function paramDeg(value: Editable<number>): Param {
  return toParam(value, 'deg');
}

function paramUnitless(value: string | number): Param {
  return {
    expression: typeof value === 'string' ? `'${value}'` : String(value),
    unit: 'unitless',
    evaluated: typeof value === 'number' ? value : 0,
  };
}

// `face` is captured under inputs.face by the proxy via buildFaceInputRef
// (so pickFace can resolve it the same way shell/fillet/chamfer do); it is
// intentionally absent from metadata to avoid the two-source-of-truth trap.
// `upToFace` is only used by the lowerer when 'through' is not the trigger,
// so it lives under metadata for now.

export function serializeHoleParams(_face: FaceSelector, opts: EditableHoleOpts): SerializedHoleCapture {
  const params: Record<string, Param> = {
    u: paramMm(opts.u),
    v: paramMm(opts.v),
    diameter: paramMm(opts.diameter),
  };
  if (typeof opts.depth === 'number' || (typeof opts.depth === 'object' && opts.depth !== null)) {
    params.depth = paramMm(opts.depth as Editable<number>);
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
  const metadata: Record<string, unknown> = {};
  if (opts.upToFace !== undefined) metadata.upToFace = opts.upToFace;
  if (opts.name !== undefined) metadata.name = opts.name;
  // `enabled` is captured under metadata so the dispatcher can read it after
  // pre-resolve. Symbolic ParamRef<boolean> is preserved via `toParam`.
  if (opts.enabled !== undefined) {
    metadata.enabled = toBoolParam(opts.enabled);
  }
  return { params, metadata };
}

export function serializeHolesParams(_face: FaceSelector, opts: EditableHolesOpts): SerializedHoleCapture {
  const params: Record<string, Param> = {
    diameter: paramMm(opts.diameter),
    positionCount: paramUnitless(opts.positions.length),
  };
  if (typeof opts.depth === 'number' || (typeof opts.depth === 'object' && opts.depth !== null)) {
    params.depth = paramMm(opts.depth as Editable<number>);
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
  // Positions: preserve the Editable shape under metadata; emit each u/v as
  // a Param so the pre-resolver substitutes paramRefs at lower time.
  const positionParams = opts.positions.map((p) => ({
    u: paramMm(p.u),
    v: paramMm(p.v),
  }));
  const metadata: Record<string, unknown> = {
    positions: positionParams,
  };
  if (opts.upToFace !== undefined) metadata.upToFace = opts.upToFace;
  if (opts.name !== undefined) metadata.name = opts.name;
  if (opts.enabled !== undefined) {
    metadata.enabled = toBoolParam(opts.enabled);
  }
  return { params, metadata };
}
