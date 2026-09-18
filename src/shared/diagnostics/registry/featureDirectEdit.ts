// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import type { DiagnosticCodeSpec } from './types';

export const FEATURE_DIRECT_EDIT_CODES = {
  // Direct-edit drag (4)
  'feature.direct-edit.clamped': {
    hintTemplate: 'Accept the clamped value or widen the param bounds, then retry the drag.',
    nextAction: { kind: 'fix-arg', field: 'param-bounds' },
    defaultSeverity: 'info',
    group: 'feature',
    description: 'A direct-edit drag hit a param min/max bound and was clamped.',
  },
  'feature.direct-edit.delta-wrapper': {
    hintTemplate: 'Replace the computed transform with a named param, or keep the marked delta wrapper.',
    nextAction: {
      kind: 'rewrite-feature',
      guidance: 'Name the transform expression as a param before editing it directly.',
    },
    defaultSeverity: 'warn',
    group: 'feature',
    description: 'A direct-edit drag could not invert a computed transform and appended a marked delta wrapper.',
  },
  'feature.direct-edit.unresolved': {
    hintTemplate:
      'Anchor the entity by name: bind it to a returned variable, name it as an assembly part, or drive it via sdf.bind; mate-driven parts can only be edited at the mate.',
    nextAction: {
      kind: 'rewrite-feature',
      guidance: 'Anchor the entity with a name; edit the mate source for mate-driven parts.',
    },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'A direct-edit drag could not resolve the dragged entity to a source call site.',
  },
  'feature.direct-edit.shared-param-conflict': {
    hintTemplate: 'Split the shared param into per-axis params, or drag one axis at a time.',
    nextAction: {
      kind: 'rewrite-feature',
      guidance: 'Use distinct params per axis so each drag delta is encodable.',
    },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'One param drives multiple translated axes with different drag deltas.',
  },
} as const satisfies Record<`feature.${string}`, DiagnosticCodeSpec>;
