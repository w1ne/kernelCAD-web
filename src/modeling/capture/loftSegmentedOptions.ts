// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { FeatureId } from '../../shared/intent/types';
import { isValidEditableNumber } from '../../shared/intent/types';
import { invalidArgs } from '../../shared/intent/invalidArgs';
import type { LoftOptions } from './sketch';

const SEWN_EXAMPLE = "a.loft(b, { mode: 'sewn', spanSize: 3 })";

/** Validate the segmented-loft options. `spanSize` is structural (not a
 *  drivable dimension), so only a literal number can be checked here; the
 *  lowerer re-checks the evaluated value. Checks run in a fixed order:
 *  continuity, ruled-vs-continuity, mode, spanSize. */
export function validateLoftSegmentedOptions(opts: LoftOptions, featureId: FeatureId): void {
  validateContinuity(opts, featureId);
  validateRuledWithContinuity(opts, featureId);
  validateMode(opts, featureId);
  validateSpanSize(opts, featureId);
}

function validateContinuity(opts: LoftOptions, featureId: FeatureId): void {
  const { continuity } = opts;
  if (continuity === undefined || continuity === 'G0' || continuity === 'G1' || continuity === 'G2') return;
  invalidArgs({
    api: 'Sketch.loft',
    path: 'opts.continuity',
    got: continuity,
    showType: true,
    requires: "'G0', 'G1' or 'G2'",
    example: "a.loft(b, { continuity: 'G1' })",
    featureId,
  });
}

function validateRuledWithContinuity(opts: LoftOptions, featureId: FeatureId): void {
  if (opts.ruled !== true || (opts.continuity !== 'G1' && opts.continuity !== 'G2')) return;
  invalidArgs({
    api: 'Sketch.loft',
    path: 'opts.ruled',
    got: opts.ruled,
    requires: "ruled: false (or omitted) with continuity 'G1'/'G2'; a ruled skin creases at every station",
    example: "a.loft(b, { continuity: 'G2' })",
    featureId,
  });
}

function validateMode(opts: LoftOptions, featureId: FeatureId): void {
  const { mode } = opts;
  if (mode === undefined || mode === 'single' || mode === 'sewn') return;
  invalidArgs({
    api: 'Sketch.loft',
    path: 'opts.mode',
    got: mode,
    showType: true,
    requires: "'single' or 'sewn'",
    example: SEWN_EXAMPLE,
    featureId,
  });
}

function validateSpanSize(opts: LoftOptions, featureId: FeatureId): void {
  const { spanSize } = opts;
  if (spanSize === undefined) return;
  if (!isValidEditableNumber(spanSize)) {
    invalidArgs({
      api: 'Sketch.loft',
      path: 'opts.spanSize',
      got: spanSize,
      showType: true,
      requires: 'an integer >= 2 (or a ParamRef<number>)',
      example: SEWN_EXAMPLE,
      featureId,
    });
  }
  if (typeof spanSize === 'number' && (!Number.isInteger(spanSize) || spanSize < 2)) {
    invalidArgs({
      api: 'Sketch.loft',
      path: 'opts.spanSize',
      got: spanSize,
      requires: 'an integer >= 2',
      example: SEWN_EXAMPLE,
      featureId,
    });
  }
}
