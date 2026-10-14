// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import type { DiagnosticCodeSpec } from './types';

export const RECOMPUTE_CODES = {
  'recompute.kernel.guard-fallback': {
    hintTemplate: "Read the named guard and correct the input, or explicitly select kernel: 'occt'.",
    nextAction: { kind: 'inspect-message' },
    defaultSeverity: 'warn',
    group: 'recompute',
    description: 'An opt-in kernel guard rejected a candidate; the feature used its OCCT reference result.',
  },
  // Pipeline (2)
  'recompute.input.missing': {
    hintTemplate:
      'An upstream feature failed or was suppressed. Call why_did_this_fail on the upstream feature_id to walk the chain.',
    nextAction: { kind: 'call-introspection-tool', tool: 'why_did_this_fail' },
    defaultSeverity: 'error',
    group: 'recompute',
    description: 'A feature could not run because an upstream input was missing, failed, or suppressed.',
  },
  'recompute.lowering.exception': {
    hintTemplate:
      'An exception was raised during lowering. Read the diagnostic message for the OCCT error.',
    nextAction: { kind: 'inspect-message' },
    defaultSeverity: 'error',
    group: 'recompute',
    description: 'The lowering pass raised an unhandled exception while compiling intent to the backend.',
  },
  // Kernel selection (1)
  'recompute.kernel.unavailable': {
    hintTemplate:
      "The requested kernel is not available in this build. Omit `kernel` or pass kernel: 'occt'.",
    nextAction: { kind: 'fix-arg', field: 'kernel' },
    defaultSeverity: 'error',
    group: 'recompute',
    description: 'A model or tool call selected a solid-modeling kernel that is not wired in this build (e.g. smlib before its backend ships).',
  },
} as const satisfies Record<`recompute.${string}`, DiagnosticCodeSpec>;
