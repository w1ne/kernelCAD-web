// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { JSONSchemaObject } from '../toolOutputSchemas';
import { SCENE_SUMMARY_SCHEMA } from '../sceneSummarySchema';

export const SURFACE_BLEND_OUTPUT_SCHEMAS: Record<string, JSONSchemaObject> = {
  apply_surface_blend: {
    type: 'object',
    properties: {
      ok: { type: 'boolean' },
      new_code: { type: 'string' },
      operation: { type: 'string', enum: ['fillet', 'chamfer'] },
      selector: { description: 'Selector supplied for the authored blend, when present.' },
      step: { type: 'object', additionalProperties: true },
      sceneSummary: SCENE_SUMMARY_SCHEMA,
      diagnostics: { type: 'array', items: { type: 'object', additionalProperties: true } },
      error: { type: 'string' },
    },
    required: ['ok'],
    additionalProperties: true,
  },
};
