// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Authoring intent lint (usage triage 2026-10-03, P0 item 2). A static scan of
// the script source on `evaluate_script`: the source says what the part is for
// (M4, thread, gear, sheet metal, PLA fit, a traced outline) but builds it by
// hand instead of with the API that exists for it. Info only — never fails an
// evaluation. Emitter: src/agent/cookbook/intentLint.ts.

import type { DiagnosticCodeSpec } from './types';

export const AUTHORING_CODES = {
  'authoring.prefer-api.thread': {
    hintTemplate:
      "Make threaded / M-size holes with shape.hole(face, { diameter: <nominal>, thread: { pitch } }) or holes(...), not a subtracted cylinder. Recipes: threaded-hole-tap-drill, heat-set-insert-pilot.",
    nextAction: { kind: 'call-tool', tool: 'lookup_cookbook', args: { query: 'M4 threaded hole tap drill' } },
    defaultSeverity: 'info',
    group: 'authoring',
    description: 'The source names a thread, tap, metric screw size or heat-set insert but has no hole()/holes() feature that carries it.',
  },
  'authoring.prefer-api.hole-by-cylinder': {
    hintTemplate:
      "Replace subtracted cylinders with shape.holes(face, { positions, diameter, depth }); hole features reach export, drawings and DFM. Recipe: clearance-hole-through-plate.",
    nextAction: { kind: 'call-tool', tool: 'lookup_cookbook', args: { query: 'clearance hole through plate' } },
    defaultSeverity: 'info',
    group: 'authoring',
    description: 'The script cuts three or more holes by subtracting cylinders and never calls hole()/holes().',
  },
  'authoring.prefer-api.gear': {
    hintTemplate:
      "Build gears with spurGear({ module, teeth, faceWidth, backlash }) (ringGear for internal teeth), not hand-built teeth. Recipe: involute-spur-gear-pair.",
    nextAction: { kind: 'call-tool', tool: 'lookup_cookbook', args: { query: 'two meshing spur gears' } },
    defaultSeverity: 'info',
    group: 'authoring',
    description: 'The source names gears, involutes, teeth or a gear module but never calls spurGear()/ringGear()/internalSpurGear().',
  },
  'authoring.prefer-api.sheet-metal': {
    hintTemplate:
      "Build bent parts with sheetMetal(profile, { thickness, kFactor }).bend(...) and get the blank from MCP flatten_pattern. Recipe: sheet-metal-l-bracket-bend.",
    nextAction: { kind: 'call-tool', tool: 'lookup_cookbook', args: { query: 'bent sheet metal bracket with flat pattern' } },
    defaultSeverity: 'info',
    group: 'authoring',
    description: 'The source names sheet metal, bends, a flat pattern or a k-factor but never calls sheetMetal().',
  },
  'authoring.prefer-api.fdm-clearance': {
    hintTemplate:
      "Declare dfmSpec({ process: 'fdm', minClearance, minWall, printer }) so the print clearance is checked, not only typed. Recipe: fdm-fit-clearance-by-fit-type.",
    nextAction: { kind: 'call-tool', tool: 'lookup_cookbook', args: { query: 'print clearance for a snap fit lid' } },
    defaultSeverity: 'info',
    group: 'authoring',
    description: 'The script has a clearance / fit / gap / tolerance value for a printed part but no dfmSpec() that checks it.',
  },
  'authoring.prefer-api.typed-trace': {
    hintTemplate:
      "Do not type outline points by hand: trace the image with MCP trace_from_image, then fix scale and unknowns with resolve_assumptions. Recipe: resolve-photo-trace-assumptions.",
    nextAction: { kind: 'call-tool', tool: 'trace_from_image', args: {} },
    defaultSeverity: 'info',
    group: 'authoring',
    description: 'The script holds a hand-typed outline of 40 or more literal points.',
  },
} as const satisfies Record<`authoring.${string}`, DiagnosticCodeSpec>;
