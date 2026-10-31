// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { applySurfaceBlendTool } from '../tools/applySurfaceBlend';
import type { ToolRegistryEntry } from './types';

export const surfaceBlendToolEntries: ToolRegistryEntry[] = [{
  definition: {
    name: 'apply_surface_blend',
    description: 'Use this when you need to author and evaluate a fillet or chamfer on a kernelCAD Shape. Inserts Shape.fillet(radius, selector, { continuity: G1|G2 }) or Shape.chamfer(distance, selector) through the existing public API and returns the patched source plus evaluation diagnostics. Selectors accept EdgeSelector syntax, including stable edge refs from get_selection (for example @kc[box_1/edge/s<hash>]), arrays of selected edge refs, query strings, or { face: canonical name, face label, or face query }. G2 continuity applies to fillets; chamfer uses the existing chamfer API. This authors the operation and does not extract blend-surface NURBS poles; that still requires kernel surface extraction.',
    inputSchema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'Inline .kcad.ts source.' },
        shape_binding: { type: 'string', description: 'Existing Shape variable name to blend.' },
        operation: { type: 'string', enum: ['fillet', 'chamfer'], description: "Operation; defaults to 'fillet'." },
        radius: { type: 'number', exclusiveMinimum: 0, description: "Fillet radius in mm; required for operation:'fillet'." },
        distance: { type: 'number', exclusiveMinimum: 0, description: "Chamfer distance in mm; required for operation:'chamfer'." },
        selector: {
          description: 'Optional EdgeSelector: a stable @kc[...] edge ref from get_selection, an array of selected edge refs, an edge query string, or { face: canonical face name, face label, or FaceQuery descriptor }. Omit to select all sharp edges.',
          oneOf: [
            { type: 'string' },
            { type: 'array', minItems: 1, items: { type: 'string' } },
            { type: 'object', properties: { face: { type: 'string' } }, required: ['face'], additionalProperties: false },
          ],
        },
        continuity: { type: 'string', enum: ['G1', 'G2'], description: "Fillet continuity passed to the existing public API; defaults to G1. Chamfer ignores this field." },
      },
      required: ['code', 'shape_binding'],
    },
  },
  handler: input => applySurfaceBlendTool(input as unknown as Parameters<typeof applySurfaceBlendTool>[0]),
}];
