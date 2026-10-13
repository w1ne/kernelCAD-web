// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { importStepTool } from '../tools/importStep';
import type { ToolRegistryEntry } from './types';

/**
 * Tail-appended family: user-file import. New families go at the END of
 * TOOL_REGISTRY so kernelCAD-server's index-based public contract stays stable.
 */
export const importToolEntries: ToolRegistryEntry[] = [
  {
    definition: {
      name: 'import_step',
      description:
        "Use this when the user wants to start from their own STEP or STL file (a part they designed elsewhere, a vendor model). " +
        'Give exactly one source: url (a public https direct-download link), upload (a file the user attached in ChatGPT), or content_base64 (raw bytes, small files only). Max 50 MB. ' +
        "The format is detected from the bytes (or pass format: 'step' | 'stl'). Writes the file and a starter <name>.kcad.ts whose base body is lib.fromSTEP / lib.fromSTL into output_dir (default: a fresh temp dir), evaluates it, " +
        'and returns { ok, format, model_path, script_path, code, bbox }. Pass script_path as { file } to evaluate_script, add_feature, dfm_review, export and the other tools, or edit code to build on the body. ' +
        'STL is a mesh: booleans, bbox and export work, but faces stay planar facets (use mesh_to_features for an editable feature tree). A non-watertight STL is refused unless allow_open is true.',
      inputSchema: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'Public https URL that downloads the .step/.stp/.stl file directly.' },
          upload: {
            type: 'object',
            description: 'ChatGPT file reference for a file the user attached.',
            properties: {
              download_url: { type: 'string' },
              file_id: { type: 'string' },
              mime_type: { type: 'string' },
              file_name: { type: 'string' },
            },
            required: ['download_url', 'file_id'],
          },
          content_base64: { type: 'string', description: 'The file bytes, base64-encoded (small files).' },
          file_name: { type: 'string', description: 'Original file name, used for format detection.' },
          format: { type: 'string', enum: ['step', 'stl'], description: 'Override format detection.' },
          output_dir: { type: 'string', description: 'Where to write the file and starter script. Default: a new temp directory.' },
          name: { type: 'string', description: "Base name for the written files. Default 'imported'." },
          allow_open: { type: 'boolean', description: 'STL only: accept a non-watertight mesh as an open shell.', default: false },
        },
      },
      _meta: { 'openai/fileParams': ['upload'] },
    },
    handler: input => importStepTool(input as unknown as Parameters<typeof importStepTool>[0]),
  },
];
