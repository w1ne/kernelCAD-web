// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { JSONSchemaObject } from '../toolOutputSchemas';

export const BOM_OUTPUT_SCHEMAS: Record<string, JSONSchemaObject> = {
  write_bom: {
    type: 'object',
    properties: {
      ok: { type: 'boolean' }, destination: { type: 'string', enum: ['csv'] },
      rows: { type: 'array', items: { type: 'object', additionalProperties: true } },
      headers: { type: 'array', items: { type: 'string' } },
      sheets_rows: { type: 'array', items: { type: 'array', items: { type: ['string', 'number'] } } },
      csv: { type: 'string' }, path: { type: 'string' }, error: { type: 'string' },
    },
    required: ['ok', 'destination', 'rows', 'headers', 'sheets_rows', 'csv'], additionalProperties: true,
  },
};
