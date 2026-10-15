// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { rayPickTool } from '../tools/rayPick';
import type { ToolRegistryEntry } from './types';

export const rayPickToolEntries: ToolRegistryEntry[] = [{
  definition: {
    name: 'ray_pick',
    description: 'Cast a ray through the returned model or feature and report the first hit on each face, nearest first. Inputs are model units (mm); direction is normalized. Each hit includes point, distance, outward mesh normal, and a face selection { shapeIndex, kind, id, featureId } compatible with the selection tools. Intersections are computed against the viewer per-face tessellation, so curved-surface points and normals are mesh approximations.',
    inputSchema: {
      type: 'object',
      properties: {
        file: { type: 'string', description: 'Path to a .kcad.ts script.' },
        code: { type: 'string', description: 'Inline kernelCAD script source.' },
        feature_id: { type: 'string', description: 'Feature to ray-pick; defaults to the returned feature.' },
        origin: { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3, description: 'Ray origin [x, y, z] in model units.' },
        direction: { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3, description: 'Nonzero ray direction [x, y, z]; normalized internally.' },
      },
      required: ['origin', 'direction'],
      allOf: [{ oneOf: [{ required: ['file'], not: { required: ['code'] } }, { required: ['code'], not: { required: ['file'] } }] }],
    },
  },
  handler: rayPickTool,
}];
