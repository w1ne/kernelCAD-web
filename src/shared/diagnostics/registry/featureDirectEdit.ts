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
  // set_param feature mode: edit a feature's own call arguments (4)
  'feature.edit.no-call-site': {
    hintTemplate: 'Edit the source directly, or drive the value with param() and use set_param.',
    nextAction: { kind: 'rewrite-feature', guidance: 'Edit the call in the source, or put the value behind param().' },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'set_param feature mode: the feature has no recorded call site, so its arguments cannot be located.',
  },
  'feature.edit.unknown-param': {
    hintTemplate: "Use one of the feature's parameter names; inspect({ of: 'features' }) lists them.",
    nextAction: { kind: 'fix-arg', field: 'changes' },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'set_param feature mode: the requested parameter is not one of the feature\'s parameters.',
  },
  'feature.edit.param-driven': {
    hintTemplate: 'Set the driving param() with set_param({ name, value }) instead of editing the feature argument.',
    nextAction: { kind: 'fix-arg', field: 'name' },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'set_param feature mode: the value is driven by param(); editing the argument would detach it.',
  },
  'feature.edit.unmapped-param': {
    hintTemplate: 'Edit that call in the source directly, or put the value behind param() and use set_param.',
    nextAction: { kind: 'rewrite-feature', guidance: 'No source argument maps to this parameter; edit the call by hand.' },
    defaultSeverity: 'error',
    group: 'feature',
    description: 'set_param feature mode: no rewrite of the call made the feature report the requested value.',
  },
} as const satisfies Record<`feature.${string}`, DiagnosticCodeSpec>;
