// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import type { DiagnosticCodeSpec } from './types';

export const SKETCH_CODES = {
  // 2D tangency constructions (2)
  'sketch.tangency.no-solution': {
    hintTemplate:
      'No circle or line satisfies the requested tangencies. Enlarge the radius so it can bridge the entities, move the entities closer, or relax the side qualifiers.',
    nextAction: { kind: 'rewrite-feature', guidance: 'enlarge the tangency radius, move the entities closer together, or relax the side qualifiers' },
    defaultSeverity: 'error',
    group: 'sketch',
    description:
      'A Geom2dGcc tangency construction has no solution — e.g. no circle of the given radius is tangent to two lines further apart than twice that radius, or the side qualifiers describe a configuration that cannot exist.',
  },
  'sketch.tangency.ambiguous': {
    hintTemplate:
      "Several solutions satisfy the tangency conditions. Pass opts.near: [x, y] beside the one you want, or tighten the entities' side qualifiers (outside / enclosed / enclosing).",
    nextAction: { kind: 'fix-arg', field: 'near' },
    defaultSeverity: 'error',
    group: 'sketch',
    description:
      'A tangency construction resolved to more than one solution and no disambiguating hint was supplied, so the kernel refused to pick one.',
  },
  // Text (2)
  'sketch.text.font-not-found': {
    hintTemplate:
      "The font name is not registered. Use fontPath('/path/to/font.ttf') to load a TTF from disk, or omit opts.font to use the bundled Liberation Sans.",
    nextAction: { kind: 'fix-arg', field: 'font' },
    defaultSeverity: 'error',
    group: 'sketch',
    description: 'sketch.text() was called with a font name that is not registered with the kernel.',
  },
  'sketch.text.empty-content': {
    hintTemplate:
      'sketch.text(content) requires a non-empty string with at least one printable glyph.',
    nextAction: { kind: 'fix-arg', field: 'content' },
    defaultSeverity: 'error',
    group: 'sketch',
    description: 'sketch.text() was called with empty or whitespace-only content.',
  },
} as const satisfies Record<`sketch.${string}`, DiagnosticCodeSpec>;
