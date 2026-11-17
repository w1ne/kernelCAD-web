// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Tail-appended family: MJCF/URDF export health. New families go at the END
// of TOOL_REGISTRY so kernelCAD-server's index-based public contract stays
// stable. verify({ check: 'physics' }) is unchanged.
import { checkExportHealthTool } from '../tools/checkExportHealth';
import type { ToolRegistryEntry } from './types';

export const exportHealthToolEntries: ToolRegistryEntry[] = [
  {
    definition: {
      name: 'check_export_health',
      description:
        'Use this when you need to know whether an assembly export is safe to simulate: rest contacts that are not parent/child or explicitly excluded, visual geoms that still collide, and whether each link\'s mass, centre of mass, and inertia match the CAD solid. ' +
        'Pass file or code. The tool exports MJCF and URDF, compiles the MJCF, and runs forward at qpos0. ' +
        'qpos0 is the authored mate pose: a scalar joint ref converts degrees to radians and millimetres to metres, the child body frame is that pose, and joint coordinate 0 stays the connector-aligned pose. A ball joint has no ref; its qpos0 stays the identity quaternion and the authored extrinsic XYZ Euler triple is the child body quaternion. A coupled driven joint uses ratio times source plus offset from that authored source. A qpos0 outside the joint range fails the check. This is not a posed sweep. ' +
        'Rest-contact rows separate penetration depth from margin-only contacts. Mate neighbours and other excluded body pairs are omitted. Each row includes cadExactOverlapMm3 and cadDistanceMm from the exact CAD solids. A row whose solids share at most 0.01 mm³ sets collisionGeomArtefact and does not fail the check. ' +
        'A visual geom (group 2, group 3, or a visual-/wrap- name) with non-zero contype or conaffinity is reported, as is a collision mesh that uses the whole-part visual mesh when solid collision pieces were declared. ' +
        'Inertia rows compare the CAD solid, including a declared mass when the part sets one, with the compiled MJCF body and the URDF inertial. When mass properties throw, both exports substitute unit inertia (1 kg, diagonal 1e-3 kg·m²) and the row is a fallback. A unit-inertia substitution, a regularized tensor, or a mismatch beyond the stated tolerance fails the row. ' +
        'MJCF defaults undeclared density to 2700 kg/m³ and URDF to 1000 kg/m³; each side is compared at the density that export used. ' +
        'ok is true only when every real row is clean. A collision-geometry artefact is reported and does not by itself fail the check. This is an export check at the compiled rest pose. It does not run drop tests, travel sweeps, or hardware acceptance. verify({ check: \'physics\' }) remains the mechanism gate.',
      inputSchema: {
        type: 'object',
        properties: {
          file: { type: 'string', description: 'Path of a .kcad.ts script. Mutually exclusive with code.' },
          code: { type: 'string', description: 'Inline kernelCAD script. Mutually exclusive with file.' },
          assembly: { type: 'string', description: 'Assembly name when the script defines more than one. Defaults to the first captured assembly.' },
        },
      },
    },
    handler: async (input) => checkExportHealthTool(input),
  },
];
