// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/intent/holeValidation.ts
//
// Script-time validators for `Shape.hole(face, opts)` and
// `Shape.holes(face, opts)`. Every trigger raises `feature.invalid-args`
// through the shared `invalidArgs` helper, so the message always names the
// API + argument path, the received value, the requirement (with units, and
// with BOTH values when the cause is a relationship such as
// `counterbore.diameter > diameter`), and one inline example.
//
// Source: spec 2026-05-05-v0.3-slice1-hole-cutout-design §D.1.

import { invalidArgs } from '../../shared/intent/invalidArgs';
import { formatScalarForError } from '../../shared/intent/types';
import type { FeatureId, FaceRef, Param } from '../../shared/intent/types';
import type { FaceSelector } from '../capture/proxy';
import type { Editable } from '../../shared/runtime/paramRef';
import { currentValue, currentBool } from '../../shared/runtime/editableHelpers';
import type { ParamTable } from '../../shared/runtime/paramTable';

// User-facing opts allow Editable<number> for editable numeric fields. The
// validator + serializer machinery internally splits into a "resolved" view
// (numbers only, for validation) and the original Editable view (for the
// serializer that writes symbolic refs into Param records).

/**
 * Internal ISO metric thread on a hole. With `thread` set, the hole's
 * `diameter` is the NOMINAL (major) thread diameter; the bore is drilled at the
 * ISO 68-1 minor diameter `diameter − 1.0825·pitch` (plus 2·clearance).
 * `modeled: true` also cuts the 60° helical groove (right-hand, basic
 * profile grown by `clearance`); `modeled: false` (default) is a cosmetic
 * thread: the minor-diameter bore plus the recorded thread params, no helical
 * geometry.
 */
export interface EditableHoleThread {
  pitch: Editable<number>;
  modeled?: boolean;
  clearance?: Editable<number>;
}
export interface HoleThread { pitch: number; modeled?: boolean; clearance?: number }

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
  /** Internal ISO metric thread; `diameter` becomes the nominal size. */
  thread?: EditableHoleThread;
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
  thread?: HoleThread;
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
  thread?: EditableHoleThread;
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
  thread?: HoleThread;
  name?: string;
  enabled?: boolean;
}

function resolveThread(thread: EditableHoleThread | undefined, table: ParamTable): HoleThread | undefined {
  if (thread === undefined) return undefined;
  if (typeof thread !== 'object' || thread === null) return thread as unknown as HoleThread;
  return {
    pitch: currentValue(thread.pitch, table),
    modeled: thread.modeled,
    clearance: thread.clearance === undefined ? undefined : currentValue(thread.clearance, table),
  };
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
  if (opts.thread !== undefined) out.thread = resolveThread(opts.thread, table);
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
  if (opts.thread !== undefined) out.thread = resolveThread(opts.thread, table);
  if (opts.enabled !== undefined) {
    out.enabled = currentBool(opts.enabled, table);
  }
  return out;
}

const MAX_DIAMETER_MM = 1000;
const DEFAULT_CSK_ANGLE_DEG = 90;

/** One minimal correct call, reused as the inline example on every hole
 *  message so the agent always sees a complete, copy-pasteable shape. */
const HOLE_EXAMPLE = "plate.hole(top, { u: 10, v: 10, diameter: 3.4, depth: 'through' })";
const HOLES_EXAMPLE =
  "plate.holes(top, { positions: [{ u: 10, v: 10 }, { u: 30, v: 10 }], diameter: 3.4, depth: 'through' })";

/** `hole(...)` and `holes(...)` share every validator except positions, so the
 *  API label and the example follow the opts shape. */
function holeApi(opts: HoleOpts | HolesOpts, arg: string): string {
  return 'positions' in opts ? `holes(face, { ${arg} })` : `hole(face, { ${arg} })`;
}

function holeExample(opts: HoleOpts | HolesOpts): string {
  return 'positions' in opts ? HOLES_EXAMPLE : HOLE_EXAMPLE;
}

/** Slice-2 feature-name regex: starts with a letter, then letters/digits/
 *  underscores/hyphens, max 32 chars total. Defined in shared/intent/featureName
 *  so paramTable (shared/runtime) can use it without an upward dep into authoring. */
export { FEATURE_NAME_REGEX } from '../../shared/intent/featureName';
import { FEATURE_NAME_REGEX } from '../../shared/intent/featureName';

export function validateFeatureName(
  name: string,
  featureId: FeatureId | undefined,
): void {
  if (!FEATURE_NAME_REGEX.test(name)) {
    invalidArgs({
      api: 'hole(face, { name })',
      path: 'opts.name',
      got: name,
      requires:
        'a string starting with a letter, then only letters, digits, underscores or hyphens, max 32 chars',
      example: "plate.hole(top, { u: 10, v: 10, diameter: 3.4, depth: 'through', name: 'm3-left' })",
      featureId,
    });
  }
}

function isFiniteNumber(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n);
}

// Depth-required / depth-conflict
function validateHoleDepth(opts: HoleOpts | HolesOpts, featureId: FeatureId | undefined): void {
  if (opts.depth === undefined && opts.upToFace === undefined) {
    invalidArgs({
      api: holeApi(opts, 'depth'),
      path: 'opts.depth',
      gotText: 'neither depth nor upToFace',
      requires:
        "exactly one of depth (a number in mm or 'through') or upToFace (a FaceRef); a blind hole needs a depth",
      example: holeExample(opts),
      featureId,
    });
  }
  if (opts.depth !== undefined && opts.upToFace !== undefined) {
    invalidArgs({
      api: holeApi(opts, 'depth, upToFace'),
      path: 'opts.depth + opts.upToFace',
      gotText: `depth ${formatScalarForError(opts.depth)} and upToFace ${formatScalarForError(opts.upToFace)} together`,
      requires: 'exactly one of the two — they are mutually exclusive ways to end the bore',
      example: holeExample(opts),
      featureId,
    });
  }
  // Numeric depth (when not 'through') must be positive
  if (typeof opts.depth === 'number') {
    if (!isFiniteNumber(opts.depth) || opts.depth <= 0) {
      invalidArgs({
        api: holeApi(opts, 'depth'),
        path: 'opts.depth',
        got: opts.depth,
        requires: "a finite number > 0, or the string 'through' to clip at the back face",
        unit: 'mm',
        example: holeExample(opts),
        featureId,
      });
    }
  }
}

// cb / cs mutual exclusion
function validateHoleEndTreatments(opts: HoleOpts | HolesOpts, featureId: FeatureId | undefined): void {
  if (opts.counterbore !== undefined && opts.countersink !== undefined) {
    invalidArgs({
      api: holeApi(opts, 'counterbore, countersink'),
      path: 'opts.counterbore + opts.countersink',
      gotText: 'both counterbore and countersink on one hole',
      requires:
        'at most one of them — chain a second .hole() at the same u/v if you need both end treatments',
      example: `plate.hole(top, { u: 10, v: 10, diameter: 3.4, depth: 'through', counterbore: { diameter: 6.5, depth: 3.5 } })`,
      featureId,
    });
  }
}

// Diameter
function validateHoleDiameter(opts: HoleOpts | HolesOpts, featureId: FeatureId | undefined): void {
  if (!isFiniteNumber(opts.diameter) || opts.diameter <= 0 || opts.diameter > MAX_DIAMETER_MM) {
    invalidArgs({
      api: holeApi(opts, 'diameter'),
      path: 'opts.diameter',
      got: opts.diameter,
      showType: typeof opts.diameter !== 'number',
      requires: `a finite number > 0 and ≤ ${MAX_DIAMETER_MM}; this is the bore diameter, not the radius (M3 clearance is 3.4)`,
      unit: 'mm',
      example: holeExample(opts),
      featureId,
    });
  }
}

// Counterbore checks
function validateHoleCounterbore(opts: HoleOpts | HolesOpts, featureId: FeatureId | undefined): void {
  if (opts.counterbore !== undefined) {
    const cb = opts.counterbore;
    if (!isFiniteNumber(cb.diameter) || cb.diameter <= opts.diameter) {
      invalidArgs({
        api: holeApi(opts, 'counterbore'),
        path: 'opts.counterbore.diameter',
        got: cb.diameter,
        requires:
          `counterbore.diameter > opts.diameter — opts.diameter is ${formatScalarForError(opts.diameter)} mm, so the shoulder must be wider than that; ` +
          'the counterbore is the flat screw-head pocket, use countersink for a tapered one',
        unit: 'mm',
        example:
          "plate.hole(top, { u: 10, v: 10, diameter: 3.4, depth: 'through', counterbore: { diameter: 6.5, depth: 3.5 } })",
        featureId,
      });
    }
    if (!isFiniteNumber(cb.depth) || cb.depth <= 0) {
      invalidArgs({
        api: holeApi(opts, 'counterbore'),
        path: 'opts.counterbore.depth',
        got: cb.depth,
        requires: 'a finite number > 0; this is how deep the head pocket sinks below the face',
        unit: 'mm',
        example:
          "plate.hole(top, { u: 10, v: 10, diameter: 3.4, depth: 'through', counterbore: { diameter: 6.5, depth: 3.5 } })",
        featureId,
      });
    }
  }
}

// Countersink checks
function validateHoleCountersink(opts: HoleOpts | HolesOpts, featureId: FeatureId | undefined): void {
  if (opts.countersink !== undefined) {
    const cs = opts.countersink;
    if (!isFiniteNumber(cs.diameter) || cs.diameter <= opts.diameter) {
      invalidArgs({
        api: holeApi(opts, 'countersink'),
        path: 'opts.countersink.diameter',
        got: cs.diameter,
        requires:
          `countersink.diameter > opts.diameter — opts.diameter is ${formatScalarForError(opts.diameter)} mm, so the cone mouth must be wider than that`,
        unit: 'mm',
        example:
          "plate.hole(top, { u: 10, v: 10, diameter: 3.4, depth: 'through', countersink: { diameter: 6.5, angleDeg: 90 } })",
        featureId,
      });
    }
    const angle = cs.angleDeg ?? DEFAULT_CSK_ANGLE_DEG;
    if (!isFiniteNumber(angle) || angle <= 0 || angle >= 180) {
      invalidArgs({
        api: holeApi(opts, 'countersink'),
        path: 'opts.countersink.angleDeg',
        got: angle,
        requires:
          'the full included cone angle, > 0 and < 180; 90 for ISO 7046 / DIN 965 and 82 for imperial flat heads',
        unit: 'deg',
        example:
          "plate.hole(top, { u: 10, v: 10, diameter: 3.4, depth: 'through', countersink: { diameter: 6.5, angleDeg: 90 } })",
        featureId,
      });
    }
  }
}

/** Validate the shared parts of HoleOpts / HolesOpts (everything except positions). */
function validateCommonHoleFields(
  opts: HoleOpts | HolesOpts,
  featureId: FeatureId | undefined,
): void {
  validateHoleDepth(opts, featureId);
  validateHoleEndTreatments(opts, featureId);
  validateHoleDiameter(opts, featureId);
  validateHoleCounterbore(opts, featureId);
  validateHoleCountersink(opts, featureId);
  if (opts.thread !== undefined) validateThread(opts, featureId);
}

/** Hint for a thread clearance above the pitch/8 cap: say why the cap exists
 *  and, for a print-tolerance request, how to get the extra play by growing
 *  the whole thread (a larger nominal `diameter`) instead. */
function threadClearanceHint(clearance: number, pitch: number, diameter: unknown): string {
  const cap = pitch / 8;
  const why =
    `thread.clearance grows each flank of the internal thread by that many mm; past pitch/8 = ${cap} mm ` +
    'neighbouring groove turns would merge.';
  if (!isFiniteNumber(clearance) || clearance <= cap) return why;
  // A radial shift δ of the whole 60° profile opens each flank by δ·sin 30° =
  // δ/2, so the missing flank play `extra` needs δ = 2·extra, i.e. a nominal
  // diameter 4·extra larger.
  const extra = clearance - cap;
  const grow = +(4 * extra).toFixed(3);
  const target = isFiniteNumber(diameter) ? ` (diameter: ${+(diameter + grow).toFixed(3)})` : '';
  return (
    `${why} For a print tolerance (FDM usually needs 0.2–0.4 mm), keep clearance: ${cap} and grow the ` +
    `whole thread instead: add ${grow} mm to the nominal diameter${target}. That shifts the bore, crest ` +
    `and both flanks outward together; each flank then opens by ${cap} + ${+extra.toFixed(3)} = ${clearance} mm ` +
    'and the groove turns never merge.'
  );
}

function validateThread(opts: HoleOpts | HolesOpts, featureId: FeatureId | undefined): void {
  const t = opts.thread;
  const threadExample =
    "plate.hole(top, { u: 10, v: 10, diameter: 6, depth: 12, thread: { pitch: 1 } })  // M6 × 1 tapped";
  if (typeof t !== 'object' || t === null) {
    invalidArgs({
      api: holeApi(opts, 'thread'),
      path: 'opts.thread',
      got: t,
      showType: true,
      requires:
        'an object { pitch, modeled?, clearance? }; with thread set, opts.diameter is the NOMINAL size (M6 → diameter: 6, pitch: 1)',
      example: threadExample,
      featureId,
    });
  }
  // Coarsest ISO 261 pitch is D/4 (M1 × 0.25); anything coarser leaves no
  // meaningful minor diameter.
  if (!isFiniteNumber(t.pitch) || t.pitch <= 0 || t.pitch > opts.diameter / 4) {
    invalidArgs({
      api: holeApi(opts, 'thread'),
      path: 'opts.thread.pitch',
      got: t.pitch,
      requires:
        `the ISO 261 pitch, > 0 and ≤ opts.diameter / 4 — opts.diameter is ${formatScalarForError(opts.diameter)} mm, so pitch must be ≤ ${opts.diameter / 4}; ` +
        'coarse pitches are M3 → 0.5, M4 → 0.7, M5 → 0.8, M6 → 1, M8 → 1.25',
      unit: 'mm',
      example: threadExample,
      featureId,
    });
  }
  if (t.modeled !== undefined && typeof t.modeled !== 'boolean') {
    invalidArgs({
      api: holeApi(opts, 'thread'),
      path: 'opts.thread.modeled',
      got: t.modeled,
      showType: true,
      requires:
        'a boolean — true cuts the 60° helical groove, false (default) is a cosmetic thread (minor-diameter bore plus recorded thread params)',
      example:
        "plate.hole(top, { u: 10, v: 10, diameter: 6, depth: 12, thread: { pitch: 1, modeled: true } })",
      featureId,
    });
  }
  const clearance = t.clearance ?? 0;
  if (!isFiniteNumber(clearance) || clearance < 0 || clearance > t.pitch / 8) {
    invalidArgs({
      api: holeApi(opts, 'thread'),
      path: 'opts.thread.clearance',
      got: clearance,
      requires: `a number in [0, thread.pitch / 8] — thread.pitch is ${formatScalarForError(t.pitch)} mm, so the cap is ${t.pitch / 8}`,
      unit: 'mm',
      example: `plate.hole(top, { u: 10, v: 10, diameter: 6, depth: 12, thread: { pitch: ${formatScalarForError(t.pitch)}, clearance: ${t.pitch / 8} } })`,
      featureId,
      hint: threadClearanceHint(clearance, t.pitch, opts.diameter),
    });
  }
  if (t.modeled === true && typeof opts.depth === 'number' && opts.depth < 2 * t.pitch) {
    invalidArgs({
      api: holeApi(opts, 'depth, thread'),
      path: 'opts.depth',
      got: opts.depth,
      requires:
        `depth ≥ 2 × thread.pitch for a modeled thread — thread.pitch is ${formatScalarForError(t.pitch)} mm, so depth must be ≥ ${2 * t.pitch}; ` +
        "or use depth: 'through', or leave the thread cosmetic (modeled: false)",
      unit: 'mm',
      example: `plate.hole(top, { u: 10, v: 10, diameter: 6, depth: ${2 * t.pitch}, thread: { pitch: ${formatScalarForError(t.pitch)}, modeled: true } })`,
      featureId,
    });
  }
}

export function validateHoleOpts(opts: HoleOpts, featureId: FeatureId | undefined): void {
  const badAxis = !isFiniteNumber(opts.u) ? 'u' : !isFiniteNumber(opts.v) ? 'v' : undefined;
  if (badAxis !== undefined) {
    invalidArgs({
      api: `hole(face, { ${badAxis} })`,
      path: `opts.${badAxis}`,
      got: badAxis === 'u' ? opts.u : opts.v,
      showType: typeof (badAxis === 'u' ? opts.u : opts.v) !== 'number',
      requires:
        'a finite number; u and v are the hole centre in the face\'s own 2-D frame, measured from the face origin',
      unit: 'mm',
      example: HOLE_EXAMPLE,
      featureId,
    });
  }
  if (opts.name !== undefined) validateFeatureName(opts.name, featureId);
  validateCommonHoleFields(opts, featureId);
}

export function validateHolesOpts(opts: HolesOpts, featureId: FeatureId | undefined): void {
  if (!Array.isArray(opts.positions) || opts.positions.length === 0) {
    invalidArgs({
      api: 'holes(face, { positions })',
      path: 'opts.positions',
      got: opts.positions,
      showType: !Array.isArray(opts.positions),
      requires:
        'a non-empty array of { u, v } face-frame points, one per hole; for a single hole call .hole() instead',
      example: HOLES_EXAMPLE,
      featureId,
    });
  }
  for (let i = 0; i < opts.positions.length; i++) {
    const p = opts.positions[i];
    if (!p || typeof p !== 'object') {
      invalidArgs({
        api: 'holes(face, { positions })',
        path: `opts.positions[${i}]`,
        got: p,
        showType: true,
        requires: 'an object { u, v } with finite numbers; u and v are the hole centre in the face frame',
        unit: 'mm',
        example: HOLES_EXAMPLE,
        featureId,
      });
    }
    const axis = !isFiniteNumber((p as { u?: unknown }).u)
      ? 'u'
      : !isFiniteNumber((p as { v?: unknown }).v)
        ? 'v'
        : undefined;
    if (axis !== undefined) {
      invalidArgs({
        api: 'holes(face, { positions })',
        path: `opts.positions[${i}].${axis}`,
        got: (p as Record<string, unknown>)[axis],
        showType: typeof (p as Record<string, unknown>)[axis] !== 'number',
        requires: 'a finite number, measured from the face origin in the face\'s own 2-D frame',
        unit: 'mm',
        example: HOLES_EXAMPLE,
        featureId,
      });
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
import { toParam, toBoolParam } from '../../shared/runtime/editableHelpers';

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
  if (opts.thread) {
    params.threadPitch = paramMm(opts.thread.pitch);
    params.threadClearance = paramMm(opts.thread.clearance ?? 0);
    params.threadModeled = paramUnitless(opts.thread.modeled === true ? 1 : 0);
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
  if (opts.thread) {
    params.threadPitch = paramMm(opts.thread.pitch);
    params.threadClearance = paramMm(opts.thread.clearance ?? 0);
    params.threadModeled = paramUnitless(opts.thread.modeled === true ? 1 : 0);
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
