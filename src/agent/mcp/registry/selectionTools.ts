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
      description: 'Use this when you need to read the human/agent selection in a local Studio session. Returns one clicked face or edge (or null), with current-generation mesh-local shapeIndex/kind/id and creating featureId. During a rebuild selection is null with “selection pending rebuild” until Studio uniquely verifies the face; ambiguous or deleted faces are cleared. Inspect the current shape before authoring a fillet. Requires a running local Studio opened on the same script; hosted sessions are not supported.',
      inputSchema: { type: 'object', properties, required: ['studio_url', 'session'] },
    },
    handler: input => sharedSelectionTool('GET', input),
  },
  {
    definition: {
      name: 'set_selection',
      description: 'Use this when you need to replace the shared local Studio face/edge selection, or clear it with selection:null. The viewer highlights the pick on its next sync (300 ms). Does not edit geometry. Pass model_generation from get_selection; writes from an older generation are rejected. Use only current shape indices. Requires a local Studio session.',
      inputSchema: {
        type: 'object', properties: { ...properties, model_generation: { type: 'integer', minimum: 0, description: 'modelGeneration from get_selection; rejects picks from a prior mesh.' }, selection: {
          anyOf: [{ type: 'null' }, { type: 'object', properties: {
            shapeIndex: { type: 'integer', minimum: 0 }, kind: { type: 'string', enum: ['face', 'edge'] },
            id: { type: 'integer', minimum: 0 }, featureId: { type: ['string', 'null'], minLength: 1 },
          }, required: ['shapeIndex', 'kind', 'id', 'featureId'], additionalProperties: false }],
        } }, required: ['studio_url', 'session', 'model_generation', 'selection'],
      },
    },
    handler: input => sharedSelectionTool('POST', input),
  },
];
