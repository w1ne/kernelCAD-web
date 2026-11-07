// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Output schema for split_keep_parts. Kept out of toolOutputSchemas.ts
// so that file stays under the max-lines ceiling.
import type { JSONSchemaObject } from '../toolOutputSchemas';

export const SPLIT_KEEP_PARTS_OUTPUT_SCHEMAS: Record<string, JSONSchemaObject> = {
  split_keep_parts: {
    type: 'object',
    properties: {
      ok: { type: 'boolean' },
      parts: {
        type: 'array',
        description: 'Kept solids. Empty fragments are omitted. A single keep is a one-element list.',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'intersection, a_only, or b_only.' },
            volume_mm3: { type: 'number' },
            bbox: {
              type: 'object',
              properties: {
                min: { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3 },
                max: { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3 },
              },
              required: ['min', 'max'],
            },
          },
          required: ['name', 'volume_mm3', 'bbox'],
        },
      },
      diagnostics: { type: 'array', items: { type: 'object', additionalProperties: true } },
      error: { type: 'string' },
      errorCode: { type: 'string' },
    },
    required: ['ok', 'parts', 'diagnostics'],
    additionalProperties: true,
  },
};
