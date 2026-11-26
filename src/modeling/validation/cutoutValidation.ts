// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/intent/cutoutValidation.ts
//
// Script-time validators for `Shape.cutout(profile, opts)`. Same vocabulary
// policy as holeValidation: every trigger raises `feature.invalid-args`
// through the shared `invalidArgs` helper (API + argument path, received
// value, requirement with units, inline example).
//
// Source: spec 2026-05-05-v0.3-slice1-hole-cutout-design §D.2.

import { invalidArgs } from '../../shared/intent/invalidArgs';
import { formatScalarForError } from '../../shared/intent/types';
import type { FeatureId, Param } from '../../shared/intent/types';
import type { FaceSelector } from '../capture/proxy';
import type { SketchCommand } from '../capture/sketch';
import { validateFeatureName, type UpToFaceSelector } from './holeValidation';
import type { Editable } from '../../shared/runtime/paramRef';
import { currentValue, currentBool, toParam, toBoolParam } from '../../shared/runtime/editableHelpers';
import type { ParamTable } from '../../shared/runtime/paramTable';

export type CutoutDepthMode = 'blind' | 'symmetric';

export interface EditableCutoutOpts {
  face: FaceSelector;
  depth?: Editable<number> | 'through';
  upToFace?: UpToFaceSelector;
  depthMode?: CutoutDepthMode;
  /** Optional agent-chosen feature name. */
  name?: string;
  /** Slice-3: gating param. Phase 4 wires the lowerer side. */
  enabled?: Editable<boolean>;
}

export interface CutoutOpts {
  face: FaceSelector;
  depth?: number | 'through';
  upToFace?: UpToFaceSelector;
  depthMode?: CutoutDepthMode;
  name?: string;
  enabled?: boolean;
}

/** Resolve EditableCutoutOpts → numeric/boolean view for validation. */
export function resolveCutoutOpts(opts: EditableCutoutOpts, table: ParamTable): CutoutOpts {
  const out: CutoutOpts = {
    face: opts.face,
    name: opts.name,
    depthMode: opts.depthMode,
  };
  if (opts.depth !== undefined) {
    out.depth = opts.depth === 'through' ? 'through' : currentValue(opts.depth, table);
  }
  if (opts.upToFace !== undefined) out.upToFace = opts.upToFace;
  if (opts.enabled !== undefined) out.enabled = currentBool(opts.enabled, table);
  return out;
}

/** One minimal correct call, inline on every cutout message. */
const CUTOUT_EXAMPLE =
  "plate.cutout(sketch().moveTo(0, 0).lineTo(20, 0).lineTo(20, 10).lineTo(0, 10).close(), { face: top, depth: 'through' })";

/** The additive twin of {@link validateCutoutProfile} keeps one example per
 *  operation, so a pad refusal never tells the author to cut. */
const PAD_EXAMPLE =
  "plate.pad(path().moveTo(0, 0).lineTo(20, 0).lineTo(20, 10).lineTo(0, 10).close(), { face: 'top', depth: 4 })";

function isFiniteNumber(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n);
}

const CUTOUT_OPTION_KEYS: ReadonlySet<string> = new Set(['face', 'depth', 'upToFace', 'depthMode', 'name', 'enabled']);

/** Reject a missing option bag or a key `cutout` does not read. A misspelt
 *  `enable: false` used to be dropped and the pocket still cut; `mode` or
 *  `symmetric` left the cut blind; a missing `opts` failed with a raw
 *  TypeError. */
export function assertCutoutOptionKeys(opts: unknown, featureId: FeatureId | undefined): void {
  if (opts === null || typeof opts !== 'object' || Array.isArray(opts)) {
    invalidArgs({
      api: 'cutout(profile, opts)',
      path: 'opts',
      got: opts,
      showType: true,
      requires: 'an options object { face, depth | upToFace, depthMode?, name?, enabled? }',
      example: CUTOUT_EXAMPLE,
      featureId,
    });
  }
  const unknown = Object.keys(opts).find((key) => !CUTOUT_OPTION_KEYS.has(key));
  if (unknown === undefined) return;
  invalidArgs({
    api: 'cutout(profile, opts)',
    path: `opts.${unknown}`,
    got: (opts as Record<string, unknown>)[unknown],
    requires: `a known option key; cutout accepts ${[...CUTOUT_OPTION_KEYS].join(', ')}`,
    example: CUTOUT_EXAMPLE,
    featureId,
  });
}

/** Cheap O(n²) line-segment self-intersection check. Slice-1 limitation:
 *  only straight (lineTo) segments are checked; segments involving arcs
 *  (tangentArc / threePointsArc / sagittaArc / bulgeArc / radiusArc) are
 *  treated as straight chords for the intersection test. Slice-2 will
 *  add a curve-aware version. */
function hasStraightSelfIntersection(
  commands: readonly SketchCommand[],
): { i: number; j: number; at: [number, number] } | undefined {
  // Build the polyline: (x, y) pairs from moveTo + each subsequent endpoint.
  const pts: Array<[number, number]> = [];
  for (const c of commands) {
    if (c.kind === 'close') break;
    if ('x' in c && 'y' in c) pts.push([c.x.evaluated, c.y.evaluated]);
  }
  // Segments are pts[i] → pts[i+1]; closure adds pts[last] → pts[0].
  if (pts.length < 4) return undefined;
  const segs: Array<[[number, number], [number, number]]> = [];
  for (let i = 0; i + 1 < pts.length; i++) segs.push([pts[i], pts[i + 1]]);
  segs.push([pts[pts.length - 1], pts[0]]);
  // Compare every non-adjacent pair.
  for (let i = 0; i < segs.length; i++) {
    for (let j = i + 2; j < segs.length; j++) {
      // Adjacent in the closed loop: (0, last) shares an endpoint with seg[0] and seg[last].
      if (i === 0 && j === segs.length - 1) continue;
      if (segmentsCross(segs[i], segs[j])) return { i, j, at: segs[i][0] };
    }
  }
  return undefined;
}

function segmentsCross(
  a: [[number, number], [number, number]],
  b: [[number, number], [number, number]],
): boolean {
  const [p1, p2] = a;
  const [p3, p4] = b;
  const d1 = cross(p3, p4, p1);
  const d2 = cross(p3, p4, p2);
  const d3 = cross(p1, p2, p3);
  const d4 = cross(p1, p2, p4);
  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
      ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
    return true;
  }
  return false;
}

function cross(o: [number, number], a: [number, number], b: [number, number]): number {
  return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
}

const UP_TO_FACE_EXAMPLE =
  "plate.cutout(profile, { face: 'top', upToFace: { kind: 'canonical', face: 'bottom' } })";

function validateUpToFace(opts: CutoutOpts, featureId: FeatureId | undefined): void {
  const v: unknown = opts.upToFace;
  if (typeof v !== 'string' && (typeof v !== 'object' || v === null || Array.isArray(v))) {
    invalidArgs({
      api: 'cutout(profile, { face, upToFace })',
      path: 'opts.upToFace',
      got: v,
      showType: true,
      requires: "a planar face of the body: a FaceRef ({ kind: 'canonical', face: 'bottom' }), a face name, a label or a FaceQuery",
      example: UP_TO_FACE_EXAMPLE,
      featureId,
    });
  }
  if (opts.depthMode === 'symmetric') {
    invalidArgs({
      api: 'cutout(profile, { face, upToFace, depthMode })',
      path: 'opts.depthMode',
      got: opts.depthMode,
      requires: "no depthMode with upToFace; the cut runs from the entry face to the target face only",
      example: UP_TO_FACE_EXAMPLE,
      featureId,
    });
  }
}

export function validateCutoutOpts(opts: CutoutOpts, featureId: FeatureId | undefined): void {
  if (opts.depth === undefined && opts.upToFace === undefined) {
    invalidArgs({
      api: 'cutout(profile, { face, depth })',
      path: 'opts.depth',
      gotText: 'neither depth nor upToFace',
      requires:
        "exactly one of depth (a number in mm or 'through') or upToFace (a FaceRef); a blind pocket needs a depth",
      example: CUTOUT_EXAMPLE,
      featureId,
    });
  }
  if (opts.depth !== undefined && opts.upToFace !== undefined) {
    invalidArgs({
      api: 'cutout(profile, { face, depth, upToFace })',
      path: 'opts.depth + opts.upToFace',
      gotText: `depth ${formatScalarForError(opts.depth)} and upToFace ${formatScalarForError(opts.upToFace)} together`,
      requires: 'exactly one of the two — they are mutually exclusive ways to end the cut',
      example: CUTOUT_EXAMPLE,
      featureId,
    });
  }
  if (opts.upToFace !== undefined) validateUpToFace(opts, featureId);
  if (typeof opts.depth === 'number') {
    if (!isFiniteNumber(opts.depth) || opts.depth <= 0) {
      invalidArgs({
        api: 'cutout(profile, { face, depth })',
        path: 'opts.depth',
        got: opts.depth,
        requires:
          "a finite number > 0 for a blind pocket, or the string 'through' to clip at the back face; a negative depth does not cut the other way",
        unit: 'mm',
        example: CUTOUT_EXAMPLE,
        featureId,
      });
    }
  }
  if (opts.depthMode !== undefined && opts.depthMode !== 'blind' && opts.depthMode !== 'symmetric') {
    invalidArgs({
      api: 'cutout(profile, { face, depthMode })',
      path: 'opts.depthMode',
      got: opts.depthMode,
      showType: typeof opts.depthMode !== 'string',
      requires:
        "'blind' (default, cuts depth mm inward from the face) or 'symmetric' (cuts depth/2 each side of the face)",
      example:
        "plate.cutout(profile, { face: top, depth: 4, depthMode: 'symmetric' })",
      featureId,
    });
  }
  if (opts.name !== undefined) validateFeatureName(opts.name, featureId);
}

/** Verify the captured Sketch's commands contain a 'close' marker and the
 *  straight-segment polyline does not self-intersect. */
export function validateCutoutProfile(
  commands: readonly SketchCommand[],
  featureId: FeatureId | undefined,
  op: 'cutout' | 'pad' = 'cutout',
): void {
  const example = op === 'pad' ? PAD_EXAMPLE : CUTOUT_EXAMPLE;
  const closed = commands.some(c => c.kind === 'close');
  if (!closed) {
    const last = commands[commands.length - 1];
    invalidArgs({
      api: `${op}(profile, opts)`,
      path: 'profile',
      gotText: `an open path of ${commands.length} segment(s), last command '${String(last?.kind ?? 'none')}', no close()`,
      requires:
        'a closed profile — the last segment must return to the start point and the path must end with .close()',
      example,
      featureId,
    });
  }
  const crossing = hasStraightSelfIntersection(commands);
  if (crossing !== undefined) {
    invalidArgs({
      api: `${op}(profile, opts)`,
      path: `profile segment ${crossing.i} × segment ${crossing.j}`,
      gotText: `a profile whose segment ${crossing.i} (from [${crossing.at[0]}, ${crossing.at[1]}]) crosses segment ${crossing.j}`,
      requires:
        `a simple (non-self-intersecting) closed profile; walk the points in one consistent direction and remove the crossing, or split it into two ${op}s`,
      unit: 'mm',
      example,
      featureId,
    });
  }
}

// ---------------------------------------------------------------------------
// Param serialization

export interface SerializedCutoutCapture {
  params: Record<string, Param>;
  metadata: Record<string, unknown>;
}

function paramMm(value: Editable<number>): Param {
  return toParam(value, 'mm');
}

function paramUnitless(value: string | number): Param {
  return {
    expression: typeof value === 'string' ? `'${value}'` : String(value),
    unit: 'unitless',
    evaluated: typeof value === 'number' ? value : 0,
  };
}

// `face` is captured under inputs.face by the proxy; metadata only carries
// upToFace (when set) and any future per-cutout state.
export function serializeCutoutParams(_face: FaceSelector, opts: EditableCutoutOpts): SerializedCutoutCapture {
  const params: Record<string, Param> = {
    depthMode: paramUnitless(opts.depthMode ?? 'blind'),
  };
  if (typeof opts.depth === 'number' || (typeof opts.depth === 'object' && opts.depth !== null)) {
    params.depth = paramMm(opts.depth as Editable<number>);
  } else if (opts.depth === 'through') {
    params.depthMode = paramUnitless('through');
  }
  const metadata: Record<string, unknown> = {};
  if (opts.upToFace !== undefined) metadata.upToFace = opts.upToFace;
  if (opts.name !== undefined) metadata.name = opts.name;
  if (opts.enabled !== undefined) metadata.enabled = toBoolParam(opts.enabled);
  return { params, metadata };
}
