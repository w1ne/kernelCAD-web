// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import type { DiagnosticCodeSpec } from './types';

export const DIFF_CODES = {
  // Geometric diff (1)
  'diff.body.unmatched': {
    hintTemplate:
      'A body in one model has no counterpart in the other, so no per-body delta could be computed for it. Give the part the same assembly().part(name, ...) name on both sides, or read it from the diff report\'s `unmatched` list as a whole-body addition/removal.',
    nextAction: { kind: 'fix-arg', field: 'file' },
    defaultSeverity: 'warn',
    group: 'diff',
    description: 'diff_geometry could not pair a body in the baseline model with a body in the revised model, by name or by positional fallback.',
  },
} as const satisfies Record<`diff.${string}`, DiagnosticCodeSpec>;
