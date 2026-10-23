// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { blockoutAssemblyTool } from '../tools/blockoutAssembly';
import type { ToolRegistryEntry } from './types';

const VEC3 = { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3 };

export const blockoutToolEntries: ToolRegistryEntry[] = [{
  definition: {
    name: 'blockout_assembly',
    description:
      'Use this when you have a list of parts with bounding boxes and positions (from a layout, spreadsheet, another tool or a sketch) and need an evaluable placeholder assembly script. ' +
      'Pass parts as { name, bboxMm:[x,y,z], positionMm:[x,y,z], rotationDeg?, anchors? } in mm; positionMm locates the bbox lower corner and anchors are named points in assembly coordinates. ' +
      'Optional connections [{ from, to }] reference anchors as "part.anchor" (including built-ins origin, bbox_center, bbox_x_min..bbox_z_max) and become fastened mates that express connectivity intent only; no wire or route geometry is generated. ' +
      'Returns the script (corner-anchored box solids with named connectors) plus warnings. It reads no files and cuts nothing; refine the solids with add_part/add_feature afterwards.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Assembly name, default "blockout".' },
        parts: {
          type: 'array', minItems: 1,
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              bboxMm: { ...VEC3, description: 'Box dimensions [x,y,z] in mm.' },
              positionMm: { ...VEC3, description: 'Bbox lower corner in assembly coordinates, mm.' },
              rotationDeg: { description: 'Rotation about Z as a number, or XYZ Euler degrees as [x,y,z].', anyOf: [{ type: 'number' }, VEC3] },
              anchors: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, positionMm: { ...VEC3, description: 'Anchor point in assembly coordinates, mm.' } }, required: ['name', 'positionMm'], additionalProperties: false } },
            },
            required: ['name', 'bboxMm', 'positionMm'], additionalProperties: false,
          },
        },
        connections: { type: 'array', items: { type: 'object', properties: { from: { type: 'string', description: '"part.anchor"' }, to: { type: 'string', description: '"part.anchor"' } }, required: ['from', 'to'], additionalProperties: false } },
      },
      required: ['parts'],
    },
  },
  handler: input => Promise.resolve(blockoutAssemblyTool(input as unknown as Parameters<typeof blockoutAssemblyTool>[0])),
}];
