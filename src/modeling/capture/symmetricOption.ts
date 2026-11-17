// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { FeatureId, Param } from '../../shared/intent/types';
import { invalidArgs } from '../../shared/intent/invalidArgs';

/** The mid-plane `symmetric` option that `Sketch.extrude` and `Sketch.revolve`
 *  share. Rejects a non-boolean and returns the param record to spread into
 *  the feature params: `{}` unless true, so one-sided records stay
 *  byte-identical. */
export function symmetricParam(
  value: unknown,
  spec: { api: string; requires: string; example: string; featureId: FeatureId },
): { symmetric?: Param } {
  if (value !== undefined && typeof value !== 'boolean') {
    invalidArgs({ ...spec, path: 'opts.symmetric', got: value });
  }
  return value === true
    ? { symmetric: { expression: 'true', unit: 'unitless', evaluated: 1 } }
    : {};
}
