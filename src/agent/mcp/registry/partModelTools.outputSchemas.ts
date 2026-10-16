// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { JSONSchemaObject } from '../toolOutputSchemas';

export const PART_MODEL_OUTPUT_SCHEMAS: Record<string, JSONSchemaObject> = {
  fetch_part_model: {
    type: 'object',
    properties: {
      ok: { type: 'boolean' },
      ref: { type: 'string' },
      errorCode: { type: 'string' },
      format: { type: 'string', enum: ['step', 'glb'] },
      model_path: { type: 'string' },
      sha256: { type: 'string' },
      cache_hit: { type: 'boolean' },
      bbox_check: { type: 'object', properties: { status: { type: 'string', enum: ['not_checked', 'within_tolerance', 'outside_tolerance'] }, expected_mm: { type: 'array', items: { type: 'number' } }, actual_mm: { type: 'array', items: { type: 'number' } }, tolerance_ratio: { type: 'number' } }, additionalProperties: true },
      attribution: { type: 'object', additionalProperties: true },
      error: { type: 'string' },
    },
    required: ['ok'],
    additionalProperties: true,
  },
};
