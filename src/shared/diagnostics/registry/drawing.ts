// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import type { DiagnosticCodeSpec } from './types';

export const DRAWING_CODES = {
  // Drawings — GD&T + section-view annotation kinds (4). 'hole' / 'fillet' /
  // 'chamfer' reuse 'feature.selection.no-match' (same failure shape as the
  // existing radius/diameter/angular kinds); these four are for the parts of
  // the drawing surface with no existing analogue. plane-misses-body and
  // annotation.overlap are reserved for the not-yet-shipped section-view and
  // collision-solver work so a later slice doesn't need a second catalog bump.
  'drawing.datum.unresolved': {
    hintTemplate:
      "A 'datum' annotation's face query matched zero or more than one face. Inspect the model with list_faces / list_face_labels, then tighten the query or add 'near'.",
    nextAction: { kind: 'call-introspection-tool', tool: 'list_faces' },
    defaultSeverity: 'error',
    group: 'drawing',
    description: "A drawing 'datum' annotation's face query could not be resolved to exactly one face.",
  },
  'drawing.tolerance.feature-unresolved': {
    hintTemplate:
      "An 'fcf' (feature control frame) annotation's edge/face query could not be resolved. Inspect the model with list_edges / list_faces, then tighten the query or add 'near'.",
    nextAction: { kind: 'call-introspection-tool', tool: 'list_edges' },
    defaultSeverity: 'error',
    group: 'drawing',
    description: "A drawing 'fcf' annotation's referenced feature (edge or face) could not be resolved to exactly one match.",
  },
  'drawing.section.plane-misses-body': {
    hintTemplate:
      'The section cutting plane does not intersect the model bounding box. Move the plane origin so it passes through the body, or check the plane normal.',
    nextAction: { kind: 'fix-arg', field: 'options.sections[i].plane' },
    defaultSeverity: 'error',
    group: 'drawing',
    description: 'A drawing section-view cutting plane does not intersect the body being drawn.',
  },
  'drawing.annotation.overlap': {
    hintTemplate:
      'Two drawing annotations overlap on the sheet. Reorder the annotations array, pass a different `view`, or add `offset` to push one of them further out.',
    nextAction: { kind: 'rewrite-feature', guidance: 'reorder annotations, change view, or add offset to separate overlapping callouts' },
    defaultSeverity: 'warn',
    group: 'drawing',
    description: 'Two rendered drawing annotations occupy overlapping sheet-space text/leader regions.',
  },
  // Drawings — automatic dimensioning + GD&T (2). Both warn: the sheet still
  // exports with every annotation the rules could derive, and the diagnostic
  // names what the rules could not decide instead of dropping it silently.
  'drawing.auto.datum-ambiguous': {
    hintTemplate:
      "autoAnnotate could not establish one or more datums from the part's planar faces (A = largest planar face, B / C = largest planar faces orthogonal to it). Declare the missing datum with shape.datum('B', faceQuery) or options.autoAnnotate.datums, then re-export.",
    nextAction: { kind: 'call-introspection-tool', tool: 'list_faces' },
    defaultSeverity: 'warn',
    group: 'drawing',
    description: 'Automatic drawing annotation could not derive a datum reference frame (A/B/C) from the planar faces of the part.',
  },
  'drawing.auto.hole-unclassified': {
    hintTemplate:
      'autoAnnotate found a bore it cannot express as a simple, counterbored or countersunk hole (stacked bores, an internal duct, or an axis off the principal views), so it has no automatic callout. Dimension it with an options.annotations hole / diameter entry.',
    nextAction: { kind: 'rewrite-feature', guidance: 'add an options.annotations hole or diameter entry for the named bore' },
    defaultSeverity: 'warn',
    group: 'drawing',
    description: 'Automatic drawing annotation found a cylindrical bore that is not a simple, counterbored or countersunk hole along a principal view axis.',
  },
  'drawing.balloons.bom-unavailable': {
    hintTemplate:
      'Balloons and the parts-list table are filled from inspect({ of: \'bom\' }). Return assembly.model() with named parts, or omit balloons/partsList.',
    nextAction: { kind: 'rewrite-feature', guidance: 'return assembly.model() so a BOM can be extracted, or omit balloons/partsList' },
    defaultSeverity: 'warn',
    group: 'drawing',
    description: 'svg-drawing balloons or partsList was requested but the script has no assembly, so no BOM rows exist to number balloons or fill the table.',
  },
} as const satisfies Record<`drawing.${string}`, DiagnosticCodeSpec>;
