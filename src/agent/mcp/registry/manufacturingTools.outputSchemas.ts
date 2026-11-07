// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Output schema for the dfm_review family, merged with the core schemas in toolRegistry.ts.
import type { JSONSchemaObject } from '../toolOutputSchemas';

export const MANUFACTURING_OUTPUT_SCHEMAS: Record<string, JSONSchemaObject> = {
  dfm_review: {
    type: 'object',
    properties: {
      ok: { type: 'boolean' },
      verdict: { type: 'string', enum: ['pass', 'fail'], description: "'fail' when any check fails; warnings do not fail the review." },
      processes: { type: 'array', items: { type: 'string' } },
      checks: {
        type: 'array',
        items: { type: 'object', additionalProperties: true },
        description: "Pass/fail checklist: { id (fdm.overhangs | fdm.bridging | fdm.min-wall | fdm.min-hole | fdm.min-pin | fdm.bed-fit | fdm.bed-contact | cnc.undercuts | cnc.internal-corner-radius | sheet.min-bend-radius | sheet.hole-to-bend | sheet.hole-to-edge | sheet.min-flange | sheet.not-sheet-metal | mold.draft | mold.wall-thickness | mold.undercuts | mold.sharp-internal-corners | mold.unmeasured), process, part, status: 'pass'|'fail'|'warn', summary, value?, limit? }.",
      },
      fdm: { type: 'array', items: { type: 'object', additionalProperties: true }, description: 'Per-part FDM engine report (part-local coordinates).' },
      cnc: { type: 'array', items: { type: 'object', additionalProperties: true }, description: 'Per-part CNC engine report (part-local coordinates).' },
      sheetMetal: { type: 'array', items: { type: 'object', additionalProperties: true }, description: 'Per-part sheet-metal report: bends, holeToBend, holeToEdge, flanges with flat-pattern [x, y] locations.' },
      injectionMolding: { type: 'array', items: { type: 'object', additionalProperties: true }, description: 'Per-part injection-molding report (dfmSpec moulding engine): draft.insufficient faces, undercut.faces (@kc refs), walls, thickest section, sharpCorners, unmeasured, limitations (part-local coordinates).' },
      diagnostics: { type: 'array', items: { type: 'object', additionalProperties: true } },
    },
    required: ['ok', 'verdict', 'checks', 'diagnostics'],
    additionalProperties: true,
  },
  dfm_fix_recheck: {
    type: 'object',
    properties: {
      ok: { type: 'boolean' },
      applied: { type: 'boolean' },
      status: { type: 'string', enum: ['applied', 'no-safe-fix', 'invalid'] },
      processes: { type: 'array', items: { type: 'string' } },
      material: { type: 'string', description: 'Echo of the call material. Recorded only; it does not change the gates.' },
      before: {
        type: 'object',
        additionalProperties: true,
        description: "{ verdict: 'pass'|'fail', findings: [{ id, process, part, status: 'fail'|'warn', summary, value?, limit? }] }.",
      },
      after: {
        type: 'object',
        additionalProperties: true,
        description: 'Same shape as before. Present only when a fix was applied and the second review ran.',
      },
      cleared: {
        type: 'array',
        items: { type: 'object', additionalProperties: true },
        description: "Findings present before and absent after: { id, part, was: 'fail'|'warn' }.",
      },
      remaining: {
        type: 'array',
        items: { type: 'object', additionalProperties: true },
        description: 'Open fail and warn findings after the edit, or the before findings when nothing was applied.',
      },
      suggestions: {
        type: 'array',
        items: { type: 'object', additionalProperties: true },
        description: 'Guidance for open findings. These are not applied.',
      },
      change: {
        type: 'object',
        additionalProperties: true,
        description: 'The one edit: kind, checkId, part, feature, param, before, after, namedLimit, unit, summary, changedParams, and the source line when an edit landed.',
      },
      new_code: { type: 'string', description: 'Revised source. Present only when applied is true. The caller persists it.' },
      refusal: { type: 'string' },
      diagnostics: { type: 'array', items: { type: 'object', additionalProperties: true } },
      error: { type: 'string' },
      bounds: {
        type: 'object',
        additionalProperties: true,
        description: '{ maxApplies: 1, appliedCount: 0|1 }.',
      },
    },
    required: ['ok', 'applied', 'status', 'processes', 'before', 'cleared', 'remaining', 'suggestions', 'diagnostics', 'bounds'],
    additionalProperties: true,
  },
};
