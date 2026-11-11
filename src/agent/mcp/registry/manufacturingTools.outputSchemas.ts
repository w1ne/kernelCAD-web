// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Output schema for the dfm_review family, merged with the core schemas in toolRegistry.ts.
import type { JSONSchemaObject } from '../toolOutputSchemas';

export const MANUFACTURING_OUTPUT_SCHEMAS: Record<string, JSONSchemaObject> = {
  dfm_review: {
    type: 'object',
    properties: {
      ok: { type: 'boolean', description: 'Invocation and model/analysis execution status, not a manufacturing pass indicator. A checked manufacturing failure can return ok: true.' },
      verdict: { type: 'string', enum: ['pass', 'fail', 'not-checked'], description: "Manufacturing outcome. 'fail' takes precedence over incomplete checks; otherwise 'not-checked' means a requested rule was not evaluated; 'pass' means the review completed with no failing or not-checked rows. Omitted when input or model evaluation fails before a review exists." },
      processes: { type: 'array', items: { type: 'string' } },
      checks: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Stable DFM rule key.' },
            process: { type: 'string', enum: ['fdm', 'cnc', 'sheet-metal', 'injection-molding'] },
            part: { type: 'string' },
            source: { type: 'string', enum: ['fdm', 'cnc', 'sheet-metal', 'injection-molding'], description: 'KernelCAD process engine that supplied this row; equals process.' },
            status: { type: 'string', enum: ['pass', 'fail', 'warn', 'not-checked'] },
            summary: { type: 'string' },
            value: { type: 'number' },
            limit: { type: 'number' },
            unit: { type: 'string', enum: ['mm', 'mm2', 'deg', 'ratio'], description: 'Present when numeric evidence has a meaningful unit.' },
            op: { type: 'string', enum: ['>=', '<='], description: 'Passing comparison, only when value and limit have matching units.' },
            refs: { type: 'array', items: { type: 'string' }, description: 'Inspectable @kc topology references emitted by the analysis engine.' },
          },
          required: ['id', 'process', 'part', 'source', 'status', 'summary'],
          additionalProperties: true,
        },
        description: "Checklist rows keep `id` as the rule key. A `warn` row is an evaluated warning; `not-checked` means required analysis or measurement is unavailable. `unit` and `op` are included only for comparable measured values and limits. `refs` contains only topology refs already emitted by the DFM engine.",
      },
      fdm: { type: 'array', items: { type: 'object', additionalProperties: true }, description: 'Per-part FDM engine report (part-local coordinates).' },
      cnc: { type: 'array', items: { type: 'object', additionalProperties: true }, description: 'Per-part CNC engine report (part-local coordinates).' },
      sheetMetal: { type: 'array', items: { type: 'object', additionalProperties: true }, description: 'Per-part sheet-metal report: bends, holeToBend, holeToEdge, flanges with flat-pattern [x, y] locations.' },
      injectionMolding: { type: 'array', items: { type: 'object', additionalProperties: true }, description: 'Per-part injection-molding report (dfmSpec moulding engine): draft.insufficient faces, undercut.faces (@kc refs), walls, thickest section, sharpCorners, unmeasured, limitations (part-local coordinates).' },
      diagnostics: { type: 'array', items: { type: 'object', additionalProperties: true } },
    },
    required: ['ok', 'checks', 'diagnostics'],
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
        description: "{ verdict?: 'pass'|'fail'|'not-checked', findings: [{ id, process, part, status: 'fail'|'warn'|'not-checked', summary, value?, limit?, unit?, op?, source?, refs? }] }. Findings retain incomplete checks; input/model errors can have no verdict.",
      },
      after: {
        type: 'object',
        additionalProperties: true,
        description: 'Same shape as before. Present only when a fix was applied and the second review ran.',
      },
      cleared: {
        type: 'array',
        items: { type: 'object', additionalProperties: true },
        description: "Findings present before and absent after: { id, part, was: 'fail'|'warn'|'not-checked' }.",
      },
      remaining: {
        type: 'array',
        items: { type: 'object', additionalProperties: true },
        description: 'Open fail, warn and not-checked findings after the edit, or the before findings when nothing was applied.',
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
