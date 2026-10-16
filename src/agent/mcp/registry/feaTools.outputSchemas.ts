// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Output schemas for run_fea and fea_summary, spread into TOOL_OUTPUT_SCHEMAS.
import type { JSONSchemaObject } from '../toolOutputSchemas';

export const FEA_OUTPUT_SCHEMAS: Record<string, JSONSchemaObject> = {
  run_fea: {
    type: 'object',
    properties: {
      ok: { type: 'boolean', description: "False when the study violated its declared minSafetyFactor, a selector did not resolve, the solve failed, or solver:'calculix' was required and the toolchain is missing." },
      summary: {
        type: 'object',
        additionalProperties: true,
        description: "Solved evidence: solver ('calculix' or 'in-process-voxel'), maxVonMisesMPa, maxVonMisesAt, maxDisplacementMm, maxDisplacementAt, minSafetyFactor (+ minSafetyFactorRequired), nodeCount/elementCount/meshSizeMm, quality (minSICN, meanSICN, lowQualityCount), maxStressErrorPercent (high-stress region), trust { meshTrusted, reasons }, hotSpots [{ region, maxVonMisesMPa, nodeId, at, safetyFactor }]; the stress values, safety factor and hot spots exclude the support zone next to fixed-face edges (governingField), whose clamp-singular raw peak is reported as peakAtSupportMPa / peakAtSupportAt / peakAtSupportRegion with supportAdjacentNodeCount and supportZoneRadiusMm; appliedForceN / reactionForceN / equilibriumResidual, meshMs / solveMs.",
      },
      toolchain: {
        type: 'object',
        additionalProperties: true,
        description: "{ missing[], hint } — present when solver:'calculix' was required and CalculiX / gmsh are not installed.",
      },
      images: { type: 'array', items: { type: 'string' }, description: 'Absolute PNG paths of the rendered stress heatmap.' },
      legend: { type: 'array', items: { type: 'object', additionalProperties: true }, description: 'Heatmap colour bands { color, fromMPa, toMPa } — the scale the PNGs are drawn on.' },
      out_dir: { type: 'string', description: 'Directory holding the summary JSON, solver deck and heatmap PNGs.' },
      artifacts: { type: 'object', additionalProperties: true, description: 'Absolute paths of the BREP geometry handoff, .inp deck, .frd results and mesh JSON, for hand reproduction.' },
      diagnostics: { type: 'array', items: { type: 'object', additionalProperties: true }, description: 'fea.* diagnostics raised by the run.' },
      error: { type: 'string' },
      errorCode: { type: 'string' },
    },
    required: ['ok'],
    additionalProperties: true,
  },
  fea_summary: {
    type: 'object',
    properties: {
      ok: { type: 'boolean' },
      summary: { type: 'object', additionalProperties: true, description: 'Stored summary of a previous run_fea in output_dir, when present.' },
      toolchain: { type: 'object', additionalProperties: true, description: '{ available, ccx?, gmshVersion?, missing[], hint? } — whether a study can run here and how to fix it if not.' },
      materials: { type: 'object', additionalProperties: true, description: 'Named grade -> { E (MPa), nu, yield (MPa) }.' },
      material_names: { type: 'array', items: { type: 'string' }, description: 'Accepted material grade names.' },
      error: { type: 'string' },
      errorCode: { type: 'string' },
    },
    required: ['ok', 'toolchain', 'materials', 'material_names'],
    additionalProperties: true,
  },
};
