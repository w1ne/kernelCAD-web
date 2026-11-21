// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Argument guards shared by the `Sketch` option bags (extrude, sweep, loft).
import { KernelError } from '../../shared/intent/kernelError';
import { invalidArgs } from '../../shared/intent/invalidArgs';
import { isValidEditableNumber, type FeatureId } from '../../shared/intent/types';
import { ALLOWED_LOFT_PLANE_KEYS } from './sketchOptions';

/**
 * Reject unknown keys on a `Sketch` option bag with `feature.invalid-args`.
 * Shared by `extrude`'s and `sweep`'s opts, `loft`'s opts, and each `loft.planes[i]` entry
 * so the three call sites cannot drift. `unknownMessage` and `accepts` keep
 * every message/hint byte-identical to the hand-rolled guards this replaced.
 */
export function assertKnownKeys(
  opts: object,
  allowed: ReadonlySet<string>,
  featureId: FeatureId,
  unknownMessage: (key: string) => string,
  accepts: string,
): void {
  for (const key of Object.keys(opts)) {
    if (!allowed.has(key)) {
      throw new KernelError(
        'feature.invalid-args',
        unknownMessage(key),
        featureId,
        `${accepts} accepts ${[...allowed].join(', ')}.`,
      );
    }
  }
}

/**
 * Reject a present-but-invalid `Editable<number>` option. Same
 * "must be a number or ParamRef" message/hint contract across
 * `extrude.twistAngle`, `loft.twistDeg`, and `loft.planes[i].rotationDeg`.
 */
export function assertEditableNumber(
  value: unknown,
  where: string,
  featureId: FeatureId,
  hint: string,
): void {
  if (value !== undefined && !isValidEditableNumber(value)) {
    throw new KernelError(
      'feature.invalid-args',
      `${where} must be a number or ParamRef; got ${JSON.stringify(value)}.`,
      featureId,
      hint,
    );
  }
}

/** Same contract for `[x, y]` Editable pairs (`loft.twistCenter`). */
export function assertEditablePair(
  value: unknown,
  where: string,
  featureId: FeatureId,
  hint: string,
): void {
  if (
    value !== undefined &&
    (!Array.isArray(value) || value.length !== 2 || !value.every(isValidEditableNumber))
  ) {
    throw new KernelError(
      'feature.invalid-args',
      `${where} must be a [x, y] pair of numbers or ParamRefs; got ${JSON.stringify(value)}.`,
      featureId,
      hint,
    );
  }
}

const LOFT_PLANE_NAMES: ReadonlySet<unknown> = new Set(['XY', 'YZ', 'XZ']);
const LOFT_PLANE_EXAMPLE = "a.loft(b, { planes: [{ plane: 'XY', origin: [0, 0, 0] }, { plane: 'XY', origin: [0, 0, 40] }] })";

/**
 * Check one `loft.planes[i]` entry: known keys, a plane name, a 3D origin and
 * an optional numeric `rotationDeg`. Before the plane and origin checks, a
 * missing plane reached the lowerer and the loft failed as
 * `feature.empty-result`, and a missing origin threw a raw TypeError.
 */
export function assertLoftPlaneEntry(
  entry: { plane?: unknown; origin?: unknown; rotationDeg?: unknown },
  index: number,
  featureId: FeatureId,
): void {
  assertKnownKeys(
    entry,
    ALLOWED_LOFT_PLANE_KEYS,
    featureId,
    (key) => `Sketch.loft: unknown planes[${index}] option '${key}'.`,
    'planes entries',
  );
  const api = 'Sketch.loft(other, { planes })';
  if (!LOFT_PLANE_NAMES.has(entry.plane)) {
    invalidArgs({
      api,
      path: `opts.planes[${index}].plane`,
      got: entry.plane,
      requires: "'XY' | 'YZ' | 'XZ' (upper case; mirror() takes lower case)",
      example: LOFT_PLANE_EXAMPLE,
      featureId,
    });
  }
  const origin = entry.origin;
  if (!Array.isArray(origin) || origin.length !== 3 || !origin.every(isValidEditableNumber)) {
    invalidArgs({
      api,
      path: `opts.planes[${index}].origin`,
      got: origin,
      requires: 'an [x, y, z] of finite numbers or ParamRefs',
      unit: 'mm',
      example: LOFT_PLANE_EXAMPLE,
      featureId,
    });
  }
  assertEditableNumber(
    entry.rotationDeg,
    `Sketch.loft: opts.planes[${index}].rotationDeg`,
    featureId,
    `Pass planes[${index}].rotationDeg as degrees — a number or a param() reference — or omit it to inherit the distributed twistDeg.`,
  );
}
