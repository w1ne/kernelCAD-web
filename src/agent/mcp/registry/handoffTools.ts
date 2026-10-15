// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { importHandoffTool } from '../tools/importHandoff';
import type { ToolRegistryEntry } from './types';

export const handoffToolEntries: ToolRegistryEntry[] = [{
  definition: {
    name: 'import_handoff',
    description:
      'Use this when you need to place parts from a LabWired handoff.json into a KernelCAD assembly. ' +
      'Pass the parsed handoff object using schema labwired-kernelcad-handoff/0.1. The tool validates the handoff and returns an evaluable assembly script with corner-anchored bbox placeholder solids, origin/bbox-face/mounting-hole/pin anchors, endpoint connectivity mates for wires whose two endpoint positions are known, and structured cutout_hints from connector faces. These mates express connectivity intent only; no wire geometry or routing is generated. It does not cut enclosure walls or fetch STEP/GLB assets. position_mm locates the bbox lower corner; bbox.center is derived. Null, estimated, proposed, and other non-exact geometry is reported as warnings and omitted or placed at zero as appropriate.',
    inputSchema: {
      type: 'object', properties: {
        handoff: { type: 'object', description: 'Parsed handoff.json object using labwired-kernelcad-handoff/0.1.' },
      }, required: ['handoff'],
    },
  },
  handler: input => Promise.resolve(importHandoffTool(input as unknown as Parameters<typeof importHandoffTool>[0])),
}];
