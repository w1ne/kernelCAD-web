// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Option parsing for `Sketch.revolve`. Kept out of `sketch.ts` so the class
// file stays below the quality ratchet's line limit; the messages and the
// symbolic params are unchanged.
import type { FeatureId, Param } from '../../shared/intent/types';
import type { FaceLabelsMap } from '../../shared/intent/featureRecord';
import type { Editable } from '../../shared/runtime/paramRef';
import { toParam } from '../../shared/runtime/editableHelpers';
import { invalidArgs } from '../../shared/intent/invalidArgs';
import { validateFaceLabels } from './faceLabels';
import { symmetricParam } from './symmetricOption';
import { ALLOWED_REVOLVE_KEYS, ALLOWED_REVOLVE_AXIS_KEYS, type RevolveAxis } from './sketchOptions';
import { assertKnownKeys, assertEditablePair } from './sketchOptionGuards';

/** Options accepted by `Sketch.revolve`. */
export interface RevolveOptions {
  angleDeg?: Editable<number>;
  faceLabels?: FaceLabelsMap;
  symmetric?: boolean;
  axis?: RevolveAxis;
}

export interface CapturedRevolveOptions {
  params: Record<string, Param>;
  faceLabels?: FaceLabelsMap;
}

/** Validate the option bag and build the symbolic revolve params. Every
 *  throw keeps the `feature.invalid-args` message and hint contract. */
export function captureRevolveOptions(
  opts: RevolveOptions | null | undefined,
  featureId: FeatureId,
): CapturedRevolveOptions {
  // Tolerate an explicit `null`, as extrude does. A positional angle,
  // `revolve(180)`, used to be read as an empty option bag and built a full
  // 360° solid; reject it with the option-bag form.
  opts ??= {};
  if (typeof opts !== 'object' || Array.isArray(opts)) {
    invalidArgs({
      api: 'Sketch.revolve({ angleDeg })',
      path: 'opts',
      got: opts,
      showType: true,
      requires: 'an option object { angleDeg?, faceLabels?, symmetric?, axis? } or no argument (360°); the angle is not positional',
      example: 'path()...close().revolve({ angleDeg: 180 })',
      featureId,
    });
  }
  assertKnownKeys(
    opts,
    ALLOWED_REVOLVE_KEYS,
    featureId,
    (key) => `Sketch.revolve: unknown option '${key}'.`,
    'revolve',
  );
  const symmetric = symmetricParam(opts.symmetric, {
    api: 'Sketch.revolve({ angleDeg, symmetric })',
    requires: 'true (revolve angleDeg/2 to each side of the sketch plane) or false',
    example: 'path()...close().revolve({ angleDeg: 90, symmetric: true })',
    featureId,
  });
  const faceLabels = validateFaceLabels(opts.faceLabels, 'revolve');
  const axis = validateRevolveAxis(opts.axis, featureId);
  const angleDeg = opts.angleDeg ?? 360;
  return {
    params: {
      profileKind: { expression: "'sketch'", unit: 'unitless', evaluated: 0 },
      // A ParamRef angle stays symbolic; the lowerer range-checks the
      // resolved value.
      angleDeg: toParam(angleDeg, 'deg'),
      // Recorded only when true, so one-sided records stay byte-identical.
      ...symmetric,
      // Recorded only when given, so default-axis records stay byte-identical.
      ...(axis ? {
        axisThroughX: toParam(axis.through[0], 'mm'),
        axisThroughY: toParam(axis.through[1], 'mm'),
        axisDirectionX: toParam(axis.direction[0], 'unitless'),
        axisDirectionY: toParam(axis.direction[1], 'unitless'),
      } : {}),
    },
    ...(faceLabels ? { faceLabels } : {}),
  };
}

/** Validate `Sketch.revolve({ axis })` and return the typed axis, or undefined
 *  when the caller did not ask for one. A plain-number zero direction is
 *  rejected here; a ParamRef direction that resolves to zero is rejected by
 *  the lowerer, where the value is known. */
function validateRevolveAxis(axis: unknown, featureId: FeatureId): RevolveAxis | undefined {
  if (axis === undefined) return undefined;
  const example = "path()...close().revolve({ axis: { through: [0, 0], direction: [0, 1] } })";
  if (axis === null || typeof axis !== 'object' || Array.isArray(axis)) {
    invalidArgs({
      api: 'Sketch.revolve({ axis })',
      path: 'opts.axis',
      got: axis,
      showType: true,
      requires: 'an object { through: [x, y], direction: [dx, dy] } in sketch coordinates',
      example,
      featureId,
    });
  }
  const entry = axis as { through?: unknown; direction?: unknown };
  assertKnownKeys(
    entry,
    ALLOWED_REVOLVE_AXIS_KEYS,
    featureId,
    (key) => `Sketch.revolve: unknown axis option '${key}'.`,
    'axis',
  );
  for (const key of ['through', 'direction'] as const) {
    if (entry[key] === undefined) {
      invalidArgs({
        api: 'Sketch.revolve({ axis })',
        path: `opts.axis.${key}`,
        got: undefined,
        requires: `a ${key === 'through' ? '[x, y] point on the axis' : '[dx, dy] axis direction'} in sketch coordinates`,
        example,
        featureId,
      });
    }
  }
  assertEditablePair(
    entry.through,
    'Sketch.revolve: opts.axis.through',
    featureId,
    'Pass opts.axis.through as [x, y] — a point on the axis in sketch coordinates.',
  );
  assertEditablePair(
    entry.direction,
    'Sketch.revolve: opts.axis.direction',
    featureId,
    'Pass opts.axis.direction as [dx, dy] — a non-zero direction in sketch coordinates.',
  );
  const through = entry.through as [Editable<number>, Editable<number>];
  const direction = entry.direction as [Editable<number>, Editable<number>];
  if (
    typeof direction[0] === 'number' &&
    typeof direction[1] === 'number' &&
    Math.hypot(direction[0], direction[1]) < 1e-12
  ) {
    invalidArgs({
      api: 'Sketch.revolve({ axis })',
      path: 'opts.axis.direction',
      got: direction,
      requires: 'a non-zero [dx, dy] axis direction',
      example,
      featureId,
    });
  }
  return { through, direction };
}
