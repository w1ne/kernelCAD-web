// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Output schema for resolve_metric_thread. Kept out of toolOutputSchemas.ts
// so that file stays under the max-lines ceiling.
import type { JSONSchemaObject } from '../toolOutputSchemas';

export const METRIC_THREAD_OUTPUT_SCHEMAS: Record<string, JSONSchemaObject> = {
  resolve_metric_thread: {
    type: 'object',
    properties: {
      ok: { type: 'boolean' },
      spec: { type: 'string', description: 'Canonical coarse designation, for example M12x1.75.' },
      diameter_mm: { type: 'number', description: 'Nominal major diameter of the matched size, not the query when it was a tap drill.' },
      pitch_mm: { type: 'number' },
      coarse: { type: 'boolean' },
      tap_drill_mm: { type: 'number', description: 'D − P for the matched coarse size.' },
      minor_diameter_mm: { type: 'number' },
      kind_matched: { type: 'string', enum: ['nominal', 'tap_drill'] },
      warnings: { type: 'array', items: { type: 'string' } },
      error: { type: 'string' },
      errorCode: { type: 'string' },
      candidates: { type: 'array', items: { type: 'string' }, description: 'Equidistant specs when the diameter is ambiguous.' },
    },
    required: ['ok'],
    additionalProperties: true,
  },
};
