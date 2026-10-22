// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { writeBomTool } from '../tools/writeBom';
import type { ToolRegistryEntry } from './types';

export const bomToolEntries: ToolRegistryEntry[] = [
  {
    definition: {
      name: 'write_bom',
      description: 'Use this when you need to merge a LabWired handoff BOM with optional KernelCAD catalog parts and MPNs, then write CSV or retrieve Sheets-ready rows. Pass exactly one of handoff, handoff_json or handoff_path. This tool only writes a CSV locally; it makes no Google API calls. Returns headers, tabular rows, CSV contents and the CSV path.',
      inputSchema: {
        type: 'object',
        properties: {
          handoff: { type: 'object', description: 'Handoff object with a parts array.' },
          handoff_json: { type: 'string', description: 'Handoff JSON text.' },
          handoff_path: { type: 'string', description: 'Path to handoff JSON.' },
          catalog_parts: { type: 'array', items: { type: 'object' }, description: 'Optional matching KernelCAD catalog entries with id/ref, partNumber and vendor.' },
          output_path: { type: 'string', description: 'Optional CSV destination. Defaults to artifacts/bom/bom-<id>.csv.' },
          overwrite: { type: 'boolean', description: 'Set true to replace an existing CSV destination. Existing files are otherwise preserved.' },
        },
      },
    },
    handler: input => writeBomTool(input as Parameters<typeof writeBomTool>[0]),
  },
];
