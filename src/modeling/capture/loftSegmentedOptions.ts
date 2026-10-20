// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { FeatureId } from '../../shared/intent/types';
import { isValidEditableNumber } from '../../shared/intent/types';
import { invalidArgs } from '../../shared/intent/invalidArgs';
import type { LoftOptions } from './sketch';

/** Validate the segmented-loft options. `spanSize` is structural (not a
 *  drivable dimension), so only a literal number can be checked here; the
 *  lowerer re-checks the evaluated value. */
export function validateLoftSegmentedOptions(opts: LoftOptions, featureId: FeatureId): void {
  if (opts.continuity !== undefined
    && opts.continuity !== 'G0' && opts.continuity !== 'G1' && opts.continuity !== 'G2') {
    invalidArgs({
      api: 'Sketch.loft',
      path: 'opts.continuity',
      got: opts.continuity,
      showType: true,
      requires: "'G0', 'G1' or 'G2'",
      example: "a.loft(b, { continuity: 'G1' })",
      featureId,
    });
  }
  if (opts.mode !== undefined && opts.mode !== 'single' && opts.mode !== 'sewn') {
    invalidArgs({
      api: 'Sketch.loft',
      path: 'opts.mode',
      got: opts.mode,
      showType: true,
      requires: "'single' or 'sewn'",
      example: "a.loft(b, { mode: 'sewn', spanSize: 3 })",
      featureId,
    });
  }
  if (opts.spanSize !== undefined) {
    if (!isValidEditableNumber(opts.spanSize)) {
      invalidArgs({
        api: 'Sketch.loft',
        path: 'opts.spanSize',
        got: opts.spanSize,
        showType: true,
        requires: 'an integer >= 2 (or a ParamRef<number>)',
        example: "a.loft(b, { mode: 'sewn', spanSize: 3 })",
        featureId,
      });
    }
    if (typeof opts.spanSize === 'number' && (!Number.isInteger(opts.spanSize) || opts.spanSize < 2)) {
      invalidArgs({
        api: 'Sketch.loft',
        path: 'opts.spanSize',
        got: opts.spanSize,
        requires: 'an integer >= 2',
        example: "a.loft(b, { mode: 'sewn', spanSize: 3 })",
        featureId,
      });
    }
  }
}
