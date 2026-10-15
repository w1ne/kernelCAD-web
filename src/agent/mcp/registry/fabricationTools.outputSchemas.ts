// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Output schema for the fab_pack family, spread into TOOL_OUTPUT_SCHEMAS.
import type { JSONSchemaObject } from '../toolOutputSchemas';

export const FABRICATION_OUTPUT_SCHEMAS: Record<string, JSONSchemaObject> = {
  fab_pack: {
    type: 'object',
    properties: {
      ok: { type: 'boolean', description: 'True when every requested file was exported.' },
      output_dir: { type: 'string' },
      zip_path: { type: 'string', description: 'Zip holding every written file, manifest.json and README.txt.' },
      files: { type: 'array', items: { type: 'object', additionalProperties: true }, description: '{ format, ok, path?, byte_count?, error? } per requested format.' },
      quote_links: { type: 'array', items: { type: 'object', additionalProperties: true }, description: '{ service, processes, url, accepts, upload_file? }: public instant-quote pages; nothing is uploaded.' },
      note: { type: 'string' },
      diagnostics: { type: 'array', items: { type: 'object', additionalProperties: true } },
      error: { type: 'string' },
    },
    required: ['ok', 'files', 'quote_links'],
    additionalProperties: true,
  },
};
