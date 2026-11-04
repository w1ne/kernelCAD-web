// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Output schema for the mill planner. Kept out of toolOutputSchemas.ts
// so that file stays at the max-lines ceiling.
import type { JSONSchemaObject } from '../toolOutputSchemas';

const BBOX = {
  type: 'object',
  additionalProperties: true,
  description: 'Axis-aligned box in millimetres.',
} as const;

export const CNC_CAM_OUTPUT_SCHEMAS: Record<string, JSONSchemaObject> = {
  plan_cnc_toolpaths: {
    type: 'object',
    properties: {
      ok: { type: 'boolean' },
      origin: { type: 'string', enum: ['stock_corner'] },
      origin_note: { type: 'string' },
      part_bbox: BBOX,
      part_in_stock_mm: BBOX,
      stock: { type: 'object', additionalProperties: true, description: 'Blank kind, size_mm, and the dimensions that were parsed.' },
      tool: { type: 'object', additionalProperties: true },
      feeds: { type: 'object', additionalProperties: true, description: 'Heuristic spindle, feed, plunge, stepdown, and stepover.' },
      ops: {
        type: 'array',
        items: { type: 'object', additionalProperties: true },
        description: 'Ordered facing, profile, pocket, and drill ops with path stats. Long paths omit segment coordinates.',
      },
      time_s: { type: 'number' },
      removed_volume_mm3: { type: 'number', description: 'Per-op volume proxy. Ops can double-count the same stock.' },
      warnings: { type: 'array', items: { type: 'string' } },
      gcode: { type: 'string', description: 'Mill G-code when include_gcode is true. Not FDM slicer output.' },
      disclaimer: { type: 'string' },
      error: { type: 'string' },
      errorCode: { type: 'string' },
    },
    required: ['ok', 'disclaimer'],
    additionalProperties: true,
  },
};
