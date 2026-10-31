// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Script-shape advisories. Emitted at the shared evaluate seam
// (`evaluateAndBuildScript`, the CLI dry run, and the export runtime) by
// src/modeling/validation/missingReturn.ts.

import type { DiagnosticCodeSpec } from './types';

export const SCRIPT_CODES = {
  'script.no-return': {
    hintTemplate:
      'End the script with `return <shape>` (or `return arm.model()` for an assembly). Without a return the LAST CREATED shape is used, which is often a helper, a cutter or an intermediate body rather than the part you meant.',
    nextAction: {
      kind: 'rewrite-feature',
      guidance: 'add `return <the finished shape>` as the last statement of the script',
    },
    defaultSeverity: 'warn',
    group: 'script',
    description: 'The script built geometry but returned nothing, so the last created shape stands in for the model.',
  },
  'script.discarded-transform': {
    hintTemplate:
      'Transforms (translate, rotate, scale, reflect, color) return a new Shape and leave the receiver unchanged. Assign the result: `const moved = part.translate(10, 0, 0)`.',
    nextAction: {
      kind: 'rewrite-feature',
      guidance: 'replace the statement `part.translate(…)` with `const moved = part.translate(…)` and use `moved`',
    },
    defaultSeverity: 'warn',
    group: 'script',
    description: 'A transform was called as a statement and its result discarded; it was applied to the receiver for compatibility.',
  },
} as const satisfies Record<string, DiagnosticCodeSpec>;
