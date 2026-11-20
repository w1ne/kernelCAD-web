// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Argument guards shared by the `Sketch` option bags (extrude, sweep, loft).
import { KernelError } from '../../shared/intent/kernelError';
import { isValidEditableNumber, type FeatureId } from '../../shared/intent/types';

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
