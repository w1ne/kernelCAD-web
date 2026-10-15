// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { fitPlaneTool } from '../tools/fitPlane';
import type { ToolRegistryEntry } from './types';

export const pointCloudToolEntries: ToolRegistryEntry[] = [{
  definition: {
    name: 'fit_plane',
    description: 'Use this when you need to fit an orthogonal least-squares plane to XYZ point-cloud data. Returns centroid, deterministic unit normal, signed point residuals, RMS residual and maximum absolute residual. Accepts points already parsed by the caller from scan data or mesh vertices. Computes parameters only; it does not create a surface body. Requires at least three non-collinear finite points.',
    inputSchema: {
      type: 'object',
      properties: {
        points: {
          type: 'array', minItems: 3, maxItems: 100000,
          items: { type: 'array', minItems: 3, maxItems: 3, items: { type: 'number' } },
          description: 'Point cloud as [x, y, z] coordinate triples in model units.',
        },
      },
      required: ['points'],
    },
  },
  handler: async input => fitPlaneTool(input),
}];
