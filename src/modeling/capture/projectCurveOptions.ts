// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Capture-time key check for `Shape.projectCurve(opts)`. A misspelt key
// (`scale`, `edge`) used to be dropped and the curve projected with the
// default; a `curve` key in place of `source` failed with a raw TypeError.
import { invalidArgs } from '../../shared/intent/invalidArgs';
import type { FeatureId } from '../../shared/intent/types';

const PROJECT_CURVE_OPTION_KEYS: ReadonlySet<string> = new Set(['source', 'face', 'scaleMode', 'asEdge']);

const PROJECT_CURVE_API = 'projectCurve(opts)';
const PROJECT_CURVE_EXAMPLE =
  "cylinder(8, 5).projectCurve({ source: { kind: 'sketchCommands', commands }, face: 'top', scaleMode: 'bounds' })";

export function assertProjectCurveOptions(opts: unknown, featureId: FeatureId): void {
  if (opts === null || typeof opts !== 'object' || Array.isArray(opts)) {
    invalidArgs({
      api: PROJECT_CURVE_API,
      path: 'opts',
      got: opts,
      showType: true,
      requires: 'an options object { source, face, scaleMode?, asEdge? }',
      example: PROJECT_CURVE_EXAMPLE,
      featureId,
    });
  }
  const unknown = Object.keys(opts).find((key) => !PROJECT_CURVE_OPTION_KEYS.has(key));
  if (unknown === undefined) return;
  invalidArgs({
    api: PROJECT_CURVE_API,
    path: `opts.${unknown}`,
    got: (opts as Record<string, unknown>)[unknown],
    requires: `a known option key; projectCurve accepts ${[...PROJECT_CURVE_OPTION_KEYS].join(', ')}`,
    example: PROJECT_CURVE_EXAMPLE,
    featureId,
  });
}
