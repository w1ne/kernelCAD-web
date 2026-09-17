// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import type { DiagnosticCodeSpec } from './types';

export const INSPECT_CODES = {
  'inspect.continuity.g1-break': {
    hintTemplate:
      "The shared edge is only G0 (normals jump). Fillet or blend it; use continuity: 'G2' only on NURBS-adjacent edges, then re-run inspect({ of: 'continuity' }).",
    nextAction: { kind: 'call-introspection-tool', tool: 'inspect' },
    defaultSeverity: 'warn',
    group: 'inspect',
    description: 'A shared edge between faces fails G1 — the face normals jump by more than the G1 angle tolerance (a box corner is the canonical case).',
  },
  'inspect.continuity.broken': {
    hintTemplate:
      "Faces do not meet along this edge (G0 gap). Sew or rebuild the join, then re-run inspect({ of: 'continuity' }).",
    nextAction: { kind: 'call-introspection-tool', tool: 'inspect' },
    defaultSeverity: 'error',
    group: 'inspect',
    description: 'A shared edge fails G0: the adjacent faces have a measurable position gap along the edge.',
  },
  'inspect.curvature.spike': {
    hintTemplate:
      "A face has a curvature spike versus the rest of that face. Smooth the control net, raise the blend continuity, or split the face, then re-run inspect({ of: 'curvature' }).",
    nextAction: { kind: 'call-introspection-tool', tool: 'inspect' },
    defaultSeverity: 'warn',
    group: 'inspect',
    description: "A UV sample on a face is an outlier in Gaussian curvature versus that face's own distribution.",
  },
} as const satisfies Record<`inspect.${string}`, DiagnosticCodeSpec>;
