// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import type { DiagnosticCodeSpec } from './types';

export const MESHER_CODES = {
  // K1 watertight gap enrichment — STL export tessellation self-intersects on revolved cones.
  'mesher.cone-self-intersection': {
    hintTemplate:
      "Open3d's is_watertight() rejected the STL because OCCT's BRepMesh emits self-intersecting triangles on revolved cone faces (the K1 mesher gap). Geometry is likely correct — only the export tessellation is degenerate. Workarounds: (a) remesh the exported STL via Manifold before scoring, (b) raise mesh deflection on export to merge offending triangles, (c) re-author the cone surface via nurbsSurfaceLowerer instead of .revolve(). Track gap-closure progress under K1.",
    nextAction: { kind: 'rewrite-feature', guidance: 'remesh STL via Manifold, raise mesh deflection, or re-author the cone via nurbsSurfaceLowerer' },
    defaultSeverity: 'warn',
    group: 'mesher',
    description: 'BRepMesh emitted self-intersecting triangles on a revolved cone face, breaking watertight checks on the exported STL.',
  },
} as const satisfies Record<`mesher.${string}`, DiagnosticCodeSpec>;
