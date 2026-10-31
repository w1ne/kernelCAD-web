// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { sharedSelectionTool } from '../tools/sharedSelection';
import type { ToolRegistryEntry } from './types';

const properties = {
  studio_url: { type: 'string', description: 'Local Studio HTTP origin, e.g. http://localhost:5173.' },
  session: { type: 'string', description: 'Studio sessionToken from GET /__kernelcad/session?script=<path>. Use the same script as the viewer.' },
};
export const selectionToolEntries: ToolRegistryEntry[] = [
  {
    definition: {
      name: 'get_selection',
      description: 'Use this when you need to read the human/agent selection in a local Studio session. Returns the primary clicked face or edge in selection and the complete topology multi-selection in selections. Each pick includes current-generation shapeIndex/kind/id and creating featureId; picked edges also include stableId and an operation-ready @kc[feature/edge/stableId] ref. Stable edge IDs use curve type, length, and quantized 3D curve samples, so they survive re-evaluation while the geometry remains unchanged; ambiguous matches are rejected. Inspect the selected edge refs directly with apply_surface_blend. Requires a running local Studio opened on the same script; hosted sessions are not supported.',
      inputSchema: { type: 'object', properties, required: ['studio_url', 'session'] },
    },
    handler: input => sharedSelectionTool('GET', input),
  },
  {
    definition: {
      name: 'set_selection',
      description: 'Use this when you need to replace the shared local Studio face/edge selection, set a complete multi-selection with selections, or clear it with selection:null and selections:[]. The viewer highlights picks on its next sync (300 ms). Does not edit geometry. Pass model_generation from get_selection; writes from an older generation or picks whose stable edge IDs do not match the current mesh are rejected. Use only current shape indices. Requires a local Studio session.',
      inputSchema: {
        type: 'object', properties: { ...properties, model_generation: { type: 'integer', minimum: 0, description: 'modelGeneration from get_selection; rejects picks from a prior mesh.' }, selection: {
          anyOf: [{ type: 'null' }, { type: 'object', properties: {
            shapeIndex: { type: 'integer', minimum: 0 }, kind: { type: 'string', enum: ['face', 'edge'] },
            id: { type: 'integer', minimum: 0 }, featureId: { type: ['string', 'null'], minLength: 1 },
            stableId: { type: 'string', pattern: '^s[0-9a-f]{16}$', description: 'Persistent geometry-derived BREP edge ID; required for edge picks.' },
            ref: { type: 'string', description: 'Operation-ready edge ref, e.g. @kc[box_1/edge/s<hash>].' },
          }, required: ['shapeIndex', 'kind', 'id', 'featureId'], additionalProperties: false }],
        }, selections: { type: 'array', description: 'Full topology selection set. Every edge item must include stableId; selection remains the primary pick for backward compatibility.', items: {
          type: 'object', properties: {
            shapeIndex: { type: 'integer', minimum: 0 }, kind: { type: 'string', enum: ['face', 'edge'] },
            id: { type: 'integer', minimum: 0 }, featureId: { type: ['string', 'null'], minLength: 1 },
            stableId: { type: 'string', pattern: '^s[0-9a-f]{16}$' }, ref: { type: 'string' },
          }, required: ['shapeIndex', 'kind', 'id', 'featureId'], additionalProperties: false,
        } } }, required: ['studio_url', 'session', 'model_generation', 'selection'],
      },
    },
    handler: input => sharedSelectionTool('POST', input),
  },
];
