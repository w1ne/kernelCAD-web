// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { explodeViewTool } from '../tools/explodeView';
import type { ToolRegistryEntry } from './types';

export const explodeViewToolEntries: ToolRegistryEntry[] = [{
  definition: {
    name: 'explode_view',
    description: 'Use this when you need an ordered exploded-view plan for an assembly. Supply parts as {name,center:[x,y,z],size:[x,y,z]} in mm, or a LabWired handoff containing parts with ref, position_mm.value and physical.bbox_mm (also accepts bbox_mm.value). Optional explicit assembly_order takes precedence over handoff assembly_order / assembly.order. Missing order falls back to input part order; parts lacking usable placement or bbox and unlisted/unknown order refs are reported. Choose mode axis (default) or radial; axis follows the requested direction, radial moves parts away from the assembly centroid. The result includes ready-to-paste param_declarations, animation_tracks and reverse_animation_tracks for animationView(), part_transforms for existing shapes, and script_fragment. cameraPlan gives framing guidance.',
    inputSchema: { type: 'object', properties: {
      parts: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, center: { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3 }, size: { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3 } }, required: ['name', 'center', 'size'], additionalProperties: false }, description: 'Named assembly parts and measured bbox centers/sizes in mm. Optional when handoff is supplied.' },
      assembly_order: { type: 'array', items: { type: 'string' } },
      handoff: { type: 'object', additionalProperties: true, description: 'Optional handoff metadata. Assembly order lookup supports assembly_order or assembly.order.' },
      mode: { type: 'string', enum: ['axis', 'radial'], description: 'Explode direction strategy; default axis.' },
      axis: { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3, description: 'Assembly direction; default +Z.' },
      spacing: { type: 'number', description: 'Positive spacing scale; default 1.25.' },
      duration_ms: { type: 'integer', description: 'Timeline duration from 500 to 60000 ms; default 3000.' },
    } },
  },
  handler: input => Promise.resolve(explodeViewTool(input as unknown as Parameters<typeof explodeViewTool>[0])),
}];
