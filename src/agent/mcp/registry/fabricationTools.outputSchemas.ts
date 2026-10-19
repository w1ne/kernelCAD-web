// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Output schema for the fab_pack family, spread into TOOL_OUTPUT_SCHEMAS.
import type { JSONSchemaObject } from '../toolOutputSchemas';

export const FABRICATION_OUTPUT_SCHEMAS: Record<string, JSONSchemaObject> = {
  fab_pack: {
    type: 'object',
    properties: {
      ok: { type: 'boolean', description: 'True when every requested file was exported. bom scope: true when the pack has entries.' },
      output_dir: { type: 'string' },
      zip_path: { type: 'string', description: "Zip holding every written file, manifest.json and README.txt. bom scope: '<name>-order-pack.zip' with the per-part files, BOM, handoffs, manifest and README." },
      files: { type: 'array', items: { type: 'object', additionalProperties: true }, description: '{ format, ok, path?, byte_count?, error? } per requested format. bom scope: one { format: "order-pack", ok, path, byte_count, part_files } entry for the zip, part_files listing the per-part entry paths.' },
      quote_links: { type: 'array', items: { type: 'object', additionalProperties: true }, description: '{ service, processes, url, accepts, upload_file? }: public instant-quote pages; nothing is uploaded. bom scope: one link per service whose processes intersect the packed rows, upload_file naming an accepted part file when one was written.' },
      note: { type: 'string', description: 'Plain-language summary; bom scope covers the pack contents, the public upload pages, and a note count when the manifest carries notes.' },
      diagnostics: { type: 'array', items: { type: 'object', additionalProperties: true } },
      error: { type: 'string' },
    },
    required: ['ok', 'files', 'quote_links'],
    additionalProperties: true,
  },
};
