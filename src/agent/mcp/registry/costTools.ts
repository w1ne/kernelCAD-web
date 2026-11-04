// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Tail-appended family: offline fabrication cost. New families go at the END
// of TOOL_REGISTRY so kernelCAD-server's index-based public contract stays stable.
import { estimateCostTool } from '../tools/estimateCost';
import type { ToolRegistryEntry } from './types';

export const costEstimateToolEntries: ToolRegistryEntry[] = [
  {
    definition: {
      name: 'estimate_cost',
      description:
        'Use this when you need a labelled offline cost estimate for a fabricated part or assembly before choosing 3d-print, cnc, or sheet-cut. ' +
        "Pass { file | code }, optional process ('3d-print' | 'cnc' | 'sheet-cut'; omit it to compare all three), optional material (an engineering material name), and optional quantity (positive integer, default 1). " +
        'Reuses the model volume, bounding box, and any assembly.part material, FabProcess, and StockSpec already declared. ' +
        "Returns currencyLabel 'USD estimate', a material + setup + cycle breakdown per process, confidence, and key drivers (part volume, bounding box, stock, process, quantity). " +
        'These are offline heuristics, not supplier quotes. No partner pricing is called. Purchased catalog parts are skipped. A script with no solid returns estimate.no-geometry.',
      inputSchema: {
        type: 'object',
        properties: {
          file: { type: 'string', description: 'Path to a .kcad.ts script file.' },
          code: { type: 'string', description: 'Inline kernelCAD script source.' },
          process: {
            type: 'string',
            enum: ['3d-print', 'cnc', 'sheet-cut'],
            description: "Fabrication process to price. Omit to compare '3d-print', 'cnc', and 'sheet-cut'.",
          },
          material: {
            type: 'string',
            description: 'Engineering material name. Overrides a declared part material. Unknown names are refused.',
          },
          quantity: {
            type: 'integer',
            minimum: 1,
            description: 'Copies of the whole model. Default 1. Each assembly part instance is already counted.',
          },
        },
      },
    },
    handler: input => estimateCostTool(input as unknown as Parameters<typeof estimateCostTool>[0]),
  },
];
