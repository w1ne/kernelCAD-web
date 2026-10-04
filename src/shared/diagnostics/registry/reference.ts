// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import type { DiagnosticCodeSpec } from './types';

export const REFERENCE_CODES = {
  // Slice E — image/photo-reference assumption ledger (2).
  'reference.assumptions.unresolved': {
    hintTemplate:
      "The assumption ledger built from this reference has open facts (missing scale, unconfirmed inferred/assumed values). Call `resolve_assumptions` with the ledger path and a resolution ({ id, value } to override or { id, confirm: true } to accept) for each open fact before committing geometry derived from it.",
    nextAction: { kind: 'call-tool', tool: 'resolve_assumptions', args: {} },
    defaultSeverity: 'warn',
    group: 'reference',
    description: 'trace_from_image (or another reference-ingest path) produced an assumption ledger with at least one open fact; severity escalates to error when validate:"error" is set and a "missing" fact (e.g. scale) is still open.',
  },
  'reference.assumptions.ledger-not-found': {
    hintTemplate:
      "resolve_assumptions could not read the ledger file at the supplied `ledgerPath`. Verify the path matches the `<model>.ledger.json` file trace_from_image's caller persisted, and that it has not been moved or deleted.",
    nextAction: { kind: 'check-file-path' },
    defaultSeverity: 'error',
    group: 'reference',
    description: 'resolve_assumptions was called with a ledgerPath that does not exist or does not parse as a valid AssumptionLedger.',
  },
  'reference.assumptions.unknown-resolution-id': {
    hintTemplate:
      "One or more resolution `id`s did not match any fact in the ledger. Re-read the ledger's `facts[].id` values and re-call resolve_assumptions with matching ids — a typo or a stale ledger snapshot are the usual causes.",
    nextAction: { kind: 'fix-arg', field: 'resolutions[].id' },
    defaultSeverity: 'warn',
    group: 'reference',
    description: 'resolve_assumptions was called with a resolution id that does not match any fact.id in the ledger.',
  },
  // Engineering-drawing PDF import (4) — drawing_to_cad.
  'reference.drawing.raster-only': {
    hintTemplate:
      'This PDF page is a scanned or photographed drawing: it holds raster images and no vector linework or dimension text to read. Render the page to a PNG and call `trace_from_image` with a scaleAnchor taken from a dimension you can read on it, or obtain the vector PDF (or DXF) export from the CAD system that produced the drawing.',
    nextAction: { kind: 'call-tool', tool: 'trace_from_image', args: {} },
    defaultSeverity: 'error',
    group: 'reference',
    description: 'drawing_to_cad was given a PDF page whose content is raster images rather than vector paths and text.',
  },
  'reference.drawing.view-ambiguous': {
    hintTemplate:
      "The orthographic views could not be identified unambiguously (no projection alignment, conflicting view labels, or a single view). Check `views` in the result; if the sheet is first-angle, re-run with projection: 'first-angle', and confirm or override the `views` / `projection` ledger facts with resolve_assumptions.",
    nextAction: { kind: 'fix-arg', field: 'projection' },
    defaultSeverity: 'warn',
    group: 'reference',
    description: 'drawing_to_cad found no orthographic view, only one view, or views whose arrangement and labels disagree about which is front/top/side.',
  },
  'reference.drawing.dimension-unassociated': {
    hintTemplate:
      "A dimension or callout could not be tied to drawn geometry (it spans no modelled edge or hole centre, or its leader reaches no circle), so its value did not drive the model. Read the ledger's `unapplied:` facts and set the matching param with set_param, or resolve the fact with resolve_assumptions once you have placed the value.",
    nextAction: { kind: 'call-tool', tool: 'resolve_assumptions', args: {} },
    defaultSeverity: 'warn',
    group: 'reference',
    description: 'drawing_to_cad read a dimension or callout whose extension lines or leader could not be associated with any silhouette edge, hole centre or circle.',
  },
  'reference.drawing.depth-missing': {
    hintTemplate:
      "No view shows the part along its extrusion axis and no thickness note was found, so the depth in the emitted script is a placeholder. Resolve the `thickness` ledger fact with the real value via resolve_assumptions and feed the returned paramOverrides to set_param.",
    nextAction: { kind: 'call-tool', tool: 'resolve_assumptions', args: {} },
    defaultSeverity: 'warn',
    group: 'reference',
    description: 'drawing_to_cad rebuilt an extruded profile whose depth is not stated by any orthogonal view or thickness note.',
  },
  // Mesh / scan reconstruction (3) — mesh_to_features.
  'reference.mesh.not-watertight': {
    hintTemplate:
      'The mesh handed to mesh_to_features has open, non-manifold or mis-oriented edges, so its sections and volume are unreliable and the result cannot be faithful. Repair or re-export the mesh watertight, then run mesh_to_features again.',
    nextAction: { kind: 'fix-arg', field: 'file' },
    defaultSeverity: 'warn',
    group: 'reference',
    description: 'mesh_to_features was given a mesh whose edges are not all shared by exactly two consistently oriented triangles.',
  },
  'reference.mesh.low-fidelity': {
    hintTemplate:
      "The reconstructed script does not match the mesh within the faithful thresholds (volume IoU and max surface deviation are in the message). Treat it as a starting point: fix the features near the largest deviation or model the unmatched regions before relying on its dimensions.",
    nextAction: { kind: 'rewrite-feature', guidance: 'compare the emitted script against the mesh and correct the features near the largest deviation' },
    defaultSeverity: 'warn',
    group: 'reference',
    description: 'mesh_to_features returned a reconstruction whose measured volume IoU or surface deviation misses the faithful thresholds (verdict approximate or failed).',
  },
  'reference.mesh.freeform-region-unmatched': {
    hintTemplate:
      'Part of the mesh surface matched no plane, cylinder or supported feature, so it is absent from the emitted script. Model those regions by hand (each has a bbox in unmatchedRegions) or accept the approximation the fidelity numbers describe.',
    nextAction: { kind: 'inspect-message' },
    defaultSeverity: 'warn',
    group: 'reference',
    description: 'mesh_to_features found freeform, tilted-planar or off-axis cylindrical surface regions it could not represent as features.',
  },

  // Body likeness publish gate (verify check: 'body-likeness').
  'reference.likeness.auto-failed': {
    hintTemplate:
      'Automated body-likeness AABB/wheel checks failed (wheels outside footprint, floating rocker, or wheelbase not spanned). Adjust the envelope or wheel centres, then re-run verify({ check: \'body-likeness\' }).',
    nextAction: { kind: 'call-tool', tool: 'verify', args: { check: 'body-likeness' } },
    defaultSeverity: 'error',
    group: 'reference',
    description: 'Cheap AABB↔wheel body-likeness checks failed before publish.',
  },
  'reference.likeness.stills-incomplete': {
    hintTemplate:
      'Body-likeness still verdicts are missing. render_preview (or open_in_studio) ortho views, then pass still_verdicts for side-body-over-wheels, side-cabin-aft, rear-haunch, and ortho-proportions-vs-reference.',
    nextAction: { kind: 'call-tool', tool: 'verify', args: { check: 'body-likeness' } },
    defaultSeverity: 'error',
    group: 'reference',
    description: 'Required agent still verdicts for body likeness were not supplied.',
  },
  'reference.likeness.still-failed': {
    hintTemplate:
      'An agent still verdict failed or lacked concrete evidence. Fix the geometry cue named in the finding (body-over-wheels, cabin-aft, haunch, proportions), re-render, and re-run verify({ check: \'body-likeness\' }) before claiming success.',
    nextAction: { kind: 'call-tool', tool: 'verify', args: { check: 'body-likeness' } },
    defaultSeverity: 'error',
    group: 'reference',
    description: 'A required body-likeness still verdict failed or had weak evidence.',
  },
} as const satisfies Record<`reference.${string}`, DiagnosticCodeSpec>;
