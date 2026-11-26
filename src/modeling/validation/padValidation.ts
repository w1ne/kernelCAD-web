// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/validation/padValidation.ts
//
// Script-time validators for `Shape.pad(profile, opts)` — the additive twin of
// `Shape.cutout`. The profile starts on a selected face and grows outward
// along that face's normal. Same vocabulary policy as cutoutValidation: every
// trigger raises `feature.invalid-args` through the shared `invalidArgs` helper
// (API + argument path, received value, requirement with units, inline
// example).

import { invalidArgs } from '../../shared/intent/invalidArgs';
import { formatScalarForError } from '../../shared/intent/types';
import type { FeatureId, Param } from '../../shared/intent/types';
import type { FaceSelector } from '../capture/proxy';
import type { UpToFaceSelector } from './holeValidation';
import type { Editable } from '../../shared/runtime/paramRef';
import { currentValue, toParam } from '../../shared/runtime/editableHelpers';
import type { ParamTable } from '../../shared/runtime/paramTable';

export interface EditablePadOpts {
  face: FaceSelector;
  /** Outward extrusion height in mm. Exactly one of depth / upToFace. */
  depth?: Editable<number>;
  /** End on the plane of a planar body face ahead of the entry face. */
  upToFace?: UpToFaceSelector;
  /** Optional agent-chosen feature name. */
  name?: string;
}

export interface PadOpts {
  face: FaceSelector;
  depth?: number;
  upToFace?: UpToFaceSelector;
  name?: string;
}

const PAD_EXAMPLE =
  "plate.pad(path().moveTo(-5, -5).lineTo(5, -5).lineTo(5, 5).lineTo(-5, 5).close(), { face: 'top', depth: 4 })";
const PAD_UP_TO_FACE_EXAMPLE =
  "rail.pad(profile, { face: 'top', upToFace: { kind: 'canonical', face: 'top' } })";

const PAD_OPTION_KEYS: ReadonlySet<string> = new Set(['face', 'depth', 'upToFace', 'name']);

/** Resolve EditablePadOpts to the numeric view the validators read. */
export function resolvePadOpts(opts: EditablePadOpts, table: ParamTable): PadOpts {
  const out: PadOpts = { face: opts.face, name: opts.name };
  if (opts.depth !== undefined) out.depth = currentValue(opts.depth, table);
  if (opts.upToFace !== undefined) out.upToFace = opts.upToFace;
  return out;
}

/** Reject a missing option bag or a key `pad` does not read. A dropped
 *  `upTo` or `height` key would otherwise grow the wrong depth. */
export function assertPadOptionKeys(opts: unknown, featureId: FeatureId | undefined): void {
  if (opts === null || typeof opts !== 'object' || Array.isArray(opts)) {
    invalidArgs({
      api: 'pad(profile, opts)',
      path: 'opts',
      got: opts,
      showType: true,
      requires: 'an options object { face, depth | upToFace, name? }',
      example: PAD_EXAMPLE,
      featureId,
    });
  }
  const unknown = Object.keys(opts).find((key) => !PAD_OPTION_KEYS.has(key));
  if (unknown === undefined) return;
  invalidArgs({
    api: 'pad(profile, opts)',
    path: `opts.${unknown}`,
    got: (opts as Record<string, unknown>)[unknown],
    requires: `a known option key; pad accepts ${[...PAD_OPTION_KEYS].join(', ')}`,
    example: PAD_EXAMPLE,
    featureId,
  });
}

function isUpToFaceShaped(value: unknown): boolean {
  return typeof value === 'string'
    || (typeof value === 'object' && value !== null && !Array.isArray(value));
}

export function validatePadOpts(opts: PadOpts, featureId: FeatureId | undefined): void {
  if (opts.depth === undefined && opts.upToFace === undefined) {
    invalidArgs({
      api: 'pad(profile, { face, depth })',
      path: 'opts.depth',
      gotText: 'neither depth nor upToFace',
      requires:
        'exactly one of depth (a positive number in mm) or upToFace (a FaceRef); a blind pad needs a depth',
      example: PAD_EXAMPLE,
      featureId,
    });
  }
  if (opts.depth !== undefined && opts.upToFace !== undefined) {
    invalidArgs({
      api: 'pad(profile, { face, depth, upToFace })',
      path: 'opts.depth + opts.upToFace',
      gotText: `depth ${formatScalarForError(opts.depth)} and upToFace ${formatScalarForError(opts.upToFace)} together`,
      requires: 'exactly one of the two — they are mutually exclusive ways to end the pad',
      example: PAD_EXAMPLE,
      featureId,
    });
  }
  if (opts.depth !== undefined) {
    if (typeof opts.depth !== 'number' || !Number.isFinite(opts.depth) || opts.depth <= 0) {
      invalidArgs({
        api: 'pad(profile, { face, depth })',
        path: 'opts.depth',
        got: opts.depth,
        showType: typeof opts.depth !== 'number',
        requires: 'a positive finite height in mm — a pad grows outward, so depth 0 or a negative value adds nothing',
        unit: 'mm',
        example: PAD_EXAMPLE,
        featureId,
      });
    }
  }
  if (opts.upToFace !== undefined && !isUpToFaceShaped(opts.upToFace)) {
    invalidArgs({
      api: 'pad(profile, { face, upToFace })',
      path: 'opts.upToFace',
      got: opts.upToFace,
      showType: true,
      requires: "a planar face ahead of the entry face: a FaceRef ({ kind: 'canonical', face: 'top' }), a face name, a label or a FaceQuery",
      example: PAD_UP_TO_FACE_EXAMPLE,
      featureId,
    });
  }
}

export interface SerializedPadCapture {
  params: Record<string, Param>;
  metadata: Record<string, unknown>;
}

/** `face` is captured under inputs.face by the proxy. */
export function serializePadParams(_face: FaceSelector, opts: EditablePadOpts): SerializedPadCapture {
  const params: Record<string, Param> = {};
  if (opts.depth !== undefined) params.depth = toParam(opts.depth, 'mm');
  const metadata: Record<string, unknown> = {};
  if (opts.upToFace !== undefined) metadata.upToFace = opts.upToFace;
  if (opts.name !== undefined) metadata.name = opts.name;
  return { params, metadata };
}
