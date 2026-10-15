// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { rayPickTool } from '../tools/rayPick';
import type { ToolRegistryEntry } from './types';

export const rayPickToolEntries: ToolRegistryEntry[] = [{
  definition: {
    name: 'ray_pick',
    description: 'Use this when you need the faces a ray hits in a local Studio model, nearest first, with points, distances, and normals. Inputs are model units (mm); direction is normalized. Requires the local Studio URL and session token for the same script, reads the current model generation, and returns a set_selection argument object with every hit. feature_id must identify a displayed terminal shape; intermediates have no current viewer shapeIndex. Intersections use the viewer per-face tessellation, so curved-surface points and normals are mesh approximations.',
    inputSchema: {
      type: 'object',
      properties: {
        file: { type: 'string', description: 'Path to a .kcad.ts script.' },
        code: { type: 'string', description: 'Inline kernelCAD script source.' },
        feature_id: { type: 'string', description: 'Displayed terminal feature to ray-pick; defaults to the returned feature. Intermediate features are not available as current viewer selections.' },
        studio_url: { type: 'string', description: 'Local Studio HTTP origin, e.g. http://localhost:5173.' },
        session: { type: 'string', minLength: 1, description: 'Studio sessionToken for this script, from GET /__kernelcad/session?script=<path>.' },
        origin: { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3, description: 'Ray origin [x, y, z] in model units.' },
        direction: { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3, description: 'Nonzero ray direction [x, y, z]; normalized internally.' },
      },
      required: ['origin', 'direction', 'studio_url', 'session'],
      allOf: [{ oneOf: [{ required: ['file'], not: { required: ['code'] } }, { required: ['code'], not: { required: ['file'] } }] }],
    },
  },
  handler: rayPickTool,
}];
