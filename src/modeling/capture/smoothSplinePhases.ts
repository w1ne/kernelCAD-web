// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/capture/smoothSplinePhases.ts
//
// Capture-time validation of the `PathBuilder.smoothSpline` options.
import type { Param } from '../../shared/intent/types';
import { isValidEditableNumber } from '../../shared/intent/types';
import { invalidArgs } from '../../shared/intent/invalidArgs';
import { toParam } from '../../shared/runtime/editableHelpers';
import type { Editable } from '../../shared/runtime/paramRef';

/** Options of `path().smoothSpline(x, y, opts)`. */
export interface SmoothSplineOptions {
  /** 2D direction of travel at the start; replaces the inherited tangent. */
  startTangent?: [Editable<number>, Editable<number>];
  /** 2D direction of travel at the end point; default is the sketch +X direction. */
  endTangent?: [Editable<number>, Editable<number>];
}

type TangentKey = 'startTangent' | 'endTangent';
type ParamVec = { x: Param; y: Param };

const API = 'path().smoothSpline(x, y, opts)';
const OPTION_KEYS: readonly TangentKey[] = ['startTangent', 'endTangent'];
const EXAMPLE = 'path().moveTo(0, 0).lineTo(20, 0).smoothSpline(24, 8, { endTangent: [0, 1] })';

function toTangent(key: TangentKey, value: unknown, now: (p: Param) => number): ParamVec | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.length !== 2 || !value.every(isValidEditableNumber)) {
    invalidArgs({
      api: API, path: `opts.${key}`, got: value, showType: !Array.isArray(value),
      requires: 'an [x, y] direction vector of finite numbers or numeric param() values',
      example: EXAMPLE,
    });
  }
  const [vx, vy] = value as [Editable<number>, Editable<number>];
  const x = toParam(vx, 'mm');
  const y = toParam(vy, 'mm');
  if (Math.hypot(now(x), now(y)) < 1e-9) {
    invalidArgs({
      api: API, path: `opts.${key}`, gotText: `a zero-length vector [${now(x)}, ${now(y)}]`,
      requires: 'a non-zero [x, y] direction vector; only the direction matters',
      example: EXAMPLE,
    });
  }
  return { x, y };
}

/** Validate `opts` and return the tangent fields of the `smoothSpline` command. */
export function smoothSplineTangentOptions(
  opts: unknown,
  now: (p: Param) => number,
): { startTangent?: ParamVec; endTangent?: ParamVec } {
  if (opts === undefined || opts === null) return {};
  if (typeof opts !== 'object' || Array.isArray(opts)) {
    invalidArgs({
      api: API, path: 'opts', got: opts, showType: true,
      requires: `an option object with only ${OPTION_KEYS.join(', ')}`,
      example: EXAMPLE,
    });
  }
  const unknownKey = Object.keys(opts).find((key) => !(OPTION_KEYS as readonly string[]).includes(key));
  if (unknownKey !== undefined) {
    invalidArgs({
      api: API, path: `opts.${unknownKey}`, gotText: `an unknown option '${unknownKey}'`,
      requires: `one of ${OPTION_KEYS.join(', ')}`,
      example: EXAMPLE,
    });
  }
  const given = opts as Record<TangentKey, unknown>;
  const startTangent = toTangent('startTangent', given.startTangent, now);
  const endTangent = toTangent('endTangent', given.endTangent, now);
  return {
    ...(startTangent !== undefined ? { startTangent } : {}),
    ...(endTangent !== undefined ? { endTangent } : {}),
  };
}
