// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import type { DiagnosticCodeSpec } from './types';

export const VIEWER_CODES = {
  // 3D viewer dimensions (1). Warn: the model still builds and displays; the
  // viewer just shows no dimensions for this build.
  'viewer.dimensions.budget-exceeded': {
    hintTemplate:
      'Computing viewer dimensions took longer than its time budget (or failed), so none are shown for this build. The model itself is unaffected; declare the few dimensions that matter with shape.dimension() on a simpler body, or split a very detailed part into an assembly.',
    nextAction: { kind: 'rewrite-feature', guidance: 'declare the key dimensions with shape.dimension(), or simplify / split the detailed body' },
    defaultSeverity: 'warn',
    group: 'viewer',
    description: 'Viewer dimension computation exceeded its 3 s budget or threw, so the viewer received no dimensions.',
  },
} as const satisfies Record<`viewer.${string}`, DiagnosticCodeSpec>;
