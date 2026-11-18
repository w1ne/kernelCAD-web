// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Output schemas for the scan-reference tools. Kept out of toolOutputSchemas.ts
// so that file stays at the max-lines ceiling.
import type { JSONSchemaObject } from '../toolOutputSchemas';

const BBOX = {
  type: 'object',
  additionalProperties: true,
  description: 'Axis-aligned box in millimetres: min, max, and size.',
} as const;

export const SCAN_REFERENCE_OUTPUT_SCHEMAS: Record<string, JSONSchemaObject> = {
  load_scan_reference: {
    type: 'object',
    properties: {
      ok: { type: 'boolean' },
      format: { type: 'string', enum: ['ply-ascii', 'ply-binary-little-endian', 'xyz'] },
      point_count: { type: 'integer' },
      bbox: BBOX,
      centroid: { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3 },
      units: { type: 'string', enum: ['mm', 'm', 'in'] },
      downsampled: { type: 'boolean' },
      stored_point_count: { type: 'integer' },
      solid: { type: 'boolean', description: 'Always false. A scan is not a BREP solid.' },
      disclaimer: { type: 'string' },
      error: { type: 'string' },
      errorCode: { type: 'string' },
    },
    required: ['ok', 'solid', 'disclaimer'],
    additionalProperties: true,
  },
  fit_model_to_scan: {
    type: 'object',
    properties: {
      ok: { type: 'boolean' },
      model_bbox: BBOX,
      scan_bbox: BBOX,
      translate_mm: { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3 },
      scale: { type: 'object', additionalProperties: true, description: 'per_axis and uniform scale factors.' },
      clearance_mm: { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3 },
      axis_deltas_mm: { type: 'object', additionalProperties: true },
      requirement: { type: 'object', additionalProperties: true, description: 'Present when requirement was passed. pass follows clearance_mm.' },
      scan_format: { type: 'string' },
      scan_point_count: { type: 'integer' },
      disclaimer: { type: 'string' },
      error: { type: 'string' },
      errorCode: { type: 'string' },
    },
    required: ['ok', 'disclaimer'],
    additionalProperties: true,
  },
};
