// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import type { DiagnosticCodeSpec } from './types';

export const VIEWER_CODES = {
  // 3D viewer dimensions. Warn: the model still builds and displays; the
  // viewer shows what was computed before the cut-off.
  'viewer.dimensions.budget-exceeded': {
    hintTemplate:
      'Computing viewer dimensions took longer than its time budget, so only those computed before the cut-off are shown. The model itself is unaffected; declare the few dimensions that matter with shape.dimension() on a simpler body, or split a very detailed part into an assembly.',
    nextAction: { kind: 'rewrite-feature', guidance: 'declare the key dimensions with shape.dimension(), or simplify / split the detailed body' },
    defaultSeverity: 'warn',
    group: 'viewer',
    description: 'Viewer dimension computation exceeded its time budget (the viewer keeps the dimensions computed before the cut-off).',
  },
  'viewer.dimensions.failed': {
    hintTemplate: 'The model can still display. Read the diagnostic reason before changing the model.',
    nextAction: { kind: 'inspect-message' },
    defaultSeverity: 'warn',
    group: 'viewer',
    description: 'Viewer dimension computation failed and returned no dimensions.',
  },
} as const satisfies Record<`viewer.${string}`, DiagnosticCodeSpec>;
