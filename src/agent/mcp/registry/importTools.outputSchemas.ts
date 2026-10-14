// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Output schema for the import_step family, spread into TOOL_OUTPUT_SCHEMAS.
import type { JSONSchemaObject } from '../toolOutputSchemas';

export const IMPORT_OUTPUT_SCHEMAS: Record<string, JSONSchemaObject> = {
  import_step: {
    type: 'object',
    properties: {
      ok: { type: 'boolean' },
      format: { type: 'string', enum: ['step', 'stl'] },
      model_path: { type: 'string', description: 'The imported file on disk.' },
      script_path: { type: 'string', description: 'Starter .kcad.ts whose base body is the imported file; pass as { file } to other tools.' },
      code: { type: 'string', description: 'Source of the starter script.' },
      byte_count: { type: 'number' },
      bbox: { type: 'object', additionalProperties: true, description: '{ min, max, size } in mm.' },
      diagnostics: { type: 'array', items: { type: 'object', additionalProperties: true } },
      error: { type: 'string' },
    },
    required: ['ok', 'diagnostics'],
    additionalProperties: true,
  },
};
