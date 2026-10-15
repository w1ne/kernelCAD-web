// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { routeWires } from '../tools/routeWires';
import type { ToolRegistryEntry } from './types';

export const wireRoutingToolEntries: ToolRegistryEntry[] = [{
  definition: {
    name: 'route_wires',
    description: 'Use this when you need a first-pass orthogonal pin-to-pin wire route estimate and clearance check. Accepts a LabWired handoff or explicit wire positions in millimetres, returns path length and bend count, and reports collisions against part bounding boxes. Wires whose endpoint positions are null are reported as unresolved. Read-only analysis; it does not create or certify a physical harness.',
    inputSchema: {
      type: 'object',
      properties: {
        wires: { type: 'array', description: 'Wire records with from_pos_mm and to_pos_mm as 3D millimetre coordinates.', items: { type: 'object', additionalProperties: true } },
        handoff: { type: 'object', description: 'LabWired handoff schema labwired-kernelcad-handoff/0.1 with parts, pins and wires.', additionalProperties: true },
        obstacles: { type: 'array', description: 'Axis-aligned obstacle volumes in world millimetres.', items: { type: 'object', additionalProperties: true } },
        board_surface_z_mm: { type: 'number', description: 'Known world Z of the LabWired board surface. Required to reconcile 2D endpoint coordinates and XY-only part placements for complete clearance analysis.' },
        clearance_mm: { type: 'number', description: 'Minimum obstacle clearance, default 1 mm.' },
        bend_radius_mm: { type: 'number', description: 'Requested minimum bend radius, default 2 mm.' },
      },
    },
  },
  handler: async input => routeWires(input as Parameters<typeof routeWires>[0]),
}];
