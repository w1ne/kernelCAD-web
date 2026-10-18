// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { fabPackTool } from '../tools/fabPack';
import type { ToolRegistryEntry } from './types';

/**
 * Tail-appended family: fabrication handoff. New families go at the END of
 * TOOL_REGISTRY so kernelCAD-server's index-based public contract stays stable.
 */
export const fabricationToolEntries: ToolRegistryEntry[] = [
  {
    definition: {
      name: 'fab_pack',
      description:
        'Use this when the user wants to get a part made: packages the fabrication files into one directory plus a zip, and returns links to public instant-quote pages. ' +
        "Pass { file | code } and output_dir; optional scope ('part', default — one script's files; 'bom' — the whole assembly's BOM: per-part single-body files, per-part drawings, bom.csv/json and vendor handoff texts), " +
        "name (default 'part'), formats (default step, stl, 3mf, pdf-drawing, bom-csv; add 'dxf' for flat or sheet parts), " +
        "and processes ('3d-print' | 'cnc' | 'sheet-cut') to filter the links (bom: also narrows which fabricated rows are packed). Each file is written by the export tool, so its gates apply; a format that fails is reported in files[] and the rest still ship. " +
        'Also writes manifest.json and README.txt. quote_links lists JLC3DP, JLCCNC, PCBWay, Xometry, SendCutSend and Craftcloud with the pack file to upload to each. ' +
        'One body per file: multi-body files are rejected by every shop. DXF is written only for flat or sheet-metal parts. The McMaster handoff text carries part numbers only, because McMaster quantities are packs and pack sizes are not in the catalog yet. ' +
        'These are plain web pages: nothing is uploaded or ordered. The user opens the link and uploads the file. Run dfm_review first if you have not.',
      inputSchema: {
        type: 'object',
        properties: {
          scope: {
            type: 'string',
            enum: ['part', 'bom'],
            description: "Default 'part' (a single-part pack). 'bom' packs the whole assembly's BOM: per-part single-body files, per-part drawings, bom.csv/json, vendor handoff texts, and per-process quote links.",
          },
          file: { type: 'string', description: 'Path to a .kcad.ts script file.' },
          code: { type: 'string', description: 'Inline kernelCAD script source.' },
          output_dir: { type: 'string', description: 'Directory to write the pack into (created if missing).' },
          name: { type: 'string', description: "Base file name (letters, digits, '.', '_', '-'). Default 'part'." },
          formats: {
            type: 'array',
            items: { type: 'string', enum: ['step', 'stl', '3mf', 'pdf-drawing', 'bom-csv', 'dxf'] },
            description: 'Files to include. Default step, stl, 3mf, pdf-drawing, bom-csv.',
          },
          processes: {
            type: 'array',
            items: { type: 'string', enum: ['3d-print', 'cnc', 'sheet-cut'] },
            description: 'Only return quote links for these processes. Default: all.',
          },
        },
        required: ['output_dir'],
      },
    },
    handler: input => fabPackTool(input as unknown as Parameters<typeof fabPackTool>[0]),
  },
];
