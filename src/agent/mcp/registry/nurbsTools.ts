// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { inspectNurbsTool } from '../tools/inspectNurbs';
import type { ToolRegistryEntry } from './types';

export const nurbsToolEntries: ToolRegistryEntry[] = [{
  definition: {
    name: 'inspect_nurbs',
    description: 'Use this when you need the captured NURBS definition for a kernelCAD nurbsCurve/spline3d feature. Returns degree, distinct knots and multiplicities, poles, weights, rational and uniformWeights flags, hasNonUnitWeights, and parameter range. Defaults to the last captured curve; pass feature_id to choose one. Reports authored data, not exact geometry-derived B-rep edge/face NURBS. Surface extraction and blending are not supported.',
    inputSchema: { type: 'object', properties: {
      file: { type: 'string', description: 'Path to a .kcad.ts script file.' },
      code: { type: 'string', description: 'Inline kernelCAD script source.' },
      feature_id: { type: 'string', description: 'Optional curve3d FeatureId; defaults to the last captured NURBS curve.' },
    } },
  },
  handler: input => inspectNurbsTool(input as unknown as Parameters<typeof inspectNurbsTool>[0]),
}];
