// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Tail-appended family: nominal / tap-drill diameter → ISO metric coarse
// designation. New families go at the END of TOOL_REGISTRY so kernelCAD-server's
// index-based public contract stays stable. This tool does not cut geometry.
import { resolveMetricThreadTool } from '../tools/resolveMetricThread';
import type { ToolRegistryEntry } from './types';

export const metricThreadToolEntries: ToolRegistryEntry[] = [
  {
    definition: {
      name: 'resolve_metric_thread',
      description:
        'Use this when you have a hole diameter in millimetres and need the ISO metric coarse designation (12 mm → M12x1.75). ' +
        'Pass diameter_mm. kind is nominal (default; match ISO 261 major diameters M1–M64 within 0.05 mm), tap_drill (match D − P within 0.1 mm), or auto (nominal first, then tap drill). ' +
        'An explicit tolerance_mm replaces that default (both stages when kind is auto). ' +
        'Returns spec, pitch_mm, tap_drill_mm, minor_diameter_mm, and kind_matched. ' +
        'A diameter that is not within tolerance, or equidistant from two sizes, returns feature.invalid-args and lists candidates when the match is ambiguous. ' +
        'This does not treat an ISO 273 clearance bore as a tap — use clearanceFitForHoleDiameter or threadForHoleDiameter. It does not cut geometry.',
      inputSchema: {
        type: 'object',
        properties: {
          diameter_mm: { type: 'number', description: 'Hole diameter in millimetres. Nominal major diameter, or a tap drill when kind is tap_drill.' },
          kind: {
            type: 'string',
            enum: ['nominal', 'tap_drill', 'auto'],
            description: "Which column to match. Default nominal. auto tries nominal, then tap drill, and refuses a clearance bore.",
          },
          tolerance_mm: { type: 'number', description: 'Replaces the default window (0.05 mm nominal, 0.1 mm tap drill). One value covers both stages when kind is auto.' },
        },
        required: ['diameter_mm'],
      },
    },
    handler: async (input) => resolveMetricThreadTool(input),
  },
];
