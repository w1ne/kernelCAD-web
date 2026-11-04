// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Tail-appended family: 2.5D mill toolpaths. New families go at the END of
// TOOL_REGISTRY so kernelCAD-server's index-based public contract stays stable.
// Mill G-code here is not the FDM slicer export. See src/shared/cam/STATUS.md.
import { planCncToolpathsTool } from '../tools/planCncToolpaths';
import type { ToolRegistryEntry } from './types';

export const cncCamToolEntries: ToolRegistryEntry[] = [
  {
    definition: {
      name: 'plan_cnc_toolpaths',
      description:
        'Use this when you need a 2.5D milling plan from a solid, a stock blank, and an end mill. ' +
        'Pass { file | code }, stock (plate, blank, or bar — not filament), and tool_diameter_mm. ' +
        'Optional ops are facing, profile, pocket, and drill. drill needs holes [{ x_mm, y_mm, depth_mm }] in the stock-corner frame. ' +
        'Optional stepdown_mm, stepover (fraction of diameter, default 0.4), safe_z_mm, spindle_rpm, feed_mm_min, conventional, pocket_floor_z_mm, flute_length_mm, corner_radius_mm, and include_gcode. ' +
        'The part box is centered in XY inside the stock and seated on Z=0. Origin is the stock minimum corner. ' +
        'Returns ops with path stats, a removed-volume proxy, warnings, and mill G-code (G21/G90, G0/G1, G81/G83) when include_gcode is true. ' +
        'This is a bounding-box heuristic: not collision-checked, and not a machine-ready post for every controller. ' +
        'It is not export format gcode, which is an FDM slicer. A missing or undersized stock, or a non-positive tool, returns cli.invalid-args.',
      inputSchema: {
        type: 'object',
        properties: {
          file: { type: 'string', description: 'Path to a .kcad.ts model script.' },
          code: { type: 'string', description: 'Inline kernelCAD model script.' },
          stock: {
            type: 'object',
            description: 'Milling blank. plate: length_mm, width_mm, thickness_mm. blank: length_mm, width_mm, height_mm. bar: length_mm plus diameter_mm, or length_mm plus width_mm and height_mm. Filament is refused.',
            properties: {
              kind: { type: 'string', enum: ['plate', 'blank', 'bar'] },
              length_mm: { type: 'number' },
              width_mm: { type: 'number' },
              height_mm: { type: 'number' },
              thickness_mm: { type: 'number' },
              diameter_mm: { type: 'number' },
            },
            required: ['kind'],
          },
          tool_diameter_mm: { type: 'number', description: 'End mill diameter in millimetres. Must be positive.' },
          flute_length_mm: { type: 'number', description: 'Flute length. A deeper requested stepdown is clamped to it.' },
          corner_radius_mm: { type: 'number', description: 'Recorded only. The offset treats the tool as a flat end mill.' },
          ops: {
            type: 'array',
            items: { type: 'string', enum: ['facing', 'profile', 'pocket', 'drill'] },
            description: 'Ops to plan, in order. Default is facing and profile, plus drill when holes are passed.',
          },
          holes: {
            type: 'array',
            description: 'Drill holes in the stock-corner frame. depth_mm is down from the stock top.',
            items: {
              type: 'object',
              properties: {
                x_mm: { type: 'number' },
                y_mm: { type: 'number' },
                depth_mm: { type: 'number' },
              },
              required: ['x_mm', 'y_mm', 'depth_mm'],
            },
          },
          stepdown_mm: { type: 'number', description: 'Axial step. Default is half the tool diameter, clamped to the flute length when that is set.' },
          stepover: { type: 'number', description: 'Radial step as a fraction of tool diameter, greater than 0 and at most 1. Default 0.4.' },
          safe_z_mm: { type: 'number', description: 'Absolute retract Z above the stock top. Default is stock top plus 5 mm.' },
          spindle_rpm: { type: 'number', description: 'Spindle speed. Default 10000 is a heuristic, not a material model.' },
          feed_mm_min: { type: 'number', description: 'Cutting feed. Default 600 mm/min is a heuristic. Plunge is half of this.' },
          conventional: { type: 'boolean', description: 'Outside profile direction. Default false is climb (clockwise for spindle M3).' },
          pocket_floor_z_mm: { type: 'number', description: 'Pocket floor Z in the stock-corner frame. Default 0 clears the part footprint.' },
          include_gcode: { type: 'boolean', description: 'When true, include mill G-code. This is not FDM slicer G-code.' },
        },
      },
    },
    handler: input => planCncToolpathsTool(input as unknown as Parameters<typeof planCncToolpathsTool>[0]),
  },
];
