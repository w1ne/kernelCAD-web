// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Key check for the scalar `fillet(radius, edges, opts)` options. A misspelt
// `{ continuty: 'G2' }` used to be dropped and the blend built as G1 silently.
import type { FeatureId } from '../../shared/intent/types';
import { invalidArgs } from '../../shared/intent/invalidArgs';

const FILLET_OPTION_KEYS: ReadonlySet<string> = new Set(['continuity']);

const FILLET_OPTIONS_EXAMPLE = "box(40, 30, 10).fillet(2, 'top', { continuity: 'G2' })";

export function assertFilletOptions(opts: unknown, featureId: FeatureId): void {
  if (opts === null || typeof opts !== 'object' || Array.isArray(opts)) {
    invalidArgs({
      api: 'fillet(radius, edges, opts)',
      path: 'opts',
      got: opts,
      showType: true,
      requires: "an options object { continuity?: 'G1' | 'G2' }",
      example: FILLET_OPTIONS_EXAMPLE,
      featureId,
    });
  }
  const unknown = Object.keys(opts).find((key) => !FILLET_OPTION_KEYS.has(key));
  if (unknown !== undefined) {
    invalidArgs({
      api: 'fillet(radius, edges, opts)',
      path: `opts.${unknown}`,
      got: (opts as Record<string, unknown>)[unknown],
      requires: 'a known option key; fillet accepts continuity',
      example: FILLET_OPTIONS_EXAMPLE,
      featureId,
    });
  }
}
