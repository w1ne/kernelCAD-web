// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
const strings = { type: 'array', items: { type: 'string' } };
const indices = { type: 'array', items: { type: 'integer', minimum: 0 } };
/** Check-specific fields included in the merged verify response schema. */
export const EDGE_RADIUS_OUTPUT_PROPERTIES = {
  checkedEdges: { type: 'integer', minimum: 0, description: 'edge-radius: selected nondegenerate, nonseam edges.' },
  checkedFillets: { type: 'integer', minimum: 0, description: 'edge-radius: analytic fillet face patches, including spherical junctions.' },
  bodies: {
    type: 'array', description: 'edge-radius: one local BREP report per solid of each selected part, plus retained unsupported topology.',
    items: {
      type: 'object', additionalProperties: false,
      properties: {
        part: { type: 'string' }, bodyIndex: { type: 'integer', minimum: 0 },
        edges: {
          type: 'array', items: {
            type: 'object', additionalProperties: false,
            properties: {
              ref: { type: 'string' }, edgeIndex: { type: 'integer', minimum: 0 }, faceIndices: indices, faceRefs: strings,
              kind: { type: 'string', enum: ['sharp', 'smooth', 'filleted', 'chamfered', 'unknown', 'seam', 'degenerate'] },
              side: { type: 'string', enum: ['external', 'internal', 'unknown'] },
              point: { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3 },
            }, required: ['ref', 'edgeIndex', 'faceIndices', 'faceRefs', 'kind', 'side', 'point'],
          },
        },
        breaks: {
          type: 'array', items: {
            type: 'object', additionalProperties: false,
            properties: {
              ref: { type: 'string' }, faceIndex: { type: 'integer', minimum: 0 }, edgeIndices: indices, edgeRefs: strings,
              kind: { type: 'string', enum: ['fillet', 'chamfer'] }, surfaceType: { type: 'string' },
              radiusMm: { type: ['number', 'null'], description: 'Fillet radius in mm; null for planar chamfer strips.' },
            }, required: ['ref', 'faceIndex', 'edgeIndices', 'edgeRefs', 'kind', 'surfaceType', 'radiusMm'],
          },
        },
        violations: {
          type: 'array', items: {
            type: 'object', additionalProperties: false,
            properties: {
              rule: { type: 'string', enum: ['min-radius', 'max-radius', 'required-edge-break'] },
              ref: { type: 'string' }, measuredMm: { type: 'number' }, limitMm: { type: ['number', 'null'] },
            }, required: ['rule', 'ref', 'measuredMm', 'limitMm'],
          },
        },
        unknownRefs: strings,
      }, required: ['part', 'bodyIndex', 'edges', 'breaks', 'violations', 'unknownRefs'],
    },
  },
};
