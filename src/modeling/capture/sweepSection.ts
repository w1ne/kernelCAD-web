// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/capture/sweepSection.ts
//
// Capture-time check of `Sketch.sweep(rail, { section })`.

import type { FeatureId } from '../../shared/intent/types';
import { invalidArgs } from '../../shared/intent/invalidArgs';

const EXAMPLE = "section.sweep(helix({ radius: 2.5, pitch: 1, turns: 20 }), { spine: 'helix', section: 'transverse' })";

/** Validate `opts.section`: `'transverse'` only exists for the exact helix
 *  spine. Returns the section with its `'axial'` default applied. */
export function checkSweepSection(section: unknown, spine: string, featureId: FeatureId): 'axial' | 'transverse' {
  if (section === undefined || section === 'axial') return 'axial';
  if (section !== 'transverse') {
    invalidArgs({
      api: 'Sketch.sweep(rail, { section })',
      path: 'opts.section',
      got: section,
      showType: typeof section !== 'string',
      requires:
        "'axial' (default — the profile is a radial/axial cross-section next to the helix) or 'transverse' (the profile is the cross-section perpendicular to the helix axis, origin on the axis)",
      example: EXAMPLE,
      featureId,
    });
  }
  if (spine !== 'helix') {
    invalidArgs({
      api: 'Sketch.sweep(rail, { spine, section })',
      path: 'opts.spine',
      got: spine,
      requires: "spine: 'helix' when section is 'transverse' — only the exact helix spine moves the section by pure screw motion",
      example: EXAMPLE,
      featureId,
    });
  }
  return 'transverse';
}
