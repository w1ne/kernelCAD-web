// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Mesh / scan → editable feature tree. Its own registry family, composed at
// the TAIL of TOOL_REGISTRY: kernelCAD-server consumes the historical registry
// order as part of the public contract, so a new family is appended rather
// than slotted next to the reference-ingest tools — every existing index
// stays put.
import { meshToFeaturesTool } from '../tools/meshToFeatures';
import type { ToolRegistryEntry } from './types';

const meshToFeaturesToolEntry: ToolRegistryEntry = {
  definition: {
    name: 'mesh_to_features',
    description:
      'Use this when you are handed an STL, OBJ or 3MF of a mostly prismatic mechanical part (plate, ' +
      'bracket, spacer, flange, housing block) and need an EDITABLE kernelCAD model of it rather than ' +
      'a faceted lib.fromSTL import. Deterministic, measured, self-verifying: it welds and checks the ' +
      'mesh, segments planes and cylinders, picks the extrusion axis, slices each band and fits exact ' +
      'lines / arcs / circles, snaps near-round values (each snap recorded), then emits a readable ' +
      '.kcad.ts with named param()s — a revolve for concentric round stacks, extruded profiles ' +
      'otherwise, .hole()/.holes() for through, blind and counterbored bores (axial and side-drilled), ' +
      '.cutout() for pockets, boolean subtractions for what no drilling feature can reach. It then ' +
      'EVALUATES that script and compares it with the mesh: volume IoU (column ray casting) and ' +
      'symmetric surface deviation (max + RMS), over up to 4 refinement passes. Returns { script, ' +
      'ledger, fidelity: { maxDeviationMm, rmsMm, volumeIoU, verdict: faithful | approximate | failed, ' +
      'thresholds }, unmatchedRegions, features, passes }. The verdict is computed from the numbers — ' +
      'faithful needs IoU >= minIoU AND max deviation <= maxDeviationMm AND a watertight mesh AND no ' +
      'unmatched region. Freeform surfaces, tilted planes and side bosses are listed in ' +
      'unmatchedRegions (reference.mesh.freeform-region-unmatched), never silently dropped. The ledger ' +
      'uses fact ids equal to param names, so resolve_assumptions on the written ' +
      '<out>.ledger.json yields paramOverrides for set_param. Pass { out } to write the script and ' +
      'ledger; the mesh itself is never modified.',
    inputSchema: {
      type: 'object',
      properties: {
        file: { type: 'string', description: 'Path to a .stl (binary or ASCII), .obj or .3mf mesh. One of file / data is required.' },
        data: { type: 'string', description: 'Mesh bytes as base64 — use when the server cannot see your filesystem.' },
        format: { type: 'string', enum: ['stl', 'obj', '3mf'], description: 'Format override; default from the extension or the content.' },
        out: {
          type: 'string',
          description: 'Write the emitted script to this .kcad.ts path and the assumption ledger to the sibling .ledger.json.',
        },
        minIoU: { type: 'number', description: 'Volume IoU a faithful verdict requires. Default 0.98.' },
        maxDeviationMm: {
          type: 'number',
          description: 'Max surface deviation (mm) a faithful verdict allows. Default max(0.25, 0.1 % of the bbox diagonal).',
        },
        maxPasses: { type: 'number', description: 'Refinement passes, 1–4. Default 4; stops early at the first faithful pass.' },
        weldToleranceMm: { type: 'number', description: 'Vertex weld distance in mm. Default max(1e-4, 1e-6 × bbox diagonal).' },
        maxTriangles: { type: 'number', description: 'Refuse meshes above this triangle count instead of stalling. Default 300000.' },
      },
    },
  },
  handler: input => meshToFeaturesTool(input as Parameters<typeof meshToFeaturesTool>[0]),
};

export const meshReconstructToolEntries: ToolRegistryEntry[] = [meshToFeaturesToolEntry];
