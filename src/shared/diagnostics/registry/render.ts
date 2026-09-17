// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import type { DiagnosticCodeSpec } from './types';

export const RENDER_CODES = {
  'render.explode.no-assembly': {
    hintTemplate:
      'Exploded views need a named assembly. Wrap each body in assembly().part(name, shape) and return arm.model() or arm.solvedModel(), then pass explode again.',
    nextAction: { kind: 'rewrite-feature', guidance: 'wrap bodies in assembly().part(...) and return arm.model() before requesting explode' },
    defaultSeverity: 'error',
    group: 'render',
    description: 'render_preview / kernelcad render --explode / svg-drawing options.exploded was requested on a script that did not capture an assembly().',
  },
} as const satisfies Record<`render.${string}`, DiagnosticCodeSpec>;
