// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Output schema for inspect_step_views. Kept out of toolOutputSchemas.ts
// so that file stays under the max-lines ceiling.
import type { JSONSchemaObject } from '../toolOutputSchemas';

const vec3 = {
  type: 'array' as const,
  items: { type: 'number' as const },
  minItems: 3,
  maxItems: 3,
};

export const STEP_INSPECT_VIEWS_OUTPUT_SCHEMAS: Record<string, JSONSchemaObject> = {
  inspect_step_views: {
    type: 'object',
    properties: {
      ok: { type: 'boolean' },
      importGeneration: { type: 'string', description: 'owner@sha256 prefix of the STEP bytes. Selectors belong to this import only.' },
      refScope: { type: 'string' },
      owner: { type: 'string' },
      images: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            path: { type: 'string' },
            url: { type: 'string' },
            description: { type: 'string' },
            labeledFaceIds: { type: 'array', items: { type: 'string' } },
            legendFaceIds: { type: 'array', items: { type: 'string' } },
            labeledEdgeIds: { type: 'array', items: { type: 'string' } },
            legendEdgeIds: { type: 'array', items: { type: 'string' } },
            targetVisible: { type: 'boolean' },
            targetPixels: { type: 'number' },
          },
          required: ['name', 'path', 'description', 'targetVisible', 'targetPixels'],
        },
      },
      faces: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            ref: { description: 'Edit selector: a named @kc ref, or { near: centroid } when the listing id is positional.' },
            listRef: { type: 'string' },
            surfaceType: { type: 'string' },
            area: { type: 'number' },
            normal: vec3,
            centroid: vec3,
          },
          required: ['id', 'ref', 'listRef', 'surfaceType', 'area', 'normal', 'centroid'],
        },
      },
      edges: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            ref: { type: 'string' },
            curveType: { type: 'string' },
            length: { type: 'number' },
            midpoint: vec3,
          },
          required: ['id', 'ref', 'curveType', 'length', 'midpoint'],
        },
      },
      target: { type: 'object', additionalProperties: true },
      report_id: { type: 'string' },
      report_path: { type: 'string' },
      full: { type: 'object', additionalProperties: true },
      error: { type: 'string' },
      errorCode: { type: 'string' },
      errorHint: { type: 'string' },
    },
    required: ['ok'],
    additionalProperties: true,
  },
};
