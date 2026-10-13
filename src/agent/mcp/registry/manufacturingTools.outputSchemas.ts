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
        description: "Pass/fail checklist: { id (fdm.overhangs | fdm.bridging | fdm.min-wall | fdm.min-hole | fdm.min-pin | fdm.bed-fit | fdm.bed-contact | cnc.undercuts | cnc.internal-corner-radius), process, part, status: 'pass'|'fail'|'warn', summary, value?, limit? }.",
      },
      fdm: { type: 'array', items: { type: 'object', additionalProperties: true }, description: 'Per-part FDM engine report (part-local coordinates).' },
      cnc: { type: 'array', items: { type: 'object', additionalProperties: true }, description: 'Per-part CNC engine report (part-local coordinates).' },
      diagnostics: { type: 'array', items: { type: 'object', additionalProperties: true } },
    },
    required: ['ok', 'verdict', 'checks', 'diagnostics'],
    additionalProperties: true,
  },
};
