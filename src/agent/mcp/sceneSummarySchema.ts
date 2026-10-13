// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/** Compact geometry facts in MCP build receipts; null means unavailable. */
export const SCENE_SUMMARY_SCHEMA = {
  type: 'object',
  properties: {
    valid: { type: ['boolean', 'null'], description: 'BREP validity, independent of DFM/mechanism/tool success; null if unchecked.' },
    volume: { type: ['number', 'null'], description: 'Volume in mm³; assembly parts summed, including overlaps.' },
    faceCount: { type: ['integer', 'null'], description: 'BREP faces, summed per assembly part; not mesh triangles.' },
    size: { type: ['array', 'null'], items: { type: 'number' }, minItems: 3, maxItems: 3, description: 'Conservative world AABB size [x,y,z] in mm.' },
  },
  required: ['valid', 'volume', 'faceCount', 'size'],
  additionalProperties: false,
};

