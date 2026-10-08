// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { executeCookbookTool } from '../tools/executeCookbook';
import type { ToolRegistryEntry } from './types';

/**
 * Tail-appended family: execute_cookbook. New families go at the END of
 * TOOL_REGISTRY so kernelCAD-server's index-based public contract stays stable.
 */
export const cookbookExecutionToolEntries: ToolRegistryEntry[] = [
  {
    definition: {
      name: 'execute_cookbook',
      description:
        'Use this when you need evaluate_script (and optionally open_in_studio) for an industry / cookbook demo in ONE step — after lookup_cookbook for industry demos, prefer execute_cookbook when you need evaluate+Studio together; empty lookup is not a stop (freehand-author instead). ' +
        'Resolves a cookbook snippet by `id` or BM25 `query` (same ranking as lookup_cookbook), evaluates its body via evaluate_script with bounded vendor timeouts, and returns explicit status with stage resolve|evaluate|open_in_studio. ' +
        'Pass openInStudio:true to publish the same script via open_in_studio after a green full evaluate (hosted MCP). ' +
        'dryRun:true is the fast capture-only path — it is NOT evidence the cookbook builds a solid or is safe to publish; finish with dryRun:false (default) before claiming success or opening Studio.',
      inputSchema: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'Cookbook snippet id (e.g. gt2-timing-belt-drive, extrude-rounded-rect-plate).',
          },
          query: {
            type: 'string',
            description:
              'When id is omitted: natural-language query; BM25 picks the top hit (same as lookup_cookbook).',
          },
          openInStudio: {
            type: 'boolean',
            description:
              'Default false. When true, after a green full (non-dryRun) evaluate, call open_in_studio on the same script (hosted MCP).',
            default: false,
          },
          dryRun: {
            type: 'boolean',
            description:
              'Default false. dryRun:true is NOT evidence the cookbook builds a solid — capture-only checks; do not claim success or open Studio from a dry run alone.',
            default: false,
          },
        },
      },
    },
    handler: (input) =>
      executeCookbookTool(input as unknown as Parameters<typeof executeCookbookTool>[0]),
  },
];
