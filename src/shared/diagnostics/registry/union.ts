// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Union integrity guard. `assembly()` models get interference and
// floating-part checks from the assembly validator; a model fused with
// `union()` used to bypass both, so a tray whose cross tubes ran into its
// rails shipped as "validated". Emitted at the shared evaluate seam
// (`evaluateAndBuildScript`) by src/modeling/validation/unionIntegrity.ts.

import type { DiagnosticCodeSpec } from './types';

export const UNION_CODES = {
  'union.disconnected': {
    hintTemplate:
      'Move the floating operand until it touches the rest (shared face, zero gap) or add the bracket/strut that carries it; a union of parts that never touch is not one physical body. If they really are separate parts, build them with assembly().part(name, shape).',
    nextAction: {
      kind: 'rewrite-feature',
      guidance: 'close the reported gap so every union operand touches the main body, or split the bodies into assembly().part(...) parts',
    },
    defaultSeverity: 'error',
    group: 'union',
    description: 'A union() result consists of more than one separate solid: some operands neither touch nor overlap the rest.',
  },
  'union.member-overlap': {
    hintTemplate:
      'Cut the members to fit instead of burying one in the other: a cross member between two rails is span minus two rail widths, placed at the rail width, so its end faces touch the rails (butt joint). Or build each member as assembly().part(name, shape) so interference is checked per part.',
    nextAction: {
      kind: 'rewrite-feature',
      guidance: 'shorten or move one member so the two separately finished operands touch instead of sharing volume (butt joint)',
    },
    defaultSeverity: 'error',
    group: 'union',
    description: 'Two union() operands that each carry their own finish/material (declared separate physical parts) share more than 1 mm³ of volume.',
  },
} as const satisfies Record<string, DiagnosticCodeSpec>;
