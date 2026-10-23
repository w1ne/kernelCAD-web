// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import type { DiagnosticCodeSpec } from './types';

export const SELECTOR_CODES = {
  'selector.binding-moved': {
    hintTemplate:
      'The selector still selects the same entity, which a parameter edit moved or resized. Expected; no action unless the feature should not follow the edit.',
    nextAction: { kind: 'inspect-message' },
    defaultSeverity: 'info',
    group: 'selector',
    description: 'A selector kept its entity across an edit, but the entity moved or resized beyond tolerance.',
  },
  'selector.binding-changed': {
    hintTemplate:
      'The edit re-bound this selector to a different entity (other producing feature, surface type, name, or direction), so the feature now acts somewhere else. Tighten the selector or pin the intended entity, then re-evaluate.',
    nextAction: { kind: 'rewrite-feature', guidance: 'tighten the selector so it keeps selecting the intended entity' },
    defaultSeverity: 'warn',
    group: 'selector',
    description: 'A selector resolved to a different entity than in the previous evaluation of the same model.',
  },
} as const satisfies Record<`selector.${string}`, DiagnosticCodeSpec>;
