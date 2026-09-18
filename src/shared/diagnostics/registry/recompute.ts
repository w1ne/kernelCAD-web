// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import type { DiagnosticCodeSpec } from './types';

export const RECOMPUTE_CODES = {
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
} as const satisfies Record<`recompute.${string}`, DiagnosticCodeSpec>;
