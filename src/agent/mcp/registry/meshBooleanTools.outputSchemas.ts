// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { JSONSchemaObject } from '../toolOutputSchemas';

export const MESH_BOOLEAN_OUTPUT_SCHEMAS: Record<string, JSONSchemaObject> = {
  mesh_boolean: {
    type: 'object',
    properties: {
      ok: { type: 'boolean' },
      operation: { type: 'string', enum: ['union', 'subtract', 'intersect'] },
      volumeMm3: { type: 'number', description: 'Output mesh volume in cubic millimetres.' },
      triangleCount: { type: 'number' },
      format: { type: 'string', enum: ['stl'] },
      data_base64: { type: 'string', description: 'Binary STL payload; can be passed to import_step as content_base64.' },
      error: { type: 'string' },
    },
    required: ['ok'],
    additionalProperties: true,
  },
};
